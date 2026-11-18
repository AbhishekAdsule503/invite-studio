import jwt from 'jsonwebtoken';
import { normalizePhone, phoneRegex, normalizeEmail } from '@smart-invitation/shared';
import prisma from '../database/prisma.js';
import { config } from '../config/env.js';
import otpService from './otp.service.js';

export class AuthService {
  /**
   * Dispatches OTP challenge to normalized mobile
   */
  async requestOtp(rawMobile, options = {}) {
    const mobile = normalizePhone(rawMobile);
    if (!mobile || !phoneRegex.test(mobile)) {
      const err = new Error('Please provide a valid mobile number in standard format.');
      err.statusCode = 400;
      throw err;
    }

    const { name, email, isRegistration } = options;
    const isReg = isRegistration === true || isRegistration === 'true';

    // If new user registration, enforce strict field validation and uniqueness upfront
    if (isReg) {
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        const err = new Error('Full name is required (minimum 2 characters).');
        err.statusCode = 400;
        throw err;
      }

      if (!email || typeof email !== 'string' || !email.trim()) {
        const err = new Error('Email address is required.');
        err.statusCode = 400;
        throw err;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        const err = new Error('Please provide a valid email address.');
        err.statusCode = 400;
        throw err;
      }

      const normalizedEmail = normalizeEmail(email);

      // Check duplicate email
      const existingUserWithEmail = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
      });
      if (existingUserWithEmail) {
        const err = new Error('An account with this email address already exists. Please use a different email or sign in.');
        err.statusCode = 400;
        throw err;
      }

      // Check if mobile already exists for registration
      const existingUserWithMobile = await prisma.user.findUnique({
        where: { mobile }
      });
      if (existingUserWithMobile) {
        const err = new Error('An account with this mobile number already exists. Please sign in instead.');
        err.statusCode = 400;
        throw err;
      }
    } else if (email && typeof email === 'string' && email.trim()) {
      // Optional email check when not in registration mode
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        const err = new Error('Please provide a valid email address.');
        err.statusCode = 400;
        throw err;
      }
      const normalizedEmail = normalizeEmail(email);
      const existingUserWithEmail = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
      });
      if (existingUserWithEmail) {
        const err = new Error('An account with this email address already exists. Please use a different email or sign in.');
        err.statusCode = 400;
        throw err;
      }
    }

    const result = await otpService.sendOtp(mobile);
    return {
      ...result,
      mobile
    };
  }

  /**
   * Dispatches Email OTP challenge to normalized email address
   */
  async requestEmailOtp(rawEmail, options = {}) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      const err = new Error('Please provide a valid email address.');
      err.statusCode = 400;
      throw err;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail.trim())) {
      const err = new Error('Please provide a valid email address.');
      err.statusCode = 400;
      throw err;
    }

    const email = normalizeEmail(rawEmail);
    const { name, isRegistration } = options;
    const isReg = isRegistration === true || isRegistration === 'true';

    // If new user registration, check if email already exists
    if (isReg) {
      if (name && (typeof name !== 'string' || name.trim().length < 2)) {
        const err = new Error('Full name must be at least 2 characters.');
        err.statusCode = 400;
        throw err;
      }

      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
      });

      if (existingUser) {
        const err = new Error('An account with this email address already exists. Please sign in instead.');
        err.statusCode = 400;
        throw err;
      }
    } else {
      // Sign-in mode: verify account exists
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
      });

      if (!existingUser) {
        const err = new Error('No account found with this email address. Please register first.');
        err.statusCode = 404;
        throw err;
      }

      if (!existingUser.isActive) {
        const err = new Error('Your account has been deactivated. Please contact support.');
        err.statusCode = 403;
        throw err;
      }
    }

    const result = await otpService.sendEmailOtp(email, { name });
    return {
      ...result,
      email
    };
  }

  /**
   * Verifies Email OTP, registers or signs in user, and generates JWT tokens
   */
  async verifyEmailOtpAndLogin(rawEmail, otp, clientInfo = {}) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      const err = new Error('Valid email address is required.');
      err.statusCode = 400;
      throw err;
    }

    const email = normalizeEmail(rawEmail);

    // Verify OTP against active challenges for this email
    await otpService.verifyEmailOtp(email, otp);

    // Find user by normalized email
    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      const formattedName =
        clientInfo.name && typeof clientInfo.name === 'string' && clientInfo.name.trim().length >= 2
          ? clientInfo.name.trim()
          : null;

      // Find or create default Trial plan
      let trialPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: 'TRIAL' }
      });

      if (!trialPlan) {
        trialPlan = await prisma.subscriptionPlan.create({
          data: {
            name: 'Free Trial',
            code: 'TRIAL',
            priceYearly: 0,
            currency: 'INR',
            maxEvents: 3,
            maxGuestsPerEvent: 50,
            canUploadCustomTemplates: false,
            isActive: true
          }
        });
      }

      // Create user with verified email
      user = await prisma.user.create({
        data: {
          email,
          name: formattedName,
          emailVerifiedAt: new Date(),
          role: 'HOST',
          isActive: true,
          subscription: {
            create: {
              planId: trialPlan.id,
              status: 'TRIAL',
              startsAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          }
        },
        include: {
          subscription: {
            include: { plan: true }
          }
        }
      });
    } else {
      // Existing user: mark email verified if not yet set, update name if provided and missing
      const updateData = {};
      if (!user.emailVerifiedAt) {
        updateData.emailVerifiedAt = new Date();
      }
      if (!user.name && clientInfo.name && typeof clientInfo.name === 'string' && clientInfo.name.trim().length >= 2) {
        updateData.name = clientInfo.name.trim();
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: {
            subscription: {
              include: { plan: true }
            }
          }
        });
      }
    }

    if (!user.isActive) {
      const err = new Error('Your account has been deactivated. Please contact support.');
      err.statusCode = 403;
      throw err;
    }

    const isProfileComplete = Boolean(
      user.name && user.name.trim().length > 0
    );

    // Generate JWT access & refresh tokens
    const tokenPayload = {
      userId: user.id,
      mobile: user.mobile || null,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(tokenPayload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: isNewUser ? 'USER_REGISTER_EMAIL' : 'USER_LOGIN_EMAIL',
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: clientInfo.ip || null,
        userAgent: clientInfo.userAgent || null,
        metadata: JSON.stringify({
          email: user.email,
          name: user.name,
          isNewUser,
          isProfileComplete
        })
      }
    });

    const sanitizedUser = {
      id: user.id,
      mobile: user.mobile || null,
      name: user.name,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      role: user.role,
      subscription: user.subscription,
      isProfileComplete
    };

    return {
      success: true,
      user: sanitizedUser,
      accessToken,
      refreshToken,
      isNewUser,
      isProfileComplete
    };
  }

  /**
   * Verifies OTP, registers or signs in user, and generates JWT tokens
   */
  async verifyOtpAndLogin(rawMobile, otp, clientInfo = {}) {
    const mobile = normalizePhone(rawMobile);
    if (!mobile || !phoneRegex.test(mobile)) {
      const err = new Error('Invalid mobile number format.');
      err.statusCode = 400;
      throw err;
    }

    // Verify OTP against active challenges
    await otpService.verifyOtp(mobile, otp);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { mobile },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      // Format name and email from clientInfo if provided
      const formattedName = clientInfo.name && typeof clientInfo.name === 'string' && clientInfo.name.trim().length >= 2
        ? clientInfo.name.trim()
        : null;

      let formattedEmail = null;
      if (clientInfo.email && typeof clientInfo.email === 'string' && clientInfo.email.trim()) {
        const normalized = normalizeEmail(clientInfo.email);
        const duplicateEmail = await prisma.user.findFirst({
          where: { email: { equals: normalized, mode: 'insensitive' } }
        });
        if (duplicateEmail) {
          const err = new Error('An account with this email address already exists. Please use a different email or sign in.');
          err.statusCode = 400;
          throw err;
        }
        formattedEmail = normalized;
      }

      // Find or create default Trial plan
      let trialPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: 'TRIAL' }
      });

      if (!trialPlan) {
        trialPlan = await prisma.subscriptionPlan.create({
          data: {
            name: 'Free Trial',
            code: 'TRIAL',
            priceYearly: 0,
            currency: 'INR',
            maxEvents: 3,
            maxGuestsPerEvent: 50,
            canUploadCustomTemplates: false,
            isActive: true
          }
        });
      }

      // Create user and initial 30-day trial subscription
      user = await prisma.user.create({
        data: {
          mobile,
          name: formattedName,
          email: formattedEmail,
          role: 'HOST',
          isActive: true,
          subscription: {
            create: {
              planId: trialPlan.id,
              status: 'TRIAL',
              startsAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          }
        },
        include: {
          subscription: {
            include: { plan: true }
          }
        }
      });
    } else {
      // Existing user: check if name/email were provided and can populate missing fields
      const updateData = {};
      if (!user.name && clientInfo.name && typeof clientInfo.name === 'string' && clientInfo.name.trim().length >= 2) {
        updateData.name = clientInfo.name.trim();
      }
      if (!user.email && clientInfo.email && typeof clientInfo.email === 'string' && clientInfo.email.trim()) {
        const norm = normalizeEmail(clientInfo.email);
        const duplicateEmail = await prisma.user.findFirst({
          where: { email: { equals: norm, mode: 'insensitive' }, NOT: { id: user.id } }
        });
        if (!duplicateEmail) {
          updateData.email = norm;
        }
      }
      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: {
            subscription: {
              include: { plan: true }
            }
          }
        });
      }
    }

    if (!user.isActive) {
      const err = new Error('Your account has been deactivated. Please contact support.');
      err.statusCode = 403;
      throw err;
    }

    const isProfileComplete = Boolean(
      user.name && user.name.trim().length > 0 &&
      user.email && user.email.trim().length > 0
    );

    // Generate JWT access & refresh tokens
    const tokenPayload = {
      userId: user.id,
      mobile: user.mobile,
      role: user.role
    };

    const accessToken = jwt.sign(tokenPayload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: isNewUser ? 'USER_REGISTER_MOBILE' : 'USER_LOGIN_MOBILE',
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: clientInfo.ip || null,
        userAgent: clientInfo.userAgent || null,
        metadata: JSON.stringify({
          mobile: user.mobile,
          name: user.name,
          email: user.email,
          isNewUser,
          isProfileComplete
        })
      }
    });

    const sanitizedUser = {
      id: user.id,
      mobile: user.mobile,
      name: user.name,
      email: user.email,
      role: user.role,
      subscription: user.subscription,
      isProfileComplete
    };

    return {
      success: true,
      user: sanitizedUser,
      accessToken,
      refreshToken,
      isNewUser,
      isProfileComplete
    };
  }

  /**
   * Completes user profile with required name and email
   */
  async completeProfile(userId, { name, email }) {
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      const err = new Error('Full name is required (minimum 2 characters).');
      err.statusCode = 400;
      throw err;
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const effectiveEmail = (email && typeof email === 'string' && email.trim()) ? normalizeEmail(email) : currentUser.email;

    if (!effectiveEmail) {
      const err = new Error('Email address is required.');
      err.statusCode = 400;
      throw err;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(effectiveEmail)) {
      const err = new Error('Please provide a valid email address.');
      err.statusCode = 400;
      throw err;
    }

    // Ensure email is not already in use by another user
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: { equals: effectiveEmail, mode: 'insensitive' },
        NOT: { id: userId }
      }
    });

    if (existingEmail) {
      const err = new Error('An account with this email address already exists. Please use a different email.');
      err.statusCode = 400;
      throw err;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        email: effectiveEmail
      },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'USER_PROFILE_COMPLETED',
        resourceType: 'User',
        resourceId: userId,
        metadata: JSON.stringify({
          name: updatedUser.name,
          email: updatedUser.email
        })
      }
    });

    return {
      id: updatedUser.id,
      mobile: updatedUser.mobile,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      subscription: updatedUser.subscription,
      isProfileComplete: true
    };
  }

  /**
   * Refreshes an expired access token using a valid refresh token
   */
  async refreshAccessToken(token) {
    if (!token) {
      const err = new Error('Refresh token is required.');
      err.statusCode = 400;
      throw err;
    }

    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.isActive) {
        const err = new Error('User session is invalid or user is inactive.');
        err.statusCode = 401;
        throw err;
      }

      const newAccessToken = jwt.sign(
        { userId: user.id, mobile: user.mobile, role: user.role },
        config.jwt.accessSecret,
        { expiresIn: config.jwt.accessExpiresIn }
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch {
      const err = new Error('Invalid or expired refresh token.');
      err.statusCode = 401;
      throw err;
    }
  }

  /**
   * Fetches current authenticated user profile
   */
  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mobile: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        subscription: {
          select: {
            id: true,
            status: true,
            startsAt: true,
            expiresAt: true,
            plan: {
              select: {
                id: true,
                name: true,
                code: true,
                maxEvents: true,
                maxGuestsPerEvent: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const isProfileComplete = Boolean(
      user.name && user.name.trim().length > 0 &&
      user.email && user.email.trim().length > 0
    );

    return {
      ...user,
      isProfileComplete
    };
  }
}

export const authService = new AuthService();
export default authService;
