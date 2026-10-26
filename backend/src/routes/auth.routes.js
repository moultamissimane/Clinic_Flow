const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { auth } = require('../middlewares/auth');
const schemas = require('../validators/auth.validator');
const controller = require('../controllers/auth.controller');

const router = Router();

// Brute-force protection on the login endpoint.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => env.nodeEnv === 'test',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Trop de tentatives de connexion, réessayez dans quelques minutes' } },
});

router.post('/login', loginLimiter, validate({ body: schemas.login }), asyncHandler(controller.login));
router.get('/me', auth, asyncHandler(controller.me));

module.exports = router;
