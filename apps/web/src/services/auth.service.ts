import apiClient from '@/lib/api';

export interface UserSubscription {
  id: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  plan: {
    id: string;
    name: string;
    code: string;
    maxEvents: number;
    maxGuestsPerEvent: number;
  };
}

export interface User {
  id: string;
  mobile: string;
  name?: string | null;
  email?: string | null;
  role: 'HOST' | 'SUPER_ADMIN';
  subscription?: UserSubscription;
  isProfileComplete?: boolean;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  resendCooldownSeconds: number;
  demoOtp?: string;
  mobile: string;
}

export interface SendEmailOtpResponse {
  success: boolean;
  message: string;
  resendCooldownSeconds: number;
  demoOtp?: string;
  email: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  isProfileComplete?: boolean;
}

export interface SendOtpOptions {
  name?: string;
  email?: string;
  isRegistration?: boolean;
}

export interface SendEmailOtpOptions {
  name?: string;
  isRegistration?: boolean;
}

export interface VerifyOtpOptions {
  name?: string;
  email?: string;
}

export interface VerifyEmailOtpOptions {
  name?: string;
}

export const authService = {
  async sendOtp(mobile: string, options?: SendOtpOptions): Promise<SendOtpResponse> {
    const payload: Record<string, unknown> = { mobile };
    if (options) {
      if (options.name) payload.name = options.name;
      if (options.email) payload.email = options.email;
      if (options.isRegistration !== undefined) payload.isRegistration = options.isRegistration;
    }
    const res = await apiClient.post<SendOtpResponse>('/auth/send-otp', payload);
    return res.data;
  },

  async sendEmailOtp(email: string, options?: SendEmailOtpOptions): Promise<SendEmailOtpResponse> {
    const payload: Record<string, unknown> = { email };
    if (options) {
      if (options.name) payload.name = options.name;
      if (options.isRegistration !== undefined) payload.isRegistration = options.isRegistration;
    }
    const res = await apiClient.post<SendEmailOtpResponse>('/auth/send-email-otp', payload);
    return res.data;
  },

  async verifyOtp(mobile: string, otp: string, options?: VerifyOtpOptions): Promise<VerifyOtpResponse> {
    const payload: Record<string, unknown> = { mobile, otp };
    if (options) {
      if (options.name) payload.name = options.name;
      if (options.email) payload.email = options.email;
    }
    const res = await apiClient.post<VerifyOtpResponse>('/auth/verify-otp', payload);
    return res.data;
  },

  async verifyEmailOtp(email: string, otp: string, options?: VerifyEmailOtpOptions): Promise<VerifyOtpResponse> {
    const payload: Record<string, unknown> = { email, otp };
    if (options && options.name) {
      payload.name = options.name;
    }
    const res = await apiClient.post<VerifyOtpResponse>('/auth/verify-email-otp', payload);
    return res.data;
  },

  async completeProfile(name: string, email: string): Promise<User> {
    const res = await apiClient.post<{ success: boolean; user: User }>('/auth/complete-profile', {
      name,
      email
    });
    return res.data.user;
  },

  async getCurrentUser(): Promise<User> {
    const res = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
    return res.data.user;
  },

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await apiClient.post<{ success: boolean; accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken: token }
    );
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore server logout errors on teardown
    }
  }
};
