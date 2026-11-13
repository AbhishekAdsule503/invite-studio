'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, ArrowRight, ShieldCheck, Phone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthContext';
import { authService } from '@/services/auth.service';

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user && user.name && user.email) {
        // Profile is already complete
        router.replace('/dashboard');
      } else if (user) {
        // Prepopulate if partial data exists
        if (user.name) setName(user.name);
        if (user.email) setEmail(user.email);
      }
    }
  }, [loading, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    setEmailError('');
    setGeneralError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    let hasError = false;

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

    if (hasError) return;

    setSubmitting(true);
    try {
      const updatedUser = await authService.completeProfile(cleanName, cleanEmail);
      updateUser(updatedUser);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Failed to save profile');
      setGeneralError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <p className="text-xs text-charcoal-500 font-medium animate-pulse">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-md border-surface-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 mb-3">
            <UserCheck className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please tell us your name and email to finish setting up your INVITE STUDIO host account.
          </CardDescription>

          {/* Verified Mobile Number Indicator */}
          {user?.mobile && (
            <div className="mt-3 flex items-center justify-center space-x-2">
              <Badge variant="success" className="px-3 py-1 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified: {user.mobile}</span>
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {generalError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              helperText="We will send event notifications and RSVP alerts to this email"
              autoComplete="email"
            />

            <Button type="submit" className="w-full mt-2" size="md" isLoading={submitting}>
              <span>Complete Profile &amp; Continue</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-surface-border text-center text-xs text-charcoal-500 space-y-2">
            <p className="flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
              Tenant isolation &amp; account privacy guaranteed
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

