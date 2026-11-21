import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import routes from './routes/index.js';
import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Trust first proxy hop (Render reverse proxy) for accurate client IP resolution and rate limiting
  app.set('trust proxy', 1);

  // Basic security headers with cross-origin asset support
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Robust, multi-environment CORS configuration
  const allowedOriginsSet = new Set([
    ...config.appOrigins,
    ...(config.isDevelopment
      ? ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']
      : [])
  ]);

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser requests (tools, curl, server-to-server) without origin
      if (!origin) return callback(null, true);

      // Explicitly configured production / staging domains
      if (allowedOriginsSet.has(origin)) return callback(null, true);

      // Explicitly allow Vercel previews if configured
      if (config.allowVercelPreviews && /^https:\/\/[a-zA-Z0-9_\-.]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow any local loopback port in development
      if (config.isDevelopment && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow during test suite execution
      if (process.env.NODE_ENV === 'test') {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  app.use(cors(corsOptions));

  // Global rate limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests from this IP. Please try again after 15 minutes.'
    }
  });
  app.use(limiter);

  // Parse JSON bodies with raw buffer capture for cryptographic webhook signatures
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  // Static uploads directory
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  // Root health check
  app.use('/api/health', healthRoutes);

  // API v1 routes
  app.use('/api/v1', routes);

  // 404 handler for unknown routes
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found.'
    });
  });

  // Central error handling middleware
  app.use(errorHandler);

  return app;
}
