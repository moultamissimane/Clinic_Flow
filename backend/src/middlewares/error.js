const { ZodError } = require('zod');
const { AppError } = require('../utils/AppError');
const env = require('../config/env');

const notFoundHandler = (req, res) => {
  res.status(404).json({ error: { message: `Route introuvable : ${req.method} ${req.originalUrl}` } });
};

// Maps PostgreSQL error codes to HTTP errors so constraint violations that slip
// past service-level checks (e.g. concurrent requests) still return a clean 4xx.
function fromPgError(err) {
  switch (err.code) {
    case '23505':
      if (err.constraint === 'patients_cin_key') {
        return new AppError(409, 'Ce CIN existe déjà', [{ field: 'cin', message: 'Ce CIN existe déjà' }]);
      }
      if (err.constraint === 'users_email_key') {
        return new AppError(409, 'Cet email est déjà utilisé', [{ field: 'email', message: 'Cet email est déjà utilisé' }]);
      }
      return new AppError(409, 'Cette ressource existe déjà');
    case '23P01':
      return new AppError(409, 'Ce patient a déjà un rendez-vous confirmé dans une fenêtre de 30 minutes');
    case '23503':
      return new AppError(400, 'Référence invalide (ressource liée introuvable)');
    case '23514':
    case '22P02':
    case '22007':
    case '22008':
      return new AppError(400, 'Données invalides');
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Données invalides',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'JSON invalide' } });
  }

  const appErr = err instanceof AppError ? err : fromPgError(err);
  if (appErr) {
    return res.status(appErr.status).json({
      error: { message: appErr.message, ...(appErr.details && { details: appErr.details }) },
    });
  }

  console.error(err);
  res.status(500).json({
    error: { message: 'Erreur interne du serveur', ...(env.nodeEnv === 'development' && { debug: err.message }) },
  });
};

module.exports = { notFoundHandler, errorHandler };
