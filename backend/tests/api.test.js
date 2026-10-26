// Integration tests against a real PostgreSQL (TEST_DATABASE_URL, see setup.js).
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { migrate } = require('../src/db/migrate');
const { seed } = require('../src/db/seed');

let adminToken;
let staffToken;

const login = async (email, password) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
};
const as = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await migrate();
  await seed();
  adminToken = await login('admin@clinicflow.ma', 'Admin@123');
  staffToken = await login('staff1@clinicflow.ma', 'Staff@123');
});

afterAll(() => pool.end());

describe('auth', () => {
  it('rejects bad credentials with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@clinicflow.ma', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid payload', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('GET /me requires a token and returns the user without password hash', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const res = await request(app).get('/api/auth/me').set(as(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'admin@clinicflow.ma', role: 'admin' });
    expect(res.body.user.password_hash).toBeUndefined();
  });
});

describe('patients', () => {
  let createdId;

  it('lists with pagination and searches by name or CIN', async () => {
    const page = await request(app).get('/api/patients?page=1&limit=2').set(as(staffToken));
    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(2);
    expect(page.body.meta).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });

    const byName = await request(app).get('/api/patients?search=bennani').set(as(staffToken));
    expect(byName.body.data.map((p) => p.cin)).toEqual(['BE789012']);

    const byCin = await request(app).get('/api/patients?search=ab654').set(as(staffToken));
    expect(byCin.body.data[0].fullName).toBe('Youssef El Amrani');
  });

  it('creates a patient and refuses a duplicate CIN with 409', async () => {
    const body = { fullName: 'Houda Mansouri', cin: 'AB123456', phone: '0612345678', birthDate: '1988-06-15' };
    const res = await request(app).post('/api/patients').set(as(staffToken)).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.birthDate).toBe('1988-06-15');
    createdId = res.body.data.id;

    const dup = await request(app).post('/api/patients').set(as(staffToken)).send({ ...body, cin: 'ab123456' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.details[0].field).toBe('cin');
  });

  it('updates a patient', async () => {
    const res = await request(app)
      .put(`/api/patients/${createdId}`)
      .set(as(staffToken))
      .send({ fullName: 'Houda Mansouri', cin: 'AB123456', phone: '0700000000', birthDate: '1988-06-15', address: 'Casablanca' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ phone: '0700000000', address: 'Casablanca' });
  });

  it('returns 404 for unknown / 400 for malformed ids', async () => {
    expect((await request(app).get('/api/patients/7c9e6679-7425-40de-944b-e07fc1f90ae7').set(as(staffToken))).status).toBe(404);
    expect((await request(app).get('/api/patients/abc').set(as(staffToken))).status).toBe(400);
  });

  it('only lets admins delete (soft delete)', async () => {
    expect((await request(app).delete(`/api/patients/${createdId}`).set(as(staffToken))).status).toBe(403);
    expect((await request(app).delete(`/api/patients/${createdId}`).set(as(adminToken))).status).toBe(204);
    expect((await request(app).get(`/api/patients/${createdId}`).set(as(adminToken))).status).toBe(404);

    const { rows } = await pool.query('SELECT deleted_at FROM patients WHERE id = $1', [createdId]);
    expect(rows[0].deleted_at).not.toBeNull();
  });
});

describe('appointments — 30-minute rule', () => {
  let patientId;
  const at = (iso) => new Date(iso).toISOString();

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/patients')
      .set(as(staffToken))
      .send({ fullName: 'Test Conflit', cin: 'ZZ000001', phone: '0611111111', birthDate: '1990-01-01' });
    patientId = res.body.data.id;
  });

  const create = (date, status) =>
    request(app).post('/api/appointments').set(as(staffToken)).send({ patientId, appointmentDate: at(date), status, reason: 'Test' });

  it('refuses a second confirmed appointment less than 30 minutes apart', async () => {
    expect((await create('2030-01-10T10:00:00Z', 'confirmed')).status).toBe(201);
    const clash = await create('2030-01-10T10:20:00Z', 'confirmed');
    expect(clash.status).toBe(409);
    expect(clash.body.error.message).toMatch(/30 minutes/);
  });

  it('allows exactly 30 minutes apart, and pending appointments in the window', async () => {
    expect((await create('2030-01-10T10:30:00Z', 'confirmed')).status).toBe(201);
    expect((await create('2030-01-10T09:45:00Z', 'pending')).status).toBe(201);
  });

  it('refuses confirming a pending appointment that would clash, allows it once the other is cancelled', async () => {
    const pending = await create('2030-01-11T09:00:00Z', 'pending');
    const confirmed = await create('2030-01-11T09:15:00Z', 'confirmed');

    const clash = await request(app)
      .patch(`/api/appointments/${pending.body.data.id}/status`)
      .set(as(staffToken))
      .send({ status: 'confirmed' });
    expect(clash.status).toBe(409);

    await request(app).patch(`/api/appointments/${confirmed.body.data.id}/status`).set(as(staffToken)).send({ status: 'cancelled' });
    const ok = await request(app)
      .patch(`/api/appointments/${pending.body.data.id}/status`)
      .set(as(staffToken))
      .send({ status: 'confirmed' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('confirmed');
  });

  it('is also enforced by the database exclusion constraint', async () => {
    await expect(
      pool.query(
        `INSERT INTO appointments (patient_id, appointment_date, status, reason, created_by)
         SELECT $1, '2030-01-10T10:10:00Z', 'confirmed', 'raw insert', id FROM users LIMIT 1`,
        [patientId],
      ),
    ).rejects.toMatchObject({ code: '23P01' });
  });

  it('filters by date and status', async () => {
    const res = await request(app).get('/api/appointments?date=2030-01-10&status=confirmed').set(as(staffToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((a) => a.status === 'confirmed')).toBe(true);
  });
});

describe('dashboard', () => {
  it('returns the counters', async () => {
    const res = await request(app).get('/api/dashboard/stats').set(as(staffToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        totalPatients: expect.any(Number),
        todayAppointments: 5,
        pending: expect.any(Number),
        confirmed: expect.any(Number),
      }),
    );
  });
});

describe('users (admin only)', () => {
  it('forbids staff', async () => {
    expect((await request(app).get('/api/users').set(as(staffToken))).status).toBe(403);
  });

  it('lets admin list and create users', async () => {
    const list = await request(app).get('/api/users').set(as(adminToken));
    expect(list.body.data).toHaveLength(3);
    const res = await request(app)
      .post('/api/users')
      .set(as(adminToken))
      .send({ fullName: 'Nadia Staff', email: 'nadia@clinicflow.ma', password: 'Secret123', role: 'staff' });
    expect(res.status).toBe(201);
    expect(await login('nadia@clinicflow.ma', 'Secret123')).toEqual(expect.any(String));
  });
});
