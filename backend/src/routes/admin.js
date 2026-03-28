import express from 'express';
import { supabase } from '../config/supabase.js';
import { adminAuth } from '../services/security.js';
import { getUSDTBalanceTatum, transferUSDTWithTatum, deriveTatumAddress } from '../services/tatum.js';

const router = express.Router();

/**
 * GET /api/admin/stats
 */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const { data: orders } = await supabase.from('ordenes').select('monto_esperado, estado');
    const { data: users } = await supabase.from('usuarios').select('direccion_asignada, user_id_internal');

    const totalVolume = orders?.filter(o => o.estado === 'pagada').reduce((sum, o) => sum + parseFloat(o.monto_esperado), 0) || 0;
    const pendingOrders = orders?.filter(o => o.estado === 'pendiente').length || 0;

    res.json({
      total_volume: totalVolume,
      total_users: users?.length || 0,
      active_orders: pendingOrders,
      addresses: users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/transactions
 */
router.get('/transactions', adminAuth, async (req, res) => {
    const { data } = await supabase
        .from('transacciones')
        .select('*, usuarios(user_id_internal)')
        .order('created_at', { ascending: false });
    res.json(data);
});

/**
 * GET /api/admin/balances
 */
router.get('/balances', adminAuth, async (req, res) => {
  try {
    const { data: users } = await supabase.from('usuarios').select('direccion_asignada, user_id_internal');
    const balances = await Promise.all(users.map(async (u) => ({
      ...u,
      balance: await getUSDTBalanceTatum(u.direccion_asignada)
    })));
    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/consolidate
 */
router.post('/consolidate', adminAuth, async (req, res) => {
  const { user_id_internal } = req.body;
  
  try {
    const { data: user } = await supabase
      .from('usuarios')
      .select('*')
      .eq('user_id_internal', user_id_internal)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });

    const balance = await getUSDTBalanceTatum(user.direccion_asignada);
    if (parseFloat(balance) <= 0) return res.status(400).json({ error: 'No balance to consolidate' });

    // Derive wallet for signing
    const index = Math.abs(user_id_internal.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)) % 1000000;
    const wallet = await deriveTatumAddress(index);

    const txId = await transferUSDTWithTatum(wallet.privateKey, process.env.MAIN_HOT_WALLET_ADDRESS, balance);
    
    res.json({ success: true, txId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
