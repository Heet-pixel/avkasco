const router = require('express').Router();
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { identify, login, me, changePassword } = require('../controllers/authController');
const { sendOtp, verify, reset } = require('../controllers/passwordController');

router.post('/identify', rateLimit({ max: 40 }), identify);
router.post('/login', rateLimit({ max: 30 }), login);
router.get('/me', auth, me);
router.post('/change-password', auth, rateLimit({ max: 10 }), changePassword);
router.post('/forgot/send', rateLimit({ max: 8 }), sendOtp);
router.post('/forgot/verify', rateLimit({ max: 20 }), verify);
router.post('/forgot/reset', rateLimit({ max: 10 }), reset);
module.exports = router;
