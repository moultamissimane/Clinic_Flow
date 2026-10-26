const { z, pagination, isoDate, emptyToUndefined } = require('./common');

const STATUSES = ['pending', 'confirmed', 'cancelled'];
const status = z.enum(STATUSES, {
  errorMap: () => ({ message: 'Statut invalide (pending, confirmed, cancelled)' }),
});

const create = z.object({
  patientId: z.string().uuid('Patient invalide'),
  // ISO 8601 with an explicit offset, e.g. 2026-10-26T10:00:00+01:00 or ...Z
  appointmentDate: z.string().datetime({ offset: true, message: 'Date/heure invalide (ISO 8601 attendu)' }),
  status: status.default('pending'),
  reason: z.string().trim().min(2, 'Motif requis').max(255),
  notes: emptyToUndefined(z.string().trim().max(2000).optional()),
});

const listQuery = z.object({
  date: emptyToUndefined(isoDate.optional()),
  status: emptyToUndefined(status.optional()),
  patientId: emptyToUndefined(z.string().uuid('Patient invalide').optional()),
  ...pagination,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateStatus = z.object({ status });

module.exports = { STATUSES, create, listQuery, updateStatus };
