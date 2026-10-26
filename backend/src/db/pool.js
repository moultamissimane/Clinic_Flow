const { Pool, types } = require('pg');
const env = require('../config/env');

// Return DATE columns as plain 'YYYY-MM-DD' strings: converting them to JS Date
// would shift them by the server's UTC offset (birth dates off by one day).
types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({ connectionString: env.databaseUrl, max: 10 });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});

function query(text, params) {
  return pool.query(text, params);
}

// Runs `fn(client)` inside a transaction; rolls back on any thrown error.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
