const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { requireRole } = require('../middlewares/auth');
const { uuidParam } = require('../validators/common');
const schemas = require('../validators/patient.validator');
const controller = require('../controllers/patient.controller');

const router = Router();

router.get('/', validate({ query: schemas.listQuery }), asyncHandler(controller.list));
router.post('/', validate({ body: schemas.create }), asyncHandler(controller.create));
router.get('/:id', validate({ params: uuidParam }), asyncHandler(controller.getById));
router.put('/:id', validate({ params: uuidParam, body: schemas.update }), asyncHandler(controller.update));
router.delete('/:id', requireRole('admin'), validate({ params: uuidParam }), asyncHandler(controller.remove));

module.exports = router;
