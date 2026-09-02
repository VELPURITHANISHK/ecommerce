import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { FaTrash } from 'react-icons/fa';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useContext(CartContext);
  const navigate = useNavigate();

  if (cartItems.length === 0) {
    return (
      <div className="text-center mt-20">
        <h2 className="text-2xl font-semibold mb-4">Your Cart is Empty</h2>
        <Link to="/" className="text-blue-600 hover:underline text-lg">Go back to shopping</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-grow">
          {cartItems.map(item => (
            <div key={item.productId} className="flex items-center justify-between bg-white p-4 mb-4 rounded-lg shadow">
              <div className="flex items-center space-x-4">
                <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                <div>
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <p className="text-gray-600">₹{item.price}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  >-</button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.productId, Math.min(item.stock, item.quantity + 1))}
                    className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  >+</button>
                </div>
                <div className="font-semibold w-24 text-right">
                  ₹{item.price * item.quantity}
                </div>
                <button 
                  onClick={() => removeFromCart(item.productId)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="lg:w-1/3 bg-white p-6 rounded-lg shadow h-fit">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="flex justify-between mb-2">
            <span>Items ({cartItems.reduce((a, c) => a + c.quantity, 0)}):</span>
            <span>₹{getCartTotal()}</span>
          </div>
          <div className="border-t pt-4 mt-4 flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>₹{getCartTotal()}</span>
          </div>
          <button 
            onClick={() => navigate('/checkout')}
            className="w-full bg-blue-600 text-white mt-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
