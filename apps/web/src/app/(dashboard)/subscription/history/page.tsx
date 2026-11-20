'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  History,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  subscriptionService,
  SubscriptionHistoryItem,
  PaymentTransactionItem
} from '@/services/subscription.service';

export default function SubscriptionHistoryPage() {
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [payments, setPayments] = useState<PaymentTransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'payments' | 'history'>('payments');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const res = await subscriptionService.getHistory();
        setHistory(res.history);
        setPayments(res.payments);
      } catch (err: any) {
        setError(err.message || 'Failed to load billing history.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-8 bg-surface-warm rounded-lg w-64" />
        <div className="h-64 bg-surface-warm rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/subscription"
          className="inline-flex items-center text-xs font-semibold text-charcoal-500 hover:text-charcoal-800 mb-3 space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Subscription Overview</span>
        </Link>
        <h1 className="font-display font-extrabold text-3xl text-charcoal-900 tracking-tight">
          Billing &amp; Subscription History
        </h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Review verified payment receipts, membership renewals, and plan adjustments.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border space-x-4">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Transactions ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'history'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Membership Lifecycle Log ({history.length})</span>
        </button>
      </div>

      {/* Tab 1: Payment Transactions */}
      {activeTab === 'payments' && (
        <Card className="overflow-hidden">
          {payments.length === 0 ? (
            <div className="py-16 text-center text-charcoal-500 space-y-2">
              <CreditCard className="w-8 h-8 mx-auto text-charcoal-400" />
              <p className="text-sm font-medium text-charcoal-700">No payment records found.</p>
              <p className="text-xs text-charcoal-400">
                You are currently on a free trial or no payment transactions have been logged.
              </p>
              <div className="pt-2">
                <Link href="/subscription/plans">
                  <Button size="sm" variant="outline" className="text-xs">
                    Browse Plans
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-warm/40 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Order / Payment ID</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-xs text-charcoal-700">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-warm/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-charcoal-600">
                        {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-charcoal-900">
                        {p.plan?.name || 'Subscription Plan'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-charcoal-900">
                        ₹{(p.amount / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-charcoal-500">
                        <div>{p.orderId}</div>
                        {p.paymentId && <div className="text-[10px] text-charcoal-400">{p.paymentId}</div>}
                      </td>
                      <td className="py-3 px-4 text-charcoal-600">
                        <span className="inline-flex items-center space-x-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{p.paymentProvider}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant={
                            p.status === 'SUCCESS'
                              ? 'success'
                              : p.status === 'PENDING'
                              ? 'brand'
                              : 'danger'
                          }
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
        </Card>
      )}

      {/* Tab 2: Subscription Lifecycle Log */}
      {activeTab === 'history' && (
        <Card className="overflow-hidden">
          {history.length === 0 ? (
            <div className="py-16 text-center text-charcoal-500 space-y-2">
              <History className="w-8 h-8 mx-auto text-charcoal-400" />
              <p className="text-sm font-medium text-charcoal-700">No lifecycle events recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-warm/40 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Action / Reason</th>
                    <th className="py-3 px-4">Validity Period</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-xs text-charcoal-700">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-surface-warm/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-charcoal-600">
                        {new Date(h.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-charcoal-900">
                        {h.plan?.name || 'Membership'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] bg-surface-warm px-2 py-0.5 rounded-md text-charcoal-700">
                          {h.reason}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-charcoal-600 text-[11px]">
                        {new Date(h.startsAt).toLocaleDateString()} – {new Date(h.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-charcoal-500 max-w-xs truncate">
                        {h.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant={h.status === 'ACTIVE' ? 'success' : 'default'}
                          className="text-[10px] uppercase font-bold"
                        >
                          {h.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
