const env = require('../config/env');
const { query, withTransaction } = require('../db/pool');
const { notFound, conflict } = require('../utils/AppError');
const { paginate, pageMeta } = require('../utils/pagination');
const { audit } = require('../utils/audit');
const { formatTime } = require('../utils/dates');
const { toAppointment } = require('./mappers');

const CONFLICT_WINDOW = '30 minutes';

const SELECT = `
  SELECT a.*, p.full_name AS patient_full_name, p.cin AS patient_cin, p.phone AS patient_phone,
         u.full_name AS created_by_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN users u ON u.id = a.created_by`;

// Business rule: no two CONFIRMED appointments for the same patient less than
// 30 minutes apart. Checked here for a precise error message; the exclusion
// constraint `appointments_no_confirmed_overlap` is the final guarantee.
async function assertNoConfirmedConflict(client, patientId, appointmentDate, excludeId = null) {
  const { rows } = await client.query(
    `SELECT id, appointment_date FROM appointments
      WHERE patient_id = $1
        AND status = 'confirmed'
        AND ($3::uuid IS NULL OR id <> $3)
        AND appointment_date > $2::timestamptz - interval '${CONFLICT_WINDOW}'
        AND appointment_date < $2::timestamptz + interval '${CONFLICT_WINDOW}'
      ORDER BY appointment_date
      LIMIT 1`,
    [patientId, appointmentDate, excludeId],
  );
  if (rows[0]) {
    const at = rows[0].appointment_date;
    const day = new Intl.DateTimeFormat('fr-FR', { timeZone: env.timezone }).format(at);
    const message = `Ce patient a déjà un rendez-vous confirmé dans une fenêtre de 30 minutes (le ${day} à ${formatTime(at, env.timezone)})`;
    throw conflict(message, [{ field: 'appointmentDate', message, conflictingAppointmentId: rows[0].id }]);
  }
}

// Row lock on the patient serialises concurrent bookings for the same patient,
// so the check above cannot be raced between two requests.
async function lockActivePatient(client, patientId) {
  const { rows } = await client.query(
    'SELECT id FROM patients WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
    [patientId],
  );
  if (!rows[0]) throw notFound('Patient introuvable');
}

async function list({ date, status, patientId, page, limit }) {
  const { offset } = paginate(page, limit);
  const conditions = ['p.deleted_at IS NULL'];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };

  if (date) {
    // The day is interpreted in the clinic's time zone; both bounds are
    // timestamptz so the appointments_date_idx index is used.
    params.push(date, env.timezone);
    const d = `$${params.length - 1}::date`;
    const tz = `$${params.length}`;
    conditions.push(
      `a.appointment_date >= (${d})::timestamp AT TIME ZONE ${tz}`,
      `a.appointment_date < (${d} + 1)::timestamp AT TIME ZONE ${tz}`,
    );
  }
  if (status) add('a.status = ?', status);
  if (patientId) add('a.patient_id = ?', patientId);

  const where = conditions.join(' AND ');
  // A single day reads best chronologically; open-ended lists show latest first.
  const order = date ? 'a.appointment_date ASC' : 'a.appointment_date DESC';

  const [items, count] = await Promise.all([
    query(
      `${SELECT} WHERE ${where} ORDER BY ${order}, a.id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    query(
      `SELECT count(*)::int AS total FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE ${where}`,
      params,
    ),
  ]);

  return { data: items.rows.map(toAppointment), meta: pageMeta(page, limit, count.rows[0].total) };
}

async function getById(id) {
  const { rows } = await query(`${SELECT} WHERE a.id = $1`, [id]);
  if (!rows[0]) throw notFound('Rendez-vous introuvable');
  return toAppointment(rows[0]);
}

async function create(data, userId) {
  const id = await withTransaction(async (client) => {
    await lockActivePatient(client, data.patientId);
    if (data.status === 'confirmed') {
      await assertNoConfirmedConflict(client, data.patientId, data.appointmentDate);
    }
    const { rows } = await client.query(
      `INSERT INTO appointments (patient_id, appointment_date, status, reason, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [data.patientId, data.appointmentDate, data.status, data.reason, data.notes ?? null, userId],
    );
    await audit(client, { userId, action: 'create', entity: 'appointment', entityId: rows[0].id, payload: data });
    return rows[0].id;
  });
  return getById(id);
}

async function updateStatus(id, status, userId) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT a.id, a.patient_id, a.appointment_date, a.status
         FROM appointments a JOIN patients p ON p.id = a.patient_id
        WHERE a.id = $1 AND p.deleted_at IS NULL`,
      [id],
    );
    const current = rows[0];
    if (!current) throw notFound('Rendez-vous introuvable');
    if (current.status === status) return;

    if (status === 'confirmed') {
      await lockActivePatient(client, current.patient_id);
      await assertNoConfirmedConflict(client, current.patient_id, current.appointment_date, id);
    }

    await client.query('UPDATE appointments SET status = $2 WHERE id = $1', [id, status]);
    await audit(client, {
      userId,
      action: 'status_change',
      entity: 'appointment',
      entityId: id,
      payload: { from: current.status, to: status },
    });
  });
  return getById(id);
}

module.exports = { list, getById, create, updateStatus };
