const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../db/pool');
const { unauthorized, notFound } = require('../utils/AppError');
const { toUser } = require('./mappers');

// Compared against when the email is unknown, so a login attempt takes the same
// time whether or not the account exists (no user enumeration via timing).
const DUMMY_HASH = bcrypt.hashSync('clinicflow-dummy-password', 10);

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

async function login({ email, password }) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !valid) throw unauthorized('Email ou mot de passe incorrect');
  if (!user.is_active) throw unauthorized('Ce compte est désactivé');

  return { token: signToken(user), user: toUser(user) };
}

async function me(userId) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!rows[0]) throw notFound('Utilisateur introuvable');
  return toUser(rows[0]);
}

module.exports = { login, me, signToken };
