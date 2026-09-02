import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../services/api';
import { CartContext } from '../context/CartContext';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await getProductById(id);
        setProduct(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product', error);
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!product) return <div className="text-center mt-10 text-red-500">Product not found.</div>;

  const handleAddToCart = () => {
    addToCart(product);
    navigate('/cart');
  };

  return (
    <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-md overflow-hidden p-6 gap-8">
      <div className="md:w-1/2">
        <img src={product.image} alt={product.name} className="w-full h-auto object-cover rounded" />
      </div>
      <div className="md:w-1/2 flex flex-col justify-center">
        <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
        <p className="text-gray-600 mb-6 text-lg">{product.description}</p>
        <div className="text-2xl font-bold text-blue-600 mb-4">₹{product.price}</div>
        <p className="text-sm text-gray-500 mb-6">Stock Available: {product.stock}</p>
        
        {product.stock > 0 ? (
          <button 
            onClick={handleAddToCart}
            className="bg-blue-600 text-white py-3 px-6 rounded text-lg hover:bg-blue-700 transition"
          >
            Add to Cart
          </button>
        ) : (
          <button disabled className="bg-gray-400 text-white py-3 px-6 rounded text-lg cursor-not-allowed">
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
