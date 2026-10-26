const bcrypt = require('bcrypt');
const { query, withTransaction } = require('../db/pool');
const { notFound, badRequest } = require('../utils/AppError');
const { audit } = require('../utils/audit');
const { toUser } = require('./mappers');

const BCRYPT_ROUNDS = 10;

async function list() {
  const { rows } = await query('SELECT * FROM users ORDER BY role, full_name');
  return rows.map(toUser);
}

async function create(data, actorId) {
  const hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.fullName, data.email, hash, data.role],
    );
    await audit(client, {
      userId: actorId,
      action: 'create',
      entity: 'user',
      entityId: rows[0].id,
      payload: { email: data.email, role: data.role },
    });
    return toUser(rows[0]);
  });
}

async function update(id, data, actorId) {
  // An admin locking themselves out (demotion / deactivation) would leave the
  // clinic without anyone able to manage accounts.
  if (id === actorId && (data.role === 'staff' || data.isActive === false)) {
    throw badRequest('Vous ne pouvez pas retirer vos propres droits administrateur');
  }

  const hash = data.password ? await bcrypt.hash(data.password, BCRYPT_ROUNDS) : null;
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE users
          SET full_name     = COALESCE($2, full_name),
              role          = COALESCE($3::user_role, role),
              is_active     = COALESCE($4, is_active),
              password_hash = COALESCE($5, password_hash)
        WHERE id = $1
        RETURNING *`,
      [id, data.fullName ?? null, data.role ?? null, data.isActive ?? null, hash],
    );
    if (!rows[0]) throw notFound('Utilisateur introuvable');

    const { password, ...changes } = data;
    await audit(client, {
      userId: actorId,
      action: 'update',
      entity: 'user',
      entityId: id,
      payload: { ...changes, ...(password && { passwordChanged: true }) },
    });
    return toUser(rows[0]);
  });
}

module.exports = { list, create, update };
