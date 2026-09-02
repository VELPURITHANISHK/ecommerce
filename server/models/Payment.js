const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'INR' },
  status: { type: String, enum: ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'], required: true },
  method: { type: String },
  failureReason: { type: String },
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
