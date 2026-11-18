'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Search,
  Filter,
  CreditCard,
  History,
  Edit2,
  Calendar,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminService, AdminPaymentTransactionItem } from '@/services/admin.service';
import { SubscriptionPlan } from '@/services/subscription.service';

export default function AdminSubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'payments'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<AdminPaymentTransactionItem[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Manual Adjustment Modal
  const [adjustSub, setAdjustSub] = useState<any | null>(null);
  const [targetPlanId, setTargetPlanId] = useState('');
  const [targetStatus, setTargetStatus] = useState('ACTIVE');
  const [targetExpiresAt, setTargetExpiresAt] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const loadSubscriptions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const [subsRes, plansRes] = await Promise.all([
        adminService.listSubscriptions({
          search: activeSearch || undefined,
          status: statusFilter || undefined,
          planId: planFilter || undefined,
          page,
          limit: 20
        }),
        adminService.listPlans()
      ]);
      setSubscriptions(subsRes.subscriptions);
      setPagination(subsRes.pagination);
      setPlans(plansRes);
    } catch (err: any) {
      alert(err.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [activeSearch, statusFilter, planFilter]);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.listPayments({ page: 1, limit: 30 });
      setPayments(res.payments);
    } catch (err: any) {
      alert(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      loadSubscriptions(1);
    } else {
      loadPayments();
    }
  }, [activeTab, loadSubscriptions, loadPayments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
  };

  const openAdjustModal = (sub: any) => {
    setAdjustSub(sub);
    setTargetPlanId(sub.planId);
    setTargetStatus(sub.status);
    setTargetExpiresAt(new Date(sub.expiresAt).toISOString().split('T')[0]);
    setAdjustReason('');
    setAdjustNotes('');
  };

  const handleManualAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustSub || !adjustReason.trim()) return;

    try {
      setAdjustSubmitting(true);
      await adminService.adjustSubscription(adjustSub.id, {
        planId: targetPlanId,
        status: targetStatus,
        expiresAt: targetExpiresAt ? new Date(targetExpiresAt).toISOString() : undefined,
        reason: adjustReason.trim(),
        notes: adjustNotes.trim() || undefined
      });
      setAdjustSub(null);
      loadSubscriptions(pagination.page);
    } catch (err: any) {
      alert(err.message || 'Failed to apply adjustment');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-charcoal-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-500/30 text-[10px] uppercase font-bold">
              Subscription Control
            </Badge>
            <span className="text-charcoal-600">•</span>
            <span className="text-xs text-charcoal-400">Audited Overrides</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
            Subscriptions &amp; Verified Payments
          </h1>
          <p className="mt-1 text-xs text-charcoal-400">
            Monitor host memberships, review verified Razorpay transactions, and perform authorized plan adjustments.
          </p>
        </div>

        <Button
          onClick={() => (activeTab === 'subscriptions' ? loadSubscriptions(pagination.page) : loadPayments())}
          variant="outline"
          size="sm"
          className="border-charcoal-800 text-charcoal-300 hover:text-white hover:bg-charcoal-800 text-xs space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-charcoal-800 space-x-6 text-xs">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'subscriptions'
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent text-charcoal-400 hover:text-white'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Host Subscriptions ({pagination.total})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent text-charcoal-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Verified Payment Transactions</span>
        </button>
      </div>

      {/* TAB 1: Subscriptions List */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center space-x-2 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-charcoal-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user mobile or name..."
                  className="w-full text-xs rounded-xl bg-charcoal-900 border border-charcoal-800 pl-9 pr-3 py-2 text-white placeholder-charcoal-500 focus:outline-hidden focus:border-brand-500"
                />
              </div>
              <Button type="submit" size="sm" className="bg-charcoal-800 text-white text-xs hover:bg-charcoal-700">
                Search
              </Button>
            </form>

            <div className="flex items-center space-x-3 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl bg-charcoal-900 border border-charcoal-800 px-3 py-2 text-charcoal-300 focus:outline-hidden focus:border-brand-500 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="rounded-xl bg-charcoal-900 border border-charcoal-800 px-3 py-2 text-charcoal-300 focus:outline-hidden focus:border-brand-500 text-xs"
              >
                <option value="">All Plans</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="rounded-3xl bg-charcoal-900/60 border border-charcoal-800/80 overflow-hidden shadow-lg">
            {loading ? (
              <div className="py-20 text-center text-xs text-charcoal-500 animate-pulse">
                Loading subscriptions from database...
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="py-20 text-center text-xs text-charcoal-500">
                No subscription records match your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal-800 bg-charcoal-900 text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Host Account</th>
                      <th className="py-3.5 px-4">Plan</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Starts At</th>
                      <th className="py-3.5 px-4">Expires At</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal-800/80 text-xs text-charcoal-300">
                    {subscriptions.map((s) => (
                      <tr key={s.id} className="hover:bg-charcoal-800/30 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-white">{s.user?.name || s.user?.mobile}</div>
                          <div className="font-mono text-charcoal-500 text-[11px] mt-0.5">{s.user?.mobile}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">{s.plan?.name}</span>
                          <span className="text-[10px] font-mono text-charcoal-400">{s.plan?.code}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              s.status === 'ACTIVE'
                                ? 'success'
                                : s.status === 'TRIAL'
                                ? 'brand'
                                : 'danger'
                            }
                            className="text-[10px] uppercase font-bold"
                          >
                            {s.status}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-charcoal-400">
                          {new Date(s.startsAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-charcoal-300 font-mono">
                            {new Date(s.expiresAt).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAdjustModal(s)}
                            className="border-charcoal-700 text-brand-accent hover:text-white text-xs px-2.5 py-1 h-auto"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            <span>Adjust</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Verified Payments Log */}
      {activeTab === 'payments' && (
        <div className="rounded-3xl bg-charcoal-900/60 border border-charcoal-800/80 overflow-hidden shadow-lg">
          {loading ? (
            <div className="py-20 text-center text-xs text-charcoal-500 animate-pulse">
              Loading payment transaction logs...
            </div>
          ) : payments.length === 0 ? (
            <div className="py-20 text-center text-xs text-charcoal-500">
              No verified payment records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-charcoal-800 bg-charcoal-900 text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Timestamp</th>
                    <th className="py-3.5 px-4">Host Mobile</th>
                    <th className="py-3.5 px-4">Plan Code</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Order / Payment ID</th>
                    <th className="py-3.5 px-5 text-right">Gateway Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-800/80 text-xs text-charcoal-300">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-charcoal-800/30 transition-colors">
                      <td className="py-3.5 px-5 text-charcoal-400 whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-white">
                        {p.user?.mobile || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-charcoal-200">{p.plan?.name}</span>
                        <span className="font-mono text-charcoal-500 text-[10px] block">{p.plan?.code}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                        ₹{(p.amount / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-charcoal-400">
                        <div>Order: {p.orderId}</div>
                        {p.paymentId && <div className="text-[10px] text-charcoal-500">Payment: {p.paymentId}</div>}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Badge
                          variant={p.status === 'SUCCESS' ? 'success' : 'danger'}
                          className="text-[10px] uppercase font-bold"
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual Subscription Override Modal */}
      {adjustSub && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-charcoal-900 rounded-3xl max-w-md w-full p-6 sm:p-7 border border-charcoal-800 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-800">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Manual Subscription Adjustment
                </h3>
                <span className="text-xs text-charcoal-400 font-mono">
                  {adjustSub.user?.mobile}
                </span>
              </div>
              <button
                onClick={() => setAdjustSub(null)}
                className="text-charcoal-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAdjustSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-charcoal-400 font-semibold mb-1">Target Plan</label>
                <select
                  value={targetPlanId}
                  onChange={(e) => setTargetPlanId(e.target.value)}
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-brand-500"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) – ₹{(p.priceYearly / 100).toLocaleString('en-IN')}/yr
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal-400 font-semibold mb-1">Status</label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-brand-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-charcoal-400 font-semibold mb-1">New Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={targetExpiresAt}
                    onChange={(e) => setTargetExpiresAt(e.target.value)}
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-1">
                  Adjustment Reason (Required for Audit Log)
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Authorized complimentary VIP extension"
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Additional context or ticket reference..."
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 p-2.5 text-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-charcoal-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustSub(null)}
                  disabled={adjustSubmitting}
                  className="border-charcoal-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={adjustSubmitting || !adjustReason.trim()}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-xs"
                >
                  {adjustSubmitting ? 'Applying...' : 'Apply Override'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
