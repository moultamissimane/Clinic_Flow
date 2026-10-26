// Runs before every test file. Tests use a dedicated database because the
// seed truncates all business tables.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/clinicflow_test';
process.env.APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Casablanca';
