const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
  orderId: { type: String, required: true, unique: true }, // Internal App Order ID
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'INR' },
  status: { type: String, enum: ['CREATED', 'PROCESSING', 'COMPLETED', 'CANCELLED'], default: 'CREATED' },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  
  // Future proofing for revenue recovery
  retryCount: { type: Number, default: 0 },
  lastRetryAt: { type: Date },
  recoveryStatus: { type: String, enum: ['NONE', 'IN_PROGRESS', 'RECOVERED', 'FAILED'], default: 'NONE' },
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
