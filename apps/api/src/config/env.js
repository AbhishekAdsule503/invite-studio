import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from api directory or workspace root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  appOrigin: process.env.APP_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'),
  appOrigins: (process.env.APP_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  allowVercelPreviews: process.env.ALLOW_VERCEL_PREVIEWS === 'true',
  apiOrigin: process.env.API_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : `http://localhost:${process.env.PORT || '5000'}`),
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
  storage: {
    provider: process.env.STORAGE_PROVIDER || (process.env.SUPABASE_URL ? 'supabase' : 'local'),
    supabase: {
      url: process.env.SUPABASE_URL || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      bucket: process.env.SUPABASE_STORAGE_BUCKET || 'invitations'
    }
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_invite_studio_default_key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_invite_studio_default_key',
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
  },
  otp: {
    // Strictly disable demo OTP in production mode
    enableDemoOtp: process.env.NODE_ENV === 'production' ? false : process.env.ENABLE_DEMO_OTP === 'true',
    demoOtp: process.env.DEMO_OTP || '12345',
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10)
  },
  sms: {
    provider: process.env.SMS_PROVIDER || null,
    isConfigured: Boolean(process.env.SMS_PROVIDER && (process.env.SMS_API_KEY || process.env.TWILIO_AUTH_TOKEN))
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'INVITE STUDIO',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'support@invitestudio.com'
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
  }
};

