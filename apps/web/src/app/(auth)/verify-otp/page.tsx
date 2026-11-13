'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/features/auth/AuthContext';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobile = searchParams.get('mobile') || '';
  const { login } = useAuth();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 5) {
      setError('Please enter the complete 5-digit verification code');
      return;
    }

    if (!mobile) {
      setError('Missing mobile number. Please go back and enter your mobile number.');
      return;
    }

    setLoading(true);
    try {
      let regData: { name?: string; email?: string } | null = null;
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('pending_registration');
        if (stored) {
          try {
            regData = JSON.parse(stored);
          } catch {
            // Ignore parse errors
          }
        }
      }

      const response = await authService.verifyOtp(
        mobile,
        otp,
        regData ? { name: regData.name, email: regData.email } : undefined
      );

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pending_registration');
      }

      login(response.accessToken, response.refreshToken, response.user);

      // Check if profile is complete (requires both name and email)
      if (response.user.isProfileComplete === false || !response.user.name || !response.user.email) {
        router.push('/complete-profile');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Verification failed');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending || !mobile) return;
    setError('');
    setResendSuccess('');
    setResending(true);
    try {
      const res = await authService.sendOtp(mobile);
      setCountdown(res.resendCooldownSeconds || 60);
      setResendSuccess('A new verification code has been dispatched.');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to resend code';
      setError(errorMsg);
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-md border-surface-border">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl">Enter 5-Digit Code</CardTitle>
        <CardDescription>
          We sent a verification code to <span className="font-semibold text-charcoal-800">{mobile || 'your phone'}</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            label="Verification Code (5 Digits)"
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="12345"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ''));
              if (error) setError('');
            }}
            error={error}
            helperText="Development Demo OTP: 12345"
            className="text-center text-2xl tracking-[0.35em] font-mono font-bold"
            autoFocus
          />

          {resendSuccess && (
            <p className="text-xs text-emerald-600 font-medium text-center">{resendSuccess}</p>
          )}

          <Button type="submit" className="w-full" size="md" isLoading={loading}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Verify &amp; Continue
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-xs text-charcoal-500">
          <Link href="/login" className="flex items-center text-brand-600 hover:text-brand-800 font-medium">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Change Mobile
          </Link>

          <button
            type="button"
            disabled={countdown > 0 || resending}
            onClick={handleResend}
            className="text-charcoal-600 hover:text-charcoal-900 font-medium disabled:opacity-50"
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : resending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <Suspense fallback={<div className="text-sm text-charcoal-500">Loading verification...</div>}>
        <VerifyOtpContent />
      </Suspense>
    </div>
  );
}
