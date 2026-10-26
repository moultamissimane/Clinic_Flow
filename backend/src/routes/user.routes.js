const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { requireRole } = require('../middlewares/auth');
const { uuidParam } = require('../validators/common');
const schemas = require('../validators/user.validator');
const controller = require('../controllers/user.controller');

const router = Router();

// User management is admin-only.
router.use(requireRole('admin'));

router.get('/', asyncHandler(controller.list));
router.post('/', validate({ body: schemas.create }), asyncHandler(controller.create));
router.patch('/:id', validate({ params: uuidParam, body: schemas.update }), asyncHandler(controller.update));

module.exports = router;
