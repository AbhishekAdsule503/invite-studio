import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../database/prisma.js';
import { config } from '../config/env.js';

export class OtpService {
  /**
   * Generates a 5-digit numeric OTP
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

    // In a live environment with an SMS provider (e.g. Twilio/Msg91), dispatch SMS here.
    const response = {
      success: true,
      message: 'Verification code sent successfully.',
      resendCooldownSeconds: config.otp.resendCooldownSeconds,
      expiresInMinutes: config.otp.expiryMinutes
    };

    // Include demo OTP in development mode when enabled for frictionless testing
    if (config.isDevelopment && config.otp.enableDemoOtp) {
      response.demoOtp = otpCode;
    }

    return response;
  }

  /**
   * Verifies an OTP code against active challenges for the mobile number
   * @param {string} mobile E.164 normalized phone number
   * @param {string} otp 5-digit code
   * @returns {Promise<boolean>}
   */
  async verifyOtp(mobile, otp) {
    // 5-digit verification code check
    if (!otp || typeof otp !== 'string' || otp.trim().length !== 5) {
      const err = new Error('Verification code must be exactly 5 digits.');
      err.statusCode = 400;
      throw err;
    }

    const cleanOtp = otp.trim();

    // Check if demo OTP is submitted in production
    if (config.isProduction && cleanOtp === config.otp.demoOtp) {
      const err = new Error('Demo verification codes are not permitted in production environment.');
      err.statusCode = 400;
      throw err;
    }

    // Find the latest unverified challenge for this mobile number
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

    // Check expiration
    if (new Date() > new Date(challenge.expiresAt)) {
      const err = new Error('Verification code has expired. Please request a new one.');
      err.statusCode = 400;
      throw err;
    }

    // Check maximum attempts limit
    if (challenge.attempts >= challenge.maxAttempts) {
      const err = new Error('Maximum verification attempts exceeded. Please request a new code.');
      err.statusCode = 429;
      throw err;
    }

    // Increment attempts count
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } }
    });

    // Verify OTP match:
    // 1. In dev with ENABLE_DEMO_OTP=true, accept demoOtp (12345)
    // 2. Otherwise verify bcrypt hash
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

    // Mark challenge as verified
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { verifiedAt: new Date() }
    });

    return true;
  }
}

export const otpService = new OtpService();
export default otpService;
