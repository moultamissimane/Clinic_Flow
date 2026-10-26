const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../db/pool');
const { unauthorized, forbidden } = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the Bearer JWT, then reloads the user so a deactivated account or a
// role change takes effect immediately instead of when the token expires.
const auth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw unauthorized('Session invalide ou expirée');
  }

  const { rows } = await query(
    'SELECT id, full_name, email, role, is_active FROM users WHERE id = $1',
    [payload.sub],
  );
  const user = rows[0];
  if (!user || !user.is_active) throw unauthorized('Compte introuvable ou désactivé');

  req.user = { id: user.id, fullName: user.full_name, email: user.email, role: user.role };
  next();
});

// Must run after `auth`.
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden('Action réservée aux administrateurs'));
  next();
};

module.exports = { auth, requireRole };
