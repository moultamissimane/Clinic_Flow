require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key] && nodeEnv !== 'test') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()),
  timezone: process.env.APP_TIMEZONE || 'Africa/Casablanca',
};
