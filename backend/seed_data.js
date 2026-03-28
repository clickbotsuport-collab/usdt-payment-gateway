import { supabase } from './src/config/supabase.js';
import { deriveTatumAddress, subscribeToAddress } from './src/services/tatum.js';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
  console.log('🌱 Seeding initial test data...');
  
  const user_id_internal = 'test_user_001';
  const monto_esperado = 15.0;
  
  try {
    // 1. Derive address
    const index = 123456; // Fixed index for test
    const wallet = await deriveTatumAddress(index);
    console.log(`Address derived: ${wallet.address}`);

    // 2. Create user in Supabase
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .upsert({ 
        user_id_internal, 
        email: 'test@cunemo.com',
        direccion_asignada: wallet.address 
      })
      .select()
      .single();

    if (userError) throw userError;
    console.log('User created:', user.id);

    // 3. Create order
    const { data: order, error: orderError } = await supabase
      .from('ordenes')
      .insert({
        usuario_id: user.id,
        monto_esperado: monto_esperado,
        producto_id: 'prod_premium_plan',
        estado: 'pendiente'
      })
      .select()
      .single();

    if (orderError) throw orderError;
    console.log('Order created successfully!');

    // 4. Try to subscribe to Tatum (will fail if APP_URL is localhost but good to show)
    try {
        await subscribeToAddress(wallet.address);
        console.log('Webhook subscription attempted.');
    } catch (e) {
        console.log('Webhook subscription skipped (Localhost).');
    }

    console.log('\n✅ DONE! Refresh your Dashboard at http://localhost:3000');
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
  }
};

seed();
