'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Crown,
  Sparkles,
  Check,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Users,
  FileText,
  LifeBuoy,
  X,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  subscriptionService,
  CurrentSubscriptionResponse
} from '@/services/subscription.service';

export default function SubscriptionOverviewPage() {
  const [data, setData] = useState<CurrentSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Support ticket modal state
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('BILLING');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await subscriptionService.getCurrent();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    try {
      setTicketSubmitting(true);
      await subscriptionService.createSupportTicket({
        subject: ticketSubject,
        message: ticketMessage,
        category: ticketCategory,
        priority: 'MEDIUM'
      });
      setTicketSuccess(true);
      setTimeout(() => {
        setSupportModalOpen(false);
        setTicketSuccess(false);
        setTicketSubject('');
        setTicketMessage('');
      }, 1800);
    } catch (err: any) {
      alert(err.message || 'Failed to submit support request.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-8 bg-surface-warm rounded-lg w-64" />
        <div className="h-32 bg-surface-warm rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-surface-warm rounded-2xl" />
          <div className="h-44 bg-surface-warm rounded-2xl" />
          <div className="h-44 bg-surface-warm rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-charcoal-900">Unable to Load Subscription</h2>
        <p className="text-sm text-charcoal-500 mt-1">{error || 'Unknown error occurred'}</p>
        <Button onClick={fetchSubscription} className="mt-4" variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const { plan, usage } = data;
  const isGrace = data.inGracePeriod;
  const isExpired = data.isExpired;
  const isMonthly = data.billingCycle === 'MONTHLY';
  const isFree = plan.code === 'FREE' || (plan.priceMonthly === 0 && plan.priceYearly === 0);

  const displayPrice = isFree
    ? '₹0'
    : isMonthly
    ? plan.priceMonthly === 0
      ? '₹0'
      : `₹${((plan.priceMonthly || 0) / 100).toLocaleString('en-IN')}`
    : plan.priceYearly === 0
    ? '₹0'
    : `₹${((plan.priceYearly || 0) / 100).toLocaleString('en-IN')}`;

  const pricePeriod = isFree ? '/lifetime' : isMonthly ? '/month' : '/year';
  const billingLabel = isFree
    ? 'Complimentary'
    : isMonthly
    ? 'Monthly Price'
    : 'Annual Price';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Host Membership
            </span>
            <span className="text-charcoal-400">•</span>
            <span className="text-xs text-charcoal-600 font-medium">
              {isFree ? 'Free Plan' : isMonthly ? 'Monthly Plan' : 'Annual Plan'}
            </span>
          </div>
          <h1 className="font-display font-extrabold text-3xl text-charcoal-900 tracking-tight mt-1">
            Subscription &amp; Usage
          </h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Monitor celebration quotas, active limits, and billing for your account.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/subscription/history">
            <Button variant="outline" size="sm" className="space-x-1.5">
              <FileText className="w-4 h-4 text-charcoal-500" />
              <span>Billing History</span>
            </Button>
          </Link>
          <Link href="/subscription/plans">
            <Button variant="primary" size="sm" className="space-x-1.5 bg-brand-600 hover:bg-brand-700">
              <Sparkles className="w-4 h-4" />
              <span>{isExpired ? 'Renew Plan' : 'Upgrade Plan'}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Expiry / Grace Period Warning Banner */}
      {isExpired && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-900">Subscription Expired</h4>
            <p className="text-xs text-red-700 mt-0.5">
              Your subscription expired on {new Date(data.expiresAt).toLocaleDateString()}. Creating new events, adding guests, or sending invitations is paused. All your past events, guest lists, and RSVP counts remain safe.
            </p>
            <div className="mt-3">
              <Link href="/subscription/plans">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 h-auto">
                  Renew or Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {isGrace && !isExpired && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900">Grace Period Active</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Your plan expired recently. You have a {data.graceDaysRemaining}-day grace period remaining before write actions are restricted. Renew now to avoid interruption.
            </p>
            <div className="mt-3">
              <Link href="/subscription/plans">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 h-auto">
                  Renew Plan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#2D0D19] via-[#200A12] to-[#14040A] text-white p-6 sm:p-8 shadow-xl border border-[#D8B66E]/25 relative overflow-hidden">
        {/* Soft atmospheric ambient glow */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-[#D8B66E]/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 -mb-20 w-72 h-72 rounded-full bg-[#5C2032]/35 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                {data.status === 'TRIAL' ? '30-Day Free Trial' : `${data.status} Membership`}
              </span>

              {!isFree && (
                <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border bg-[#D8B66E]/15 text-[#E5C378] border-[#D8B66E]/30">
                  {isMonthly ? 'Monthly Plan' : 'Annual Plan'}
                </span>
              )}

              {plan.isPopular && (
                <span className="inline-flex items-center text-[11px] font-semibold tracking-wider px-3 py-1 rounded-full border bg-rose-500/20 text-rose-200 border-rose-500/30">
                  Most Popular
                </span>
              )}
            </div>

            <div>
              <h2 className="font-display font-black text-3xl sm:text-4xl !text-white tracking-tight drop-shadow-xs">
                {plan.name}
              </h2>
              <p className="text-sm text-[#F4E7EB] mt-1.5 max-w-xl leading-relaxed">
                {plan.description || 'Configurable celebration plan tailored for Indian family hosts.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#E7CFD7] pt-1">
              <div className="flex items-center space-x-1.5 bg-black/25 px-3 py-1.5 rounded-xl border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-[#D8B66E]" />
                <span>
                  Expires: <strong className="!text-white">{new Date(data.expiresAt).toLocaleDateString()}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-1.5 bg-black/25 px-3 py-1.5 rounded-xl border border-white/10">
                <Clock className="w-3.5 h-3.5 text-[#D8B66E]" />
                <span>
                  {data.daysRemaining > 0 ? (
                    <strong className="text-emerald-300 font-semibold">{data.daysRemaining} days remaining</strong>
                  ) : (
                    <strong className="text-rose-400 font-semibold">Expired</strong>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end justify-between border-t md:border-t-0 md:border-l border-white/10 pt-5 md:pt-0 md:pl-8 shrink-0">
            <div className="text-left md:text-right">
              <span className="text-[11px] uppercase tracking-wider text-[#D8B66E] block font-semibold">
                {billingLabel}
              </span>
              <div className="flex items-baseline md:justify-end space-x-1.5 mt-1">
                <span className="font-display font-black text-3xl sm:text-4xl !text-white tracking-tight">
                  {displayPrice}
                </span>
                <span className="text-xs text-[#E7CFD7] font-medium">{pricePeriod}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center space-x-2">
              <Link href="/subscription/plans">
                <Button className="bg-[#D8B66E] hover:bg-[#C29C50] text-[#1A060E] font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-1.5">
                  <span>Explore All Plans</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quotas & Live Consumption Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="font-display font-bold text-xl text-charcoal-900 tracking-tight">
            Plan Quotas &amp; Active Usage
          </h3>
          {data.billingPeriod && (
            <span className="text-xs text-charcoal-500 font-medium">
              Billing Period: <strong className="text-charcoal-700">{new Date(data.billingPeriod.start).toLocaleDateString()} – {new Date(data.billingPeriod.end).toLocaleDateString()}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Saved Contacts Card */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                  Saved Contacts
                </span>
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-display font-black text-2xl sm:text-3xl text-charcoal-900">
                  {(usage.contacts?.used ?? usage.permanentGuests.used).toLocaleString()}
                </span>
                <span className="text-sm font-medium text-charcoal-400">
                  / {(usage.contacts?.limit ?? usage.permanentGuests.limit).toLocaleString()} contacts
                </span>
              </div>
              <p className="text-xs text-charcoal-500 mt-1">
                {(usage.contacts?.used ?? usage.permanentGuests.used)} / {(usage.contacts?.limit ?? usage.permanentGuests.limit)} contacts used
              </p>
            </div>

            <div className="mt-4">
              <div className="w-full bg-surface-warm h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (usage.contacts?.percentage ?? usage.permanentGuests.percentage) >= 90
                      ? 'bg-red-500'
                      : (usage.contacts?.percentage ?? usage.permanentGuests.percentage) >= 70
                      ? 'bg-amber-500'
                      : 'bg-brand-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.contacts?.percentage ?? usage.permanentGuests.percentage)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-charcoal-400 mt-1.5">
                <span>{usage.contacts?.percentage ?? usage.permanentGuests.percentage}% filled</span>
                <span>{(usage.contacts?.remaining ?? usage.permanentGuests.remaining)} left</span>
              </div>
            </div>
          </Card>

          {/* 2. Monthly Campaigns Card */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                  Monthly Campaigns
                </span>
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-display font-black text-2xl sm:text-3xl text-charcoal-900">
                  {(usage.campaigns?.used ?? usage.events.used)}
                </span>
                <span className="text-sm font-medium text-charcoal-400">
                  / {(usage.campaigns?.limit ?? usage.events.limit)} campaigns
                </span>
              </div>
              <p className="text-xs text-charcoal-500 mt-1">
                {(usage.campaigns?.used ?? usage.events.used)} / {(usage.campaigns?.limit ?? usage.events.limit)} used this billing cycle
              </p>
            </div>

            <div className="mt-4">
              <div className="w-full bg-surface-warm h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (usage.campaigns?.percentage ?? usage.events.percentage) >= 90
                      ? 'bg-red-500'
                      : (usage.campaigns?.percentage ?? usage.events.percentage) >= 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.campaigns?.percentage ?? usage.events.percentage)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-charcoal-400 mt-1.5">
                <span>{usage.campaigns?.percentage ?? usage.events.percentage}% used</span>
                <span>{(usage.campaigns?.remaining ?? usage.events.remaining)} remaining</span>
              </div>
            </div>
          </Card>

          {/* 3. Automated WhatsApp Messages Card */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                  Automated WhatsApp
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-display font-black text-2xl sm:text-3xl text-charcoal-900">
                  {usage.automatedWhatsApp?.used ?? 0}
                </span>
                <span className="text-sm font-medium text-charcoal-400">
                  / {usage.automatedWhatsApp?.limit ?? 0} msgs
                </span>
              </div>
              <p className="text-xs text-charcoal-500 mt-1">
                {(usage.automatedWhatsApp?.limit ?? 0) > 0
                  ? `${usage.automatedWhatsApp?.used ?? 0} / ${usage.automatedWhatsApp?.limit} messages used`
                  : 'Manual click-to-chat sharing active'}
              </p>
            </div>

            <div className="mt-4">
              <div className="w-full bg-surface-warm h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (usage.automatedWhatsApp?.percentage ?? 0) >= 90
                      ? 'bg-red-500'
                      : 'bg-brand-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.automatedWhatsApp?.percentage ?? 0)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-charcoal-400 mt-1.5">
                <span>{usage.automatedWhatsApp?.percentage ?? 0}% quota used</span>
                <span>Max: {usage.automatedWhatsApp?.limit ?? 0}/mo</span>
              </div>
            </div>
          </Card>

          {/* 4. Family Members Access Card */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                  Family Workspace
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-display font-black text-2xl sm:text-3xl text-charcoal-900">
                  {usage.familyMembers?.used ?? 1}
                </span>
                <span className="text-sm font-medium text-charcoal-400">
                  / {usage.familyMembers?.limit ?? 1} members
                </span>
              </div>
              <p className="text-xs text-charcoal-500 mt-1">
                {usage.familyMembers?.used ?? 1} / {usage.familyMembers?.limit ?? 1} active family accounts
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
              <span className="text-charcoal-600 font-medium">Shared Access:</span>
              <Badge variant={(usage.familyMembers?.limit ?? 1) > 1 ? 'success' : 'default'}>
                {(usage.familyMembers?.limit ?? 1) > 1 ? 'Enabled' : 'Owner Only'}
              </Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* Plan Features Included */}
      <Card className="p-6">
        <h4 className="font-display font-bold text-lg text-charcoal-900 mb-4">
          Features Included in {plan.name}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {plan.features.map((feat, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-xs text-charcoal-700">
              <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <span>{feat}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-5 border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-charcoal-500">
            Need help or custom guest capacity for an ultra-grand celebration?
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSupportModalOpen(true)}
            className="space-x-1.5 shrink-0"
          >
            <LifeBuoy className="w-4 h-4 text-brand-600" />
            <span>Contact Support</span>
          </Button>
        </div>
      </Card>

      {/* Support Ticket Modal */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-lg text-charcoal-900">
                  Submit Support Ticket
                </h3>
              </div>
              <button
                onClick={() => setSupportModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ticketSuccess ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-charcoal-900">Ticket Submitted</h4>
                <p className="text-xs text-charcoal-500">
                  Our customer care team has received your inquiry and will reply shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal-700 mb-1">Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full text-xs rounded-xl border border-surface-border px-3 py-2 bg-surface-card focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="BILLING">Billing &amp; Subscription</option>
                    <option value="TECHNICAL">Technical Issue</option>
                    <option value="FEATURE">Feature Request</option>
                    <option value="GENERAL">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-charcoal-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief summary of your question"
                    className="w-full text-xs rounded-xl border border-surface-border px-3 py-2 bg-surface-card focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-charcoal-700 mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Please describe your question or issue in detail..."
                    className="w-full text-xs rounded-xl border border-surface-border px-3 py-2 bg-surface-card focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSupportModalOpen(false)}
                    disabled={ticketSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={ticketSubmitting}
                    className="bg-brand-600 hover:bg-brand-700 text-white"
                  >
                    {ticketSubmitting ? 'Submitting...' : 'Send Request'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
