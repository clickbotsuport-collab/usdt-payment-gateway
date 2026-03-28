# 🚀 USDT Tatum BSC Payment Gateway

Sistema de pagos con USDT (BSC) utilizando **Tatum SDK** para la gestión de infraestructura blockchain, monitoreo en tiempo real vía Webhooks y derivación de wallets HD.

## 🛠️ Configuración Tatum
1. Crea una cuenta en [Tatum.io](https://tatum.io).
2. Obtén tu **API Key** (Mainnet o Testnet).
3. Configura el **Webhook** en el Dashboard de Tatum para apuntar a: `https://tu-backend.com/api/webhooks/tatum`.
   - Tipo: `Incoming Fungible Transfers`.
   - Red: `BSC`.

---

## ⚙️ Variables de Entorno (.env)

### Backend
```env
TATUM_API_KEY="tu_tatum_api_key_v2"
TATUM_NETWORK="BSC" # O "BSC_TESTNET"
MNEMONIC="tus 12 palabras de semilla"
SUPABASE_URL="tu_url_supabase"
SUPABASE_KEY="tu_key_anon_supabase"
ADMIN_SECRET_KEY="tu_clave_dashboard"
MAIN_HOT_WALLET_ADDRESS="direccion_donde_recibir_fondos"
APP_URL="https://tu-backend-desplegado.com"
```

---

## 🔐 Generación de Mnemonic
Puedes generar tu frase semilla de forma segura usando `ethers` en una consola local (offline):
```javascript
const { Wallet } = require('ethers');
const wallet = Wallet.createRandom();
console.log(wallet.mnemonic.phrase);
```

---

## 🚀 Ejecución y Despliegue

### Local
1. Ejecuta el SQL en Supabase: [supabase_schema.sql](file:///C:/Users/EQUIPO/.gemini/antigravity/brain/5b245a56-51d3-4829-94b5-02d4c0b44ef5/supabase_schema.sql)
2. Backend: `cd backend && npm install && npm start`
3. Frontend: `cd frontend && npm install && npm run dev`

### Despliegue
- **Backend (Render)**: Conecta el repo de GitHub. Asegúrate de configurar la variable `APP_URL` para que Tatum sepa a dónde enviar los Webhooks.
- **Frontend (Vercel)**: Configura la `API_BASE_URL` en `frontend/src/api/client.js`.

---

## 🛡️ Características
- **Direcciones Fijas**: Cada usuario recibe una dirección basada en su ID interno de forma determinística.
- **Webhooks**: Notificación instantánea de pagos detectados.
- **Cron Fallback**: Respaldo que verifica saldos cada 60 segundos por si el webhook falla.
- **Consolidación**: El admin puede mover fondos manualmente desde las direcciones de usuarios a la wallet principal.
