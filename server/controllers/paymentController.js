const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Product = require('../models/Product');

// Initialize Razorpay
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// @desc    Create Order and Razorpay Order
// @route   POST /api/payments/create-order
// @access  Public
const createOrder = async (req, res) => {
  try {
    const { customer, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    // 1. Calculate amount on server
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.name}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for: ${product.name}` });
      }
      totalAmount += product.price * item.quantity;
      orderItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price
      });
    }

    // 2. Find or Create User
    let user = null;
    if (customer && customer.email) {
      user = await User.findOne({ email: customer.email });
      if (!user) {
        user = await User.create({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address
        });
      } else {
        // Update details if they changed
        user.name = customer.name;
        user.phone = customer.phone;
        user.address = customer.address;
        await user.save();
      }
    }

    // 3. Create Razorpay Order
    const razorpay = getRazorpayInstance();
    const options = {
      amount: totalAmount * 100, // Razorpay amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // 4. Create Order in Database
    const order = await Order.create({
      orderId: options.receipt,
      userId: user ? user._id : undefined,
      items: orderItems,
      amount: totalAmount,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
    });

    // 5. Create Payment record initialized to CREATED
    await Payment.create({
      orderId: order._id,
      userId: user ? user._id : undefined,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: 'INR',
      status: 'CREATED'
    });

    res.status(201).json({
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID // Send Key ID for frontend
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ message: 'Server error creating order' });
  }
};

// @desc    Verify Payment
// @route   POST /api/payments/verify
// @access  Public
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET;

    // Verify signature
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    const isAuthentic = generated_signature === razorpay_signature;

    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

    if (isAuthentic) {
      // Payment successful
      order.paymentStatus = 'PAID';
      order.status = 'PROCESSING';
      order.razorpayPaymentId = razorpay_payment_id;
      await order.save();

      if (payment) {
        payment.status = 'CAPTURED';
        payment.razorpayPaymentId = razorpay_payment_id;
        await payment.save();
      }

      // Decrement stock
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock -= item.quantity;
          await product.save();
        }
      }

      res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      // Payment failed signature verification
      order.paymentStatus = 'FAILED';
      await order.save();

      if (payment) {
        payment.status = 'FAILED';
        payment.razorpayPaymentId = razorpay_payment_id || null;
        payment.failureReason = 'Signature verification failed';
        await payment.save();
      }

      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ message: 'Server error verifying payment' });
  }
};

// @desc    Handle Payment Failure (Called from frontend on Razorpay error modal)
// @route   POST /api/payments/failed
// @access  Public
const handleFailedPayment = async (req, res) => {
  try {
    const { error, order_id } = req.body;
    
    if (!order_id) {
        return res.status(400).json({message: 'Order ID is required'});
    }

    const order = await Order.findById(order_id);
    if (order) {
      order.paymentStatus = 'FAILED';
      await order.save();
    }

    const payment = await Payment.findOne({ orderId: order_id }).sort({ createdAt: -1 });
    if (payment) {
      payment.status = 'FAILED';
      payment.failureReason = error?.description || 'Payment failed';
      payment.razorpayPaymentId = error?.metadata?.payment_id || null;
      await payment.save();
    }

    res.status(200).json({ success: true, message: 'Failure recorded' });
  } catch (err) {
    console.error('Failed Payment Handler Error:', err);
    res.status(500).json({ message: 'Server error recording failure' });
  }
};

// @desc    Razorpay Webhook (Server-to-Server)
// @route   POST /api/payments/webhook
// @access  Public
const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'payment.authorized') {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;
      const notesPaymentId = paymentEntity.notes ? paymentEntity.notes.paymentId : null;

      let payment = null;
      if (notesPaymentId) {
        payment = await Payment.findById(notesPaymentId);
      } else if (razorpayOrderId) {
        payment = await Payment.findOne({ razorpayOrderId });
      }

      if (payment && payment.status !== 'CAPTURED') {
        payment.status = 'CAPTURED';
        payment.razorpayPaymentId = razorpayPaymentId;
        await payment.save();
        
        const order = await Order.findById(payment.orderId);
        if (order) {
          order.paymentStatus = 'PAID';
          order.status = 'PROCESSING';
          order.razorpayPaymentId = razorpayPaymentId;
          order.recoveryStatus = 'RECOVERED';
          await order.save();
        }

        // --- AI RECOVERY INTEGRATION ---
        // If this was a recovered payment, update the Recovery Dashboard instantly
        try {
          const mongoose = require('mongoose');
          const recoveryCases = mongoose.connection.collection('recoverycases');
          const recoveryAttempts = mongoose.connection.collection('recoveryattempts');
          
          const recCase = await recoveryCases.findOne({ paymentId: payment._id });
          if (recCase && recCase.status !== 'RECOVERED') {
            await recoveryCases.updateOne(
              { _id: recCase._id },
              { $set: { 
                  status: 'RECOVERED', 
                  recoveredAt: new Date(), 
                  recoveredAmount: payment.amount,
                  updatedAt: new Date()
              }}
            );

            await recoveryAttempts.insertOne({
              paymentId: payment._id,
              orderId: payment.orderId,
              userId: payment.userId,
              decision: 'STOP_RECOVERY',
              status: 'successful',
              reason: 'Payment captured via Razorpay Webhook',
              result: { recovered: true, recoveredAt: new Date() },
              executedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            });
            console.log(`[Webhook] RecoveryCase marked RECOVERED for payment ${payment._id}`);
          }
        } catch (recErr) {
          console.error('[Webhook] Failed to update RecoveryCase:', recErr);
        }
        // -------------------------------
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const notesPaymentId = paymentEntity.notes ? paymentEntity.notes.paymentId : null;
      const failureReason = paymentEntity.error_description || 'Webhook reported failure';

      let payment = null;
      if (notesPaymentId) {
        payment = await Payment.findById(notesPaymentId);
      } else if (razorpayOrderId) {
        payment = await Payment.findOne({ razorpayOrderId });
      }

      if (payment && payment.status !== 'FAILED' && payment.status !== 'CAPTURED') {
        payment.status = 'FAILED';
        payment.failureReason = failureReason;
        await payment.save();

        const order = await Order.findById(payment.orderId);
        if (order) {
          order.paymentStatus = 'FAILED';
          await order.save();
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).json({ message: 'Webhook error' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleFailedPayment,
  handleWebhook
};
