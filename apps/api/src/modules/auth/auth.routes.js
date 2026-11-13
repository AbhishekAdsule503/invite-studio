import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendOtpSchema, verifyOtpSchema, completeProfileSchema } from '@smart-invitation/shared';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { authenticateToken } from '../../middlewares/auth.js';
import * as authController from './auth.controller.js';

const router = Router();

// Strict rate limiting on OTP request endpoints to prevent SMS abuse
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many OTP requests. Please wait a few minutes before trying again.'
  }
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many verification attempts. Please try again later.'
  }
});

// Auth Routes
router.post('/send-otp', otpSendLimiter, validateRequest(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', otpVerifyLimiter, validateRequest(verifyOtpSchema), authController.verifyOtp);
router.post('/complete-profile', authenticateToken, validateRequest(completeProfileSchema), authController.completeProfile);
router.post('/refresh', authController.refreshToken);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.post('/logout', authenticateToken, authController.logout);

export default router;
