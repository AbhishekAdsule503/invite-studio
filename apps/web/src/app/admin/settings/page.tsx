'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Key,
  Clock,
  Phone,
  Mail,
  RefreshCw,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminService, SystemSettingItem } from '@/services/admin.service';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettingItem[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [trialDuration, setTrialDuration] = useState('30');
  const [gracePeriod, setGracePeriod] = useState('7');
  const [supportEmail, setSupportEmail] = useState('support@invitestudio.in');
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210');
  const [currency, setCurrency] = useState('INR');
  const [gatewayMode, setGatewayMode] = useState('sandbox');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await adminService.getSettings();
      setSettings(res.settings);
      setSettingsMap(res.settingsMap);

      if (res.settingsMap.trial_duration_days) setTrialDuration(res.settingsMap.trial_duration_days);
      if (res.settingsMap.grace_period_days) setGracePeriod(res.settingsMap.grace_period_days);
      if (res.settingsMap.support_email) setSupportEmail(res.settingsMap.support_email);
      if (res.settingsMap.support_phone) setSupportPhone(res.settingsMap.support_phone);
      if (res.settingsMap.currency) setCurrency(res.settingsMap.currency);
      if (res.settingsMap.payment_gateway_mode) setGatewayMode(res.settingsMap.payment_gateway_mode);
    } catch (err: any) {
      alert(err.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSavedSuccess(false);

      const payload = [
        { key: 'trial_duration_days', value: trialDuration },
        { key: 'grace_period_days', value: gracePeriod },
        { key: 'support_email', value: supportEmail },
        { key: 'support_phone', value: supportPhone },
        { key: 'currency', value: currency },
        { key: 'payment_gateway_mode', value: gatewayMode }
      ];

      await adminService.updateSettings(payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      loadSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-xs text-charcoal-500 animate-pulse">
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-charcoal-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="brand" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase font-bold">
              System Policies
            </Badge>
            <span className="text-charcoal-600">•</span>
            <span className="text-xs text-charcoal-400">Environment &amp; Billing</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
            Platform Settings &amp; Policies
          </h1>
          <p className="mt-1 text-xs text-charcoal-400">
            Configure free trial windows, grace periods, support coordinates, and payment gateway parameters.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved &amp; Audited</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Subscription Policies Card */}
        <div className="p-6 rounded-3xl bg-charcoal-900/60 border border-charcoal-800 space-y-5">
          <div className="flex items-center space-x-2 pb-2 border-b border-charcoal-800">
            <Clock className="w-4 h-4 text-purple-400" />
            <h3 className="font-display font-bold text-base text-white">
              Subscription &amp; Lifecycle Policies
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-charcoal-300 font-semibold mb-1">
                Default Free Trial Duration (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                required
                value={trialDuration}
                onChange={(e) => setTrialDuration(e.target.value)}
                className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono focus:outline-hidden focus:border-purple-500"
              />
              <span className="text-[10px] text-charcoal-500 mt-1 block">
                Automatic trial period applied to new hosts upon registration. Default is 30 days.
              </span>
            </div>

            <div>
              <label className="block text-charcoal-300 font-semibold mb-1">
                Post-Expiry Grace Period (Days)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                required
                value={gracePeriod}
                onChange={(e) => setGracePeriod(e.target.value)}
                className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono focus:outline-hidden focus:border-purple-500"
              />
              <span className="text-[10px] text-charcoal-500 mt-1 block">
                Window where warning banner is displayed before write actions are blocked. Default is 7 days.
              </span>
            </div>
          </div>
        </div>

        {/* Customer Support Coordinates Card */}
        <div className="p-6 rounded-3xl bg-charcoal-900/60 border border-charcoal-800 space-y-5">
          <div className="flex items-center space-x-2 pb-2 border-b border-charcoal-800">
            <Mail className="w-4 h-4 text-purple-400" />
            <h3 className="font-display font-bold text-base text-white">
              Official Support Coordinates
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-charcoal-300 font-semibold mb-1">Support Email Address</label>
              <input
                type="email"
                required
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-charcoal-300 font-semibold mb-1">Support Helpline Phone</label>
              <input
                type="text"
                required
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Payment Gateway Architecture & Environment Documentation */}
        <div className="p-6 rounded-3xl bg-charcoal-900/60 border border-charcoal-800 space-y-5">
          <div className="flex items-center space-x-2 pb-2 border-b border-charcoal-800">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <h3 className="font-display font-bold text-base text-white">
              Payment Gateway Architecture (Razorpay India)
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-charcoal-800/40 border border-charcoal-800 space-y-2">
              <span className="font-bold text-charcoal-200 block">Required Environment Variables:</span>
              <ul className="space-y-1 font-mono text-[11px] text-charcoal-400">
                <li><strong className="text-purple-300">RAZORPAY_KEY_ID:</strong> Public API Key provided in Razorpay Dashboard (e.g. rzp_test_...)</li>
                <li><strong className="text-purple-300">RAZORPAY_KEY_SECRET:</strong> Private Key Secret stored exclusively on backend</li>
                <li><strong className="text-purple-300">RAZORPAY_WEBHOOK_SECRET:</strong> Cryptographic secret for verifying webhook HMAC signatures</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-purple-200 space-y-1.5 leading-relaxed">
              <div className="flex items-center space-x-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Security &amp; Idempotency Compliance</span>
              </div>
              <p className="text-[11px] text-charcoal-300">
                All payment verification is cryptographically performed on the backend using HMAC-SHA256. Frontend checkout callbacks alone never activate a subscription. Webhooks are deduplicated by event ID to prevent duplicate activation.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-6 py-2.5 h-auto space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save System Settings'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
