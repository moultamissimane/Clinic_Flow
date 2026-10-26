const userService = require('../services/user.service');

async function list(req, res) {
  res.json({ data: await userService.list() });
}

async function create(req, res) {
  res.status(201).json({ data: await userService.create(req.body, req.user.id) });
}

async function update(req, res) {
  res.json({ data: await userService.update(req.params.id, req.body, req.user.id) });
}

module.exports = { list, create, update };
