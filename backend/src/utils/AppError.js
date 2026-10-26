class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

const badRequest = (message, details) => new AppError(400, message, details);
const unauthorized = (message = 'Authentification requise') => new AppError(401, message);
const forbidden = (message = 'Accès refusé') => new AppError(403, message);
const notFound = (message = 'Ressource introuvable') => new AppError(404, message);
const conflict = (message, details) => new AppError(409, message, details);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
