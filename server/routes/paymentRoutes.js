const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, handleFailedPayment, handleWebhook } = require('../controllers/paymentController');

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/failed', handleFailedPayment);
router.post('/webhook', handleWebhook);

module.exports = router;
