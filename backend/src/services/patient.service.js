const { query, withTransaction } = require('../db/pool');
const { notFound, conflict } = require('../utils/AppError');
const { paginate, pageMeta, likePattern } = require('../utils/pagination');
const { audit } = require('../utils/audit');
const { toPatient } = require('./mappers');

// Soft-deleted rows still hold their CIN (patients.cin is UNIQUE), so the check
// covers them too and tells the user why the CIN is taken.
async function assertCinAvailable(client, cin, excludeId = null) {
  const { rows } = await client.query(
    'SELECT id, deleted_at FROM patients WHERE cin = $1 AND ($2::uuid IS NULL OR id <> $2)',
    [cin, excludeId],
  );
  if (rows[0]) {
    const message = rows[0].deleted_at ? 'Ce CIN appartient à un patient archivé' : 'Ce CIN existe déjà';
    throw conflict(message, [{ field: 'cin', message }]);
  }
}

async function list({ search, page, limit }) {
  const { offset } = paginate(page, limit);
  const pattern = search ? likePattern(search) : null;
  const where = `p.deleted_at IS NULL AND ($1::text IS NULL OR p.full_name ILIKE $1 OR p.cin ILIKE $1)`;

  const [items, count] = await Promise.all([
    query(
      `SELECT p.*, next.appointment_date AS next_appointment
         FROM patients p
         LEFT JOIN LATERAL (
           SELECT a.appointment_date FROM appointments a
            WHERE a.patient_id = p.id AND a.status <> 'cancelled' AND a.appointment_date >= now()
            ORDER BY a.appointment_date LIMIT 1
         ) next ON true
        WHERE ${where}
        ORDER BY p.created_at DESC, p.id
        LIMIT $2 OFFSET $3`,
      [pattern, limit, offset],
    ),
    query(`SELECT count(*)::int AS total FROM patients p WHERE ${where}`, [pattern]),
  ]);

  return { data: items.rows.map(toPatient), meta: pageMeta(page, limit, count.rows[0].total) };
}

async function getById(id) {
  const { rows } = await query(
    `SELECT p.*, u.full_name AS created_by_name,
            (SELECT count(*) FROM appointments a WHERE a.patient_id = p.id) AS appointment_count
       FROM patients p
       LEFT JOIN users u ON u.id = p.created_by
      WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id],
  );
  if (!rows[0]) throw notFound('Patient introuvable');
  return toPatient(rows[0]);
}

async function create(data, userId) {
  const id = await withTransaction(async (client) => {
    await assertCinAvailable(client, data.cin);
    const { rows } = await client.query(
      `INSERT INTO patients (full_name, cin, phone, birth_date, address, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [data.fullName, data.cin, data.phone, data.birthDate, data.address ?? null, userId],
    );
    await audit(client, { userId, action: 'create', entity: 'patient', entityId: rows[0].id, payload: data });
    return rows[0].id;
  });
  return getById(id);
}

async function update(id, data, userId) {
  await withTransaction(async (client) => {
    await assertCinAvailable(client, data.cin, id);
    const { rowCount } = await client.query(
      `UPDATE patients
          SET full_name = $2, cin = $3, phone = $4, birth_date = $5, address = $6
        WHERE id = $1 AND deleted_at IS NULL`,
      [id, data.fullName, data.cin, data.phone, data.birthDate, data.address ?? null],
    );
    if (!rowCount) throw notFound('Patient introuvable');
    await audit(client, { userId, action: 'update', entity: 'patient', entityId: id, payload: data });
  });
  return getById(id);
}

// Soft delete: the record (and its appointment history) is kept for medical
// traceability; upcoming appointments are cancelled so they free their slots.
async function remove(id, userId) {
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      'UPDATE patients SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    if (!rowCount) throw notFound('Patient introuvable');

    const cancelled = await client.query(
      `UPDATE appointments SET status = 'cancelled'
        WHERE patient_id = $1 AND status <> 'cancelled' AND appointment_date >= now()`,
      [id],
    );
    await audit(client, {
      userId,
      action: 'delete',
      entity: 'patient',
      entityId: id,
      payload: { cancelledAppointments: cancelled.rowCount },
    });
  });
}

module.exports = { list, getById, create, update, remove };
