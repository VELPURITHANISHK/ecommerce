const crypto = require('crypto');
const Payment = require('../models/Payment');
const Order = require('../models/Order');

// @desc    Handle Razorpay Webhooks
// @route   POST /api/webhooks/razorpay
// @access  Public
const handleRazorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Validate webhook signature
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id; // Razorpay Order ID

      // Find our payment record
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment) {
        payment.status = 'CAPTURED';
        payment.razorpayPaymentId = paymentEntity.id;
        payment.method = paymentEntity.method;
        await payment.save();
      }
      
      const order = await Order.findOne({ razorpayOrderId: orderId });
      if (order) {
        order.paymentStatus = 'PAID';
        order.status = 'PROCESSING';
        await order.save();
      }
    } 
    else if (event === 'payment.failed') {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;
      
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment) {
        payment.status = 'FAILED';
        payment.razorpayPaymentId = paymentEntity.id;
        payment.failureReason = paymentEntity.error_description || paymentEntity.error_reason || 'Unknown error';
        await payment.save();
      }

      const order = await Order.findOne({ razorpayOrderId: orderId });
      if (order) {
        order.paymentStatus = 'FAILED';
        await order.save();
      }
    }
    else if (event === 'order.paid') {
      const orderEntity = payload.order.entity;
      const razorpayOrderId = orderEntity.id;
      
      const order = await Order.findOne({ razorpayOrderId: razorpayOrderId });
      if (order) {
        order.paymentStatus = 'PAID';
        order.status = 'PROCESSING';
        await order.save();
      }
    }

    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing error' });
  }
};

module.exports = {
  handleRazorpayWebhook
};
