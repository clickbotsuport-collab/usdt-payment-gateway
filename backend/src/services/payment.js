import { supabase } from '../config/supabase.js';
import { getUSDTBalanceTatum } from './tatum.js';
import { sendTelegramAlert } from './security.js';

/**
 * Fallback verification logic for Tatum: 
 * 1. Fetch pending orders
 * 2. Check balance of assigned address via Tatum
 * 3. Match balance with monto_esperado
 */
export const verifyPendingPaymentsTatum = async () => {
  try {
    const { data: orders, error } = await supabase
      .from('ordenes')
      .select('*, usuarios(direccion_asignada)')
      .eq('estado', 'pendiente');

    if (error) throw error;

    for (const order of orders) {
      const address = order.usuarios.direccion_asignada;
      const currentBalance = await getUSDTBalanceTatum(address);

      if (parseFloat(currentBalance) >= parseFloat(order.monto_esperado)) {
        // If balance is enough, mark as paid. 
        // Note: For real production, check tx history to get the tx_hash if needed.
        await supabase.from('ordenes')
          .update({ estado: 'pagada' })
          .eq('id', order.id);

        await sendTelegramAlert(`🔄 CRON: Pago Detectado por Saldo!
Order ID: ${order.id}
Address: ${address}
Balance: ${currentBalance} USDT`);

        console.log(`Cron verified payment for order ${order.id}`);
      }
    }
  } catch (error) {
    console.error('Error in verifyPendingPaymentsTatum:', error.message);
  }
};
