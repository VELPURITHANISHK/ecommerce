import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { createOrder, verifyPayment, reportPaymentFailure } from '../services/api';

const Checkout = () => {
  const { cartItems, getCartTotal, clearCart } = useContext(CartContext);
  const navigate = useNavigate();

  const [customer, setCustomer] = useState({
    name: 'Test User',
    email: 'test@example.com',
    phone: '9876543210',
    address: '123 Main St, Tech City'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, navigate]);

  const handleInputChange = (e) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await loadRazorpayScript();
      if (!res) {
        alert('Razorpay SDK failed to load. Are you offline?');
        setLoading(false);
        return;
      }

      // Create Order on backend
      const orderPayload = {
        customer,
        items: cartItems.map(item => ({ productId: item.productId, quantity: item.quantity }))
      };

      const { data } = await createOrder(orderPayload);
      const { orderId, razorpayOrderId, amount, currency, keyId } = data;

      const options = {
        key: keyId,
        amount: amount.toString(),
        currency: currency,
        name: 'My Shop',
        description: 'Test Transaction',
        order_id: razorpayOrderId,
        handler: async function (response) {
          // Verify on backend
          try {
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: orderId
            };
            
            const verifyRes = await verifyPayment(verifyPayload);
            if (verifyRes.data.success) {
              clearCart();
              navigate('/success');
            } else {
              navigate('/failure');
            }
          } catch (err) {
            console.error('Verification Error:', err);
            navigate('/failure');
          }
        },
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone,
        },
        theme: {
          color: '#2563EB',
        },
      };

      const paymentObject = new window.Razorpay(options);
      
      paymentObject.on('payment.failed', async function (response) {
        // Send failure data to backend
        try {
          await reportPaymentFailure({ error: response.error, order_id: orderId });
        } catch (e) {
          console.error('Could not report failure', e);
        }
        navigate('/failure');
      });
      
      paymentObject.open();

    } catch (error) {
      console.error('Payment Error:', error);
      alert('Could not initiate checkout. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-8 text-center">Checkout</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Customer Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
            <input type="text" name="name" value={customer.name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input type="email" name="email" value={customer.email} onChange={handleInputChange} className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Phone</label>
            <input type="text" name="phone" value={customer.phone} onChange={handleInputChange} className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Address</label>
            <textarea name="address" value={customer.address} onChange={handleInputChange} className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500" required rows="3"></textarea>
          </div>
        </div>
      </div>

      <div className="mb-8 bg-gray-50 p-4 rounded">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        <div className="space-y-2 mb-4">
          {cartItems.map(item => (
            <div key={item.productId} className="flex justify-between">
              <span>{item.name} (x{item.quantity})</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>Total Amount:</span>
          <span>₹{getCartTotal()}</span>
        </div>
      </div>

      <button 
        onClick={handlePayment} 
        disabled={loading}
        className={`w-full text-white py-3 rounded-lg text-lg transition font-bold ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {loading ? 'Processing...' : 'Pay with Razorpay'}
      </button>
    </div>
  );
};

export default Checkout;
