'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, ShieldCheck, User, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { authService } from '@/services/auth.service';

function isValidIndianMobile(val: string): boolean {
  const cleaned = val.replace(/[\s-]/g, '');
  return /^(?:\+91|91|0)?[6-9]\d{9}$/.test(cleaned);
}

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');

  // Field error states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetErrors = () => {
    setNameError('');
    setEmailError('');
    setMobileError('');
    setGeneralError('');
  };

  const handleTabSwitch = (tab: 'register' | 'login') => {
    setActiveTab(tab);
    resetErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    const cleanMobile = mobile.trim();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    let hasError = false;

    if (activeTab === 'register') {
      if (!cleanName || cleanName.length < 2) {
        setNameError('Full name must be at least 2 characters');
        hasError = true;
      }

      if (!cleanEmail) {
        setEmailError('Email address is required');
        hasError = true;
      } else if (!isValidEmail(cleanEmail)) {
        setEmailError('Please enter a valid email address');
        hasError = true;
      }
    }

    if (!cleanMobile) {
      setMobileError('Mobile number is required');
      hasError = true;
    } else if (!isValidIndianMobile(cleanMobile)) {
      setMobileError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      if (activeTab === 'register') {
        const response = await authService.sendOtp(cleanMobile, {
          name: cleanName,
          email: cleanEmail,
          isRegistration: true
        });

        // Store registration metadata for OTP verification step
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            'pending_registration',
            JSON.stringify({
              name: cleanName,
              email: cleanEmail,
              mobile: response.mobile || cleanMobile
            })
          );
        }

        const targetMobile = response.mobile || cleanMobile;
        router.push(`/verify-otp?mobile=${encodeURIComponent(targetMobile)}`);
      } else {
        // Existing user login
        const response = await authService.sendOtp(cleanMobile, {
          isRegistration: false
        });

        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('pending_registration');
        }

        const targetMobile = response.mobile || cleanMobile;
        router.push(`/verify-otp?mobile=${encodeURIComponent(targetMobile)}`);
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Failed to send verification code');
      setGeneralError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-md border-surface-border">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl">INVITE STUDIO</CardTitle>
          <CardDescription>
            {activeTab === 'register'
              ? 'Create your host account with 30 days free trial'
              : 'Sign in to manage your events and invitations'}
          </CardDescription>

          {/* Tab Selector */}
          <div className="mt-4 p-1 bg-surface-warm rounded-xl grid grid-cols-2 text-xs font-semibold text-charcoal-600">
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'hover:text-charcoal-900'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'hover:text-charcoal-900'
              }`}
            >
              Sign In
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {generalError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'register' && (
              <>
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError('');
                    if (generalError) setGeneralError('');
                  }}
                  error={nameError}
                  autoComplete="name"
                  autoFocus
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="priya@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                    if (generalError) setGeneralError('');
                  }}
                  error={emailError}
                  autoComplete="email"
                />
              </>
            )}

            <Input
              label={activeTab === 'register' ? 'Mobile Number (India)' : 'Registered Mobile Number'}
              type="tel"
              placeholder="e.g. 9876543210"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                if (mobileError) setMobileError('');
                if (generalError) setGeneralError('');
              }}
              error={mobileError}
              helperText="We will send a 5-digit verification code. Demo code in dev: 12345"
              autoComplete="tel"
              autoFocus={activeTab === 'login'}
            />

            <Button type="submit" className="w-full mt-2" size="md" isLoading={loading}>
              <span>{activeTab === 'register' ? 'Create Account & Send Code' : 'Send Verification Code'}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-4 text-center">
            {activeTab === 'register' ? (
              <p className="text-xs text-charcoal-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('login')}
                  className="text-brand-600 font-semibold hover:underline"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p className="text-xs text-charcoal-500">
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('register')}
                  className="text-brand-600 font-semibold hover:underline"
                >
                  Create Account
                </button>
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-surface-border text-center text-xs text-charcoal-500 space-y-2">
            <p className="flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
              Isolated multi-tenant account security
            </p>
            <p>
              By continuing, you agree to INVITE STUDIO&apos;s privacy terms and host policies.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
