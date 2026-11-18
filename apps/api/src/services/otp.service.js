import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { normalizeEmail } from '@smart-invitation/shared';
import prisma from '../database/prisma.js';
import { config } from '../config/env.js';
import mailService from './mail.service.js';

export class OtpService {
  /**
   * Generates a 5-digit numeric OTP for mobile SMS authentication
   * Preserves demo OTP support in development when SMS gateway is not connected
   * @returns {string} 5-digit OTP
   */
  generateOtp() {
    if (config.isDevelopment && config.otp.enableDemoOtp) {
      return config.otp.demoOtp || '12345';
    }
    // Cryptographically secure random 5-digit number: 10000 - 99999
    return crypto.randomInt(10000, 100000).toString();
  }

  /**
   * Generates a cryptographically secure random 5-digit numeric OTP for email verification.
   * Always generates a fresh random 5-digit code in the range 10000 - 99999 (inclusive).
   * Demo OTP logic is strictly isolated to mobile development and NEVER overrides email OTPs.
   * @returns {string} 5-digit OTP
   */
  generateEmailOtp() {
    return crypto.randomInt(10000, 100000).toString();
  }

  /**
   * Hashes an OTP for safe storage
   * @param {string} otp
   * @returns {Promise<string>}
   */
  async hashOtp(otp) {
    return bcrypt.hash(otp, 10);
  }

  /**
   * Compares plain OTP against hash
   * @param {string} plainOtp
   * @param {string} hashedOtp
   * @returns {Promise<boolean>}
   */
  async compareOtp(plainOtp, hashedOtp) {
    return bcrypt.compare(plainOtp, hashedOtp);
  }

  /**
   * Issues a new 5-digit OTP challenge for a given mobile number
   * PRESERVES COMPLETE EXISTING MOBILE OTP IMPLEMENTATION
   * @param {string} mobile E.164 normalized phone number
   * @returns {Promise<{ message: string, resendCooldownSeconds: number, demoOtp?: string }>}
   */
  async sendOtp(mobile) {
    const cooldownMs = config.otp.resendCooldownSeconds * 1000;
    const cooldownThreshold = new Date(Date.now() - cooldownMs);

    // Check resend cooldown
    const latestChallenge = await prisma.otpChallenge.findFirst({
      where: {
        mobile,
        createdAt: { gte: cooldownThreshold }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (latestChallenge) {
      const elapsedMs = Date.now() - new Date(latestChallenge.createdAt).getTime();
      const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      const err = new Error(`Please wait ${remainingSeconds}s before requesting a new code.`);
      err.statusCode = 429;
      throw err;
    }

    // Guard against pretending SMS delivery works in production without an SMS provider
    if (config.isProduction && !config.sms.isConfigured) {
      const err = new Error(
        'SMS gateway is not configured for mobile OTP delivery in this environment. Please sign in with Email to receive your verification code instantly.'
      );
      err.statusCode = 503;
      throw err;
    }

    const otpCode = this.generateOtp();
    const hashedOtp = await this.hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

    await prisma.otpChallenge.create({
      data: {
        mobile,
        hashedOtp,
        expiresAt,
        maxAttempts: config.otp.maxAttempts,
        attempts: 0
      }
    });

    const response = {
      success: true,
      message: 'Verification code sent successfully.',
      resendCooldownSeconds: config.otp.resendCooldownSeconds,
      expiresInMinutes: config.otp.expiryMinutes
    };

    if (config.isDevelopment && config.otp.enableDemoOtp) {
      response.demoOtp = otpCode;
    }

    return response;
  }

  /**
   * Verifies an OTP code against active challenges for the mobile number
   * PRESERVES COMPLETE EXISTING MOBILE OTP IMPLEMENTATION
   * @param {string} mobile E.164 normalized phone number
   * @param {string} otp 5-digit code
   * @returns {Promise<boolean>}
   */
  async verifyOtp(mobile, otp) {
    if (!otp || typeof otp !== 'string' || otp.trim().length !== 5) {
      const err = new Error('Verification code must be exactly 5 digits.');
      err.statusCode = 400;
      throw err;
    }

    const cleanOtp = otp.trim();

    if (config.isProduction && cleanOtp === config.otp.demoOtp) {
      const err = new Error('Demo verification codes are not permitted in production environment.');
      err.statusCode = 400;
      throw err;
    }

    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        mobile,
        verifiedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!challenge) {
      const err = new Error('No active verification challenge found. Please request a new code.');
      err.statusCode = 400;
      throw err;
    }

    if (new Date() > new Date(challenge.expiresAt)) {
      const err = new Error('Verification code has expired. Please request a new one.');
      err.statusCode = 400;
      throw err;
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      const err = new Error('Maximum verification attempts exceeded. Please request a new code.');
      err.statusCode = 429;
      throw err;
    }

    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } }
    });

    let isValid = false;
    if (config.isDevelopment && config.otp.enableDemoOtp && cleanOtp === config.otp.demoOtp) {
      isValid = true;
    } else {
      isValid = await this.compareOtp(cleanOtp, challenge.hashedOtp);
    }

    if (!isValid) {
      const remainingAttempts = challenge.maxAttempts - (challenge.attempts + 1);
      const err = new Error(
        remainingAttempts > 0
          ? `Invalid verification code. ${remainingAttempts} attempts remaining.`
          : 'Invalid verification code. Maximum attempts reached. Please request a new code.'
      );
      err.statusCode = 400;
      throw err;
    }

    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { verifiedAt: new Date() }
    });

    return true;
  }

  /**
   * Issues a new 5-digit OTP challenge for an email address and delivers it via Brevo SMTP
   * @param {string} rawEmail
   * @param {Object} [options]
   * @param {string} [options.name]
   * @returns {Promise<{ success: boolean, message: string, resendCooldownSeconds: number, expiresInMinutes: number, email: string, demoOtp?: string }>}
   */
  async sendEmailOtp(rawEmail, options = {}) {
    const email = normalizeEmail(rawEmail);
    if (!email) {
      const err = new Error('Please provide a valid email address.');
      err.statusCode = 400;
      throw err;
    }

    const identifier = `email:${email}`;
    const cooldownMs = config.otp.resendCooldownSeconds * 1000;
    const cooldownThreshold = new Date(Date.now() - cooldownMs);

    // Enforce 60-second resend cooldown on email
    const latestChallenge = await prisma.otpChallenge.findFirst({
      where: {
        mobile: identifier,
        createdAt: { gte: cooldownThreshold }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (latestChallenge) {
      const elapsedMs = Date.now() - new Date(latestChallenge.createdAt).getTime();
      const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      const err = new Error(`Please wait ${remainingSeconds}s before requesting a new code.`);
      err.statusCode = 429;
      throw err;
    }

    // Cryptographically secure random 5-digit OTP for every request
    const otpCode = this.generateEmailOtp();
    const hashedOtp = await this.hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

    // Save hashed challenge with 5-minute expiry
    await prisma.otpChallenge.create({
      data: {
        mobile: identifier,
        hashedOtp,
        expiresAt,
        maxAttempts: config.otp.maxAttempts,
        attempts: 0
      }
    });

    // Send through Brevo SMTP
    await mailService.sendOtpEmail({
      to: email,
      otp: otpCode,
      name: options.name
    });

    // Never return demoOtp or plaintext OTP in the API response
    return {
      success: true,
      message: 'Verification code sent to your email address.',
      resendCooldownSeconds: config.otp.resendCooldownSeconds,
      expiresInMinutes: config.otp.expiryMinutes,
      email
    };
  }

  /**
   * Verifies an email OTP code against active challenges for the email address
   * @param {string} rawEmail
   * @param {string} otp 5-digit code
   * @returns {Promise<boolean>}
   */
  async verifyEmailOtp(rawEmail, otp) {
    const email = normalizeEmail(rawEmail);
    if (!email) {
      const err = new Error('Valid email address is required.');
      err.statusCode = 400;
      throw err;
    }

    if (!otp || typeof otp !== 'string' || otp.trim().length !== 5) {
      const err = new Error('Verification code must be exactly 5 digits.');
      err.statusCode = 400;
      throw err;
    }

    const cleanOtp = otp.trim();
    const identifier = `email:${email}`;

    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        mobile: identifier,
        verifiedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!challenge) {
      const err = new Error('No active verification challenge found. Please request a new code.');
      err.statusCode = 400;
      throw err;
    }

    if (new Date() > new Date(challenge.expiresAt)) {
      const err = new Error('Verification code has expired. Please request a new one.');
      err.statusCode = 400;
      throw err;
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      const err = new Error('Maximum verification attempts exceeded. Please request a new code.');
      err.statusCode = 429;
      throw err;
    }

    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } }
    });

    // Strictly verify against the bcrypt hash in database - no demo OTP bypass
    const isValid = await this.compareOtp(cleanOtp, challenge.hashedOtp);

    if (!isValid) {
      const remainingAttempts = challenge.maxAttempts - (challenge.attempts + 1);
      const err = new Error(
        remainingAttempts > 0
          ? `Invalid verification code. ${remainingAttempts} attempts remaining.`
          : 'Invalid verification code. Maximum attempts reached. Please request a new code.'
      );
      err.statusCode = 400;
      throw err;
    }

    // Mark single-use
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { verifiedAt: new Date() }
    });

    return true;
  }
}

export const otpService = new OtpService();
export default otpService;
