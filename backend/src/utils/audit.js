// Writes an audit trail entry. Pass the transaction client so the log commits
// (or rolls back) together with the change it describes.
async function audit(client, { userId, action, entity, entityId, payload = null }) {
  await client.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, entity, entityId, payload],
  );
}

module.exports = { audit };
