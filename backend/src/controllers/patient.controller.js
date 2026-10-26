const patientService = require('../services/patient.service');

async function list(req, res) {
  res.json(await patientService.list(req.query));
}

async function getById(req, res) {
  res.json({ data: await patientService.getById(req.params.id) });
}

async function create(req, res) {
  res.status(201).json({ data: await patientService.create(req.body, req.user.id) });
}

async function update(req, res) {
  res.json({ data: await patientService.update(req.params.id, req.body, req.user.id) });
}

async function remove(req, res) {
  await patientService.remove(req.params.id, req.user.id);
  res.status(204).end();
}

module.exports = { list, getById, create, update, remove };
