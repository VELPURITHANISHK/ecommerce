import React, { createContext, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  // On mount: validate cart items against live DB and drop stale product IDs
  useEffect(() => {
    const validateCart = async () => {
      const saved = cartItems;
      if (!saved || saved.length === 0) return;
      try {
        const res = await fetch(`${API_URL}/products`);
        if (!res.ok) return;
        const products = await res.json();
        const validIds = new Set(products.map(p => p._id));
        const cleaned = saved.filter(item => validIds.has(item.productId));
        if (cleaned.length !== saved.length) {
          console.warn('[Cart] Removed stale cart items (product IDs no longer in DB).');
          setCartItems(cleaned);
        }
      } catch {
        // If API is unreachable, keep existing cart — don't break anything
      }
    };
    validateCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product) => {
    setCartItems(prev => {
      const exists = prev.find(item => item.productId === product._id);
      if (exists) {
        return prev.map(item => 
          item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product._id, name: product.name, price: product.price, image: product.image, quantity: 1, stock: product.stock }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    setCartItems(prev => prev.map(item => 
      item.productId === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal }}>
      {children}
    </CartContext.Provider>
  );
};
