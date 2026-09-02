const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/paymentController');

// Point this to the correct controller that has the AI Recovery logic
router.post('/razorpay', handleWebhook);

module.exports = router;
