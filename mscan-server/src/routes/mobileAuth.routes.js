const express = require('express');
const router = express.Router();
const controller = require('../controllers/mobileAuth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Mobile auth endpoints
router.post('/request-otp', controller.requestOtp);
router.post('/verify-otp', controller.verifyOtp);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.getMe);

module.exports = router;
