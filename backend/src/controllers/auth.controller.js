const authService = require('../services/auth.service');

async function login(req, res) {
  res.json(await authService.login(req.body));
}

async function me(req, res) {
  res.json({ user: await authService.me(req.user.id) });
}

module.exports = { login, me };
