const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { uuidParam } = require('../validators/common');
const schemas = require('../validators/appointment.validator');
const controller = require('../controllers/appointment.controller');

const router = Router();

router.get('/', validate({ query: schemas.listQuery }), asyncHandler(controller.list));
router.post('/', validate({ body: schemas.create }), asyncHandler(controller.create));
router.get('/:id', validate({ params: uuidParam }), asyncHandler(controller.getById));
router.patch(
  '/:id/status',
  validate({ params: uuidParam, body: schemas.updateStatus }),
  asyncHandler(controller.updateStatus),
);

module.exports = router;
