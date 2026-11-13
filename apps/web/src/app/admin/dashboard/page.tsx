'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  Crown,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Layers,
  LifeBuoy,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminService, AdminDashboardData } from '@/services/admin.service';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-8 bg-charcoal-900 rounded-lg w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-charcoal-900 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-charcoal-900 rounded-2xl lg:col-span-2" />
          <div className="h-64 bg-charcoal-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-950/40 text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Failed to Load Admin Dashboard</h2>
        <p className="text-xs text-charcoal-400">{error || 'Unknown error'}</p>
        <Button onClick={loadData} variant="outline" className="border-charcoal-700 text-white">
          Retry
        </Button>
      </div>
    );
  }

  const { metrics, subscriptionDistribution, recentPayments, recentUsers, gatewayStatus } = data;

  const metricCards = [
    {
      title: 'Total Registered Users',
      value: metrics.totalUsers.toLocaleString(),
      subtitle: `${metrics.newRegistrations30d} new registrations in last 30 days`,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20'
    },
    {
      title: 'Active Subscriptions',
      value: metrics.activeSubscriptions.toLocaleString(),
      subtitle: `${metrics.renewalsCount} verified renewals & payments`,
      icon: Crown,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Active Free Trials',
      value: metrics.trialUsers.toLocaleString(),
      subtitle: '30-day host trial periods',
      icon: Sparkles,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20'
    },
    {
      title: 'Verified Revenue',
      value: `₹${metrics.totalRevenueRupees.toLocaleString('en-IN')}`,
      subtitle: `${metrics.totalVerifiedTransactions} successful Razorpay payments`,
      icon: CreditCard,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-charcoal-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="brand" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase font-bold">
              Production Workspace
            </Badge>
            <span className="text-charcoal-600">•</span>
            <span className="text-xs text-charcoal-400">Live Database Analytics</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
            Super Admin Control Center
          </h1>
          <p className="mt-1 text-xs text-charcoal-400">
            Real-time subscriber metrics, yearly plan performance, and platform monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="border-charcoal-800 text-charcoal-300 hover:text-white hover:bg-charcoal-800 text-xs space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stats</span>
          </Button>

          <Link href="/admin/users">
            <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white text-xs space-x-1.5">
              <span>Manage Users</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl border ${m.bg} bg-charcoal-900/60 backdrop-blur-xs flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-charcoal-400">{m.title}</span>
                <div className={`p-2 rounded-xl bg-charcoal-800/80 ${m.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-display font-black text-2xl sm:text-3xl text-white block">
                  {m.value}
                </span>
                <span className="text-[11px] text-charcoal-400 mt-1 block">{m.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Distribution by Plan */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-charcoal-900/50 border border-charcoal-800/80 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Subscription Plan Distribution
              </h3>
              <p className="text-xs text-charcoal-400 mt-0.5">
                Active host allocation across configured yearly plans
              </p>
            </div>
            <Link href="/admin/plans" className="text-xs text-purple-400 hover:text-purple-300 font-medium">
              Configure Plans &rarr;
            </Link>
          </div>

          <div className="space-y-4 pt-2">
            {subscriptionDistribution.map((item, idx) => {
              const totalSubs = metrics.totalUsers || 1;
              const percentage = Math.round((item.count / totalSubs) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-charcoal-200">
                      {item.planName} <span className="font-mono text-charcoal-500 text-[10px]">({item.planCode})</span>
                    </span>
                    <span className="font-mono text-charcoal-400">
                      {item.count} subscribers ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-charcoal-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.planCode === 'PREMIUM'
                          ? 'bg-purple-500'
                          : item.planCode === 'STANDARD'
                          ? 'bg-brand-500'
                          : item.planCode === 'BASIC'
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(4, Math.min(100, percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-charcoal-800 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block">
                Trial Accounts
              </span>
              <span className="font-display font-bold text-lg text-amber-400 mt-0.5 block">
                {metrics.trialUsers}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block">
                Active Paid
              </span>
              <span className="font-display font-bold text-lg text-emerald-400 mt-0.5 block">
                {metrics.activeSubscriptions}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block">
                Expired
              </span>
              <span className="font-display font-bold text-lg text-red-400 mt-0.5 block">
                {metrics.expiredSubscriptions}
              </span>
            </div>
          </div>
        </div>

        {/* Gateway & Environment Status Card */}
        <div className="p-6 rounded-3xl bg-charcoal-900/50 border border-charcoal-800/80 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-display font-bold text-base text-white">
                Payment Gateway Integration
              </h3>
            </div>
            <p className="text-xs text-charcoal-400">
              Backend payment provider status for Indian transactions.
            </p>

            <div className="p-4 rounded-2xl bg-charcoal-800/50 border border-charcoal-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-charcoal-400">Provider:</span>
                <strong className="text-white">{gatewayStatus.provider}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-charcoal-400">Mode:</span>
                <Badge
                  variant={gatewayStatus.configured ? 'success' : 'brand'}
                  className="text-[10px] uppercase font-bold"
                >
                  {gatewayStatus.mode}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Key ID:</span>
                <span className="font-mono text-charcoal-300 text-[11px]">
                  {gatewayStatus.keyId || 'Not set'}
                </span>
              </div>
              <div className="pt-2 border-t border-charcoal-700/60 text-[11px] text-charcoal-400 leading-relaxed">
                {gatewayStatus.notes}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/admin/settings">
              <Button variant="outline" size="sm" className="w-full border-charcoal-800 text-charcoal-300 hover:text-white text-xs space-x-1.5">
                <Settings className="w-3.5 h-3.5" />
                <span>Configure Settings</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity: Verified Payments & Signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Verified Payments */}
        <div className="p-6 rounded-3xl bg-charcoal-900/50 border border-charcoal-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-white">
              Recent Verified Payments
            </h3>
            <Link href="/admin/subscriptions" className="text-xs text-purple-400 hover:text-purple-300 font-medium">
              View All &rarr;
            </Link>
          </div>

          {recentPayments.length === 0 ? (
            <div className="py-8 text-center text-xs text-charcoal-500">
              No payment transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800/70 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">{p.plan?.name || 'Yearly Plan'}</span>
                      <span className="text-charcoal-500 font-mono text-[10px]">{p.user?.mobile}</span>
                    </div>
                    <span className="text-[10px] text-charcoal-400 mt-0.5 block font-mono">
                      Order: {p.orderId}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400 text-sm block">
                      ₹{(p.amount / 100).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-charcoal-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Registered Users */}
        <div className="p-6 rounded-3xl bg-charcoal-900/50 border border-charcoal-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-white">
              Recent Host Registrations
            </h3>
            <Link href="/admin/users" className="text-xs text-purple-400 hover:text-purple-300 font-medium">
              View All Users &rarr;
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-charcoal-500">
              No users registered yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800/70 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">{u.name || u.mobile}</span>
                      {u.role === 'SUPER_ADMIN' && (
                        <Badge variant="brand" className="bg-purple-500/20 text-purple-300 text-[9px] px-1 py-0 uppercase">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-charcoal-400 font-mono mt-0.5 block">
                      {u.mobile} • Joined {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="default" className="border-charcoal-700 bg-charcoal-900 text-charcoal-300 text-[10px]">
                    {u.subscription?.plan?.name || 'TRIAL'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
