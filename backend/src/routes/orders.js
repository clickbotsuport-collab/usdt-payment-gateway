import express from 'express';
import { supabase } from '../config/supabase.js';
import { deriveTatumAddress, subscribeToAddress } from '../services/tatum.js';
import { apiLimiter } from '../services/security.js';
import { ethers } from 'ethers';

const router = express.Router();

/**
 * POST /api/orders
 * Creates a new order and returns the user's assigned fixed BSC address.
 */
router.post('/', apiLimiter, async (req, res) => {
  const { user_id_internal, monto_esperado, product_id, email } = req.body;

  if (!user_id_internal || !monto_esperado) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Check if user already exists
    let { data: user } = await supabase
      .from('usuarios')
      .select('*')
      .eq('user_id_internal', user_id_internal)
      .single();

    if (!user) {
      // Derive new fixed address using Tatum
      // For this Gateway, we use a simple hash of the internal ID to get a deterministic index
      const index = Math.abs(user_id_internal.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)) % 1000000;
      const wallet = await deriveTatumAddress(index);

      const { data: newUser, error: createError } = await supabase
        .from('usuarios')
        .insert({ 
            user_id_internal, 
            email,
            direccion_asignada: wallet.address 
        })
        .select()
        .single();

      if (createError) throw createError;
      user = newUser;

      // Subscribe this address in Tatum
      await subscribeToAddress(user.direccion_asignada);
    }

    // 2. Create Order
    const { data: order, error: orderError } = await supabase
      .from('ordenes')
      .insert({
        usuario_id: user.id,
        monto_esperado: monto_esperado,
        producto_id,
        estado: 'pendiente'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    res.json({
      order_id: order.id,
      address: user.direccion_asignada,
      amount: monto_esperado,
      status: 'pendiente'
    });

  } catch (error) {
    console.error('Order creation error:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * GET /api/orders/:usuarioId
 */
router.get('/:usuarioId', async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('usuarios')
      .select('id')
      .eq('user_id_internal', req.params.usuarioId)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data: orders } = await supabase
      .from('ordenes')
      .select('*')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
