import authService from '../../services/auth.service.js';

export async function sendOtp(req, res, next) {
  try {
    const { mobile, name, email, isRegistration } = req.body;
    const result = await authService.requestOtp(mobile, { name, email, isRegistration });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function sendEmailOtp(req, res, next) {
  try {
    const { email, name, isRegistration } = req.body;
    const result = await authService.requestEmailOtp(email, { name, isRegistration });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const { mobile, otp, name, email } = req.body;
    const clientInfo = {
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      name,
      email
    };

    const result = await authService.verifyOtpAndLogin(mobile, otp, clientInfo);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmailOtp(req, res, next) {
  try {
    const { email, otp, name } = req.body;
    const clientInfo = {
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      name
    };

    const result = await authService.verifyEmailOtpAndLogin(email, otp, clientInfo);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function completeProfile(req, res, next) {
  try {
    const { name, email } = req.body;
    const user = await authService.completeProfile(req.user.id, { name, email });
    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(_req, res, next) {
  try {
    // Client clears local JWT tokens. Server responds cleanly with success.
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
}
