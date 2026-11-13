import { Router } from 'express';
import { testDatabaseConnection } from '../database/prisma.js';
import { config } from '../config/env.js';

const router = Router();

router.get('/', async (_req, res) => {
  const dbStatus = await testDatabaseConnection();

  const healthData = {
    status: dbStatus.ok ? 'healthy' : 'degraded',
    app: 'INVITE STUDIO API',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      provider: 'postgresql',
      connected: dbStatus.ok,
      message: dbStatus.message
    }
  };

  const statusCode = dbStatus.ok ? 200 : 503;
  res.status(statusCode).json(healthData);
});

export default router;

