const env = require('./config/env');
const app = require('./app');
const { pool } = require('./db/pool');

const server = app.listen(env.port, () => {
  console.log(`ClinicFlow API listening on http://localhost:${env.port}`);
  console.log(`Swagger UI: http://localhost:${env.port}/api/docs`);
});

function shutdown() {
  server.close(() => pool.end().finally(() => process.exit(0)));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
