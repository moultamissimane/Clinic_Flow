const patient = require('../src/validators/patient.validator');
const appointment = require('../src/validators/appointment.validator');

describe('patient validator', () => {
  const valid = { fullName: 'Houda Mansouri', cin: 'ab123456', phone: '06 12 34 56 78', birthDate: '1988-06-15' };

  it('normalises CIN and phone', () => {
    const out = patient.create.parse(valid);
    expect(out.cin).toBe('AB123456');
    expect(out.phone).toBe('0612345678');
  });

  it('rejects an invalid CIN, phone and impossible date', () => {
    const res = patient.create.safeParse({ ...valid, cin: '123', phone: '12', birthDate: '2001-02-30' });
    expect(res.success).toBe(false);
    expect(res.error.issues.map((i) => i.path[0]).sort()).toEqual(['birthDate', 'cin', 'phone']);
  });

  it('rejects a birth date in the future', () => {
    expect(patient.create.safeParse({ ...valid, birthDate: '2999-01-01' }).success).toBe(false);
  });

  it('applies pagination defaults', () => {
    expect(patient.listQuery.parse({ search: '' })).toEqual({ page: 1, limit: 10 });
  });
});

describe('appointment validator', () => {
  const base = { patientId: '7c9e6679-7425-40de-944b-e07fc1f90ae7', reason: 'Contrôle' };

  it('requires an ISO datetime with offset and defaults to pending', () => {
    expect(appointment.create.safeParse({ ...base, appointmentDate: '2026-10-27 10:00' }).success).toBe(false);
    const out = appointment.create.parse({ ...base, appointmentDate: '2026-10-27T10:00:00+01:00' });
    expect(out.status).toBe('pending');
  });

  it('rejects unknown statuses', () => {
    expect(appointment.updateStatus.safeParse({ status: 'done' }).success).toBe(false);
  });
});
