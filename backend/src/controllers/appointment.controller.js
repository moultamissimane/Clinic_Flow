const appointmentService = require('../services/appointment.service');

async function list(req, res) {
  res.json(await appointmentService.list(req.query));
}

async function getById(req, res) {
  res.json({ data: await appointmentService.getById(req.params.id) });
}

async function create(req, res) {
  res.status(201).json({ data: await appointmentService.create(req.body, req.user.id) });
}

async function updateStatus(req, res) {
  res.json({ data: await appointmentService.updateStatus(req.params.id, req.body.status, req.user.id) });
}

module.exports = { list, getById, create, updateStatus };
