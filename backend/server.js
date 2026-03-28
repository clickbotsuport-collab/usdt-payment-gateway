import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { logger } from './src/utils/logger.js';
import ordersRoute from './src/routes/orders.js';
import adminRoute from './src/routes/admin.js';
import webhookRoute from './src/routes/webhooks.js';
import { verifyPendingPaymentsTatum } from './src/services/payment.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/orders', ordersRoute);
app.use('/api/admin', adminRoute);
app.use('/api/webhooks', webhookRoute);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', tatum: 'Ready', timestamp: new Date() }));

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled Exception', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Verification Cron (Backup every 60 seconds)
cron.schedule('0 * * * * *', async () => {
  logger.info('Running payment verification cron (Tatum Fallback)...');
  await verifyPendingPaymentsTatum();
});

// Start Server
app.listen(PORT, () => {
  logger.info(`Tatum Gateway Server running on port ${PORT}`);
  logger.info(`Webhooks expected at /api/webhooks/tatum`);
});
