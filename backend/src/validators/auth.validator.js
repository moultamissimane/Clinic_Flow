const { z } = require('./common');

const login = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis').max(128),
});

module.exports = { login };
