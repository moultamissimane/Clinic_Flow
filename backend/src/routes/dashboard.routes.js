const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/dashboard.controller');

const router = Router();

router.get('/stats', asyncHandler(controller.stats));

module.exports = router;
