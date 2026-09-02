import React from 'react';
import { Link } from 'react-router-dom';

const PaymentFailure = () => {
  return (
    <div className="text-center mt-20">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Payment Failed!</h1>
      <p className="text-xl mb-8">We could not process your payment. Please try again.</p>
      <div className="space-x-4">
        <Link to="/cart" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
          Go to Cart
        </Link>
        <Link to="/" className="text-blue-600 hover:underline">
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default PaymentFailure;
