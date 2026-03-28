import express from 'express';
import { supabase } from '../config/supabase.js';
import { sendTelegramAlert } from '../services/security.js';

const router = express.Router();

/**
 * POST /api/webhooks/tatum
 * Receives Tatum notifications.
 */
router.post('/tatum', async (req, res) => {
  const data = req.body;
  console.log('Webhook received from Tatum:', JSON.stringify(data, null, 2));

  // Tatum addressEvent subscription data format
  // {
  //   "address": "0x...",
  //   "amount": "10.0",
  //   "currency": "USDT",
  //   "txId": "0x...",
  //   "type": "native or fungible",
  //   ...
  // }

  if (data.type === 'fungible' && data.asset?.toLowerCase() === 'usdt') {
    const { address, amount, txId } = data;

    try {
      // 1. Locate user by address
      const { data: user } = await supabase
        .from('usuarios')
        .select('id, user_id_internal')
        .eq('direccion_asignada', address)
        .single();

      if (!user) {
        console.warn(`Webhook received for unknown address: ${address}`);
        return res.status(200).send(); // Acknowledge to Tatum anyway
      }

      // 2. Check for pending orders for this user
      const { data: order } = await supabase
        .from('ordenes')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (order && parseFloat(amount) >= parseFloat(order.monto_esperado)) {
        // 3. Update order
        await supabase.from('ordenes')
          .update({ estado: 'pagada', tx_hash: txId })
          .eq('id', order.id);

        // 4. Log transaction
        await supabase.from('transacciones').insert({
          usuario_id: user.id,
          tx_hash: txId,
          monto: amount,
          direccion_destino: address,
          confirmado_en: new Date()
        });

        // 5. Update user credits (optional)
        await supabase.rpc('increment_credits', { 
            userid: user.id, 
            amount_to_add: parseFloat(amount) 
        });

        await sendTelegramAlert(`✅ WEBHOOK: Pago USDT Confirmado!
User: ${user.user_id_internal}
Monto: ${amount} USDT
TX: https://bscscan.com/tx/${txId}`);

        console.log(`Payment confirmed via webhook for user ${user.id}`);
      }
    } catch (error) {
      console.error('Error processing webhook:', error.message);
    }
  }

  res.status(200).json({ received: true });
});

export default router;
