import './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import { env } from './config/env';
import { testConnection } from './config/db';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes';
import invoiceRoutes from './routes/invoice.routes';
import dashboardRoutes from './routes/dashboard.routes';
import userRoutes from './routes/user.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env['CLIENT_ORIGIN'] || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(errorHandler);

async function start() {
  await testConnection();
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
