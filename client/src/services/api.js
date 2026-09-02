import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getProducts = () => axios.get(`${API_URL}/products`);
export const getProductById = (id) => axios.get(`${API_URL}/products/${id}`);

export const createOrder = (orderData) => axios.post(`${API_URL}/payments/create-order`, orderData);
export const verifyPayment = (paymentData) => axios.post(`${API_URL}/payments/verify`, paymentData);
export const reportPaymentFailure = (failureData) => axios.post(`${API_URL}/payments/failed`, failureData);
