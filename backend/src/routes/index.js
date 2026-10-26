const { Router } = require('express');
const { auth } = require('../middlewares/auth');

const router = Router();

router.use('/auth', require('./auth.routes'));

// Everything below requires a valid JWT.
router.use(auth);
router.use('/patients', require('./patient.routes'));
router.use('/appointments', require('./appointment.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/users', require('./user.routes'));

module.exports = router;
