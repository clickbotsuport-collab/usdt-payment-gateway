import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_SECRET = 'cunemo_secret_2024';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-admin-secret': ADMIN_SECRET
  }
});

export const getStats = () => client.get('/admin/stats');
export const getBalances = () => client.get('/admin/balances');
export const consolidate = (user_id_internal) => client.post('/admin/consolidate', { user_id_internal });
export const createOrder = (data) => client.post('/orders', data);

export default client;
