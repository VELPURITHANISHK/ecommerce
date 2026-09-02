require('dotenv').config();
const mongoose = require('mongoose');
const { handleWebhook } = require('./controllers/paymentController');

mongoose.connect('mongodb+srv://thanishk1827_db_user:RK8OStdid4WF9psf@cluster0.a7kslcl.mongodb.net/ecommerce_db?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const req = {
    headers: { 'x-razorpay-signature': 'fake' },
    body: {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test123', amount: 2999, notes: { paymentId: '6a9881d8324649cac383cd50' } } } }
    }
  };
  const res = {
    status: (code) => ({ json: (data) => console.log('Status', code, data) }),
    json: (data) => console.log('JSON', data)
  };
  
  await handleWebhook(req, res);
  process.exit(0);
});
