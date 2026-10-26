const dashboardService = require('../services/dashboard.service');

async function stats(req, res) {
  res.json({ data: await dashboardService.getStats() });
}

module.exports = { stats };
