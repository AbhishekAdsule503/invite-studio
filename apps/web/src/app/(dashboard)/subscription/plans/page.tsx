'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Check,
  Crown,
  ShieldCheck,
  ArrowLeft,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  X,
  Zap,
  Info,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthContext';
import {
  subscriptionService,
  SubscriptionPlan,
  CurrentSubscriptionResponse
} from '@/services/subscription.service';

export default function SubscriptionPlansPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [currentSub, setCurrentSub] = useState<CurrentSubscriptionResponse | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [gateway, setGateway] = useState<{ configured: boolean; mode: string; keyId: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Billing Cycle state: 'MONTHLY' | 'YEARLY' (Default to monthly for final 4-tier plans)
  const [billingCycle, setBillingCycle] = useState<'YEARLY' | 'MONTHLY'>('MONTHLY');

  // Checkout modal state
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [subRes, plansRes] = await Promise.all([
          subscriptionService.getCurrent(),
          subscriptionService.getPlans()
        ]);
        setCurrentSub(subRes);
        // Exclude trial or legacy plans from public checkout catalog
        const paidActivePlans = plansRes.plans.filter(
          (p) => !p.isLegacy && p.isActive !== false && p.code !== 'TRIAL'
        );
        setPlans(paidActivePlans);
        setGateway(plansRes.gateway);
      } catch (err: any) {
        setError(err.message || 'Failed to load subscription plans.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setCheckoutError(null);
    setPaymentSuccess(false);

    // If selected billing cycle is monthly, but plan only supports yearly, fallback to yearly
    const effectiveCycle =
      billingCycle === 'MONTHLY' && plan.hasMonthlyBilling ? 'MONTHLY' : 'YEARLY';

    const price = effectiveCycle === 'MONTHLY' ? plan.priceMonthly || 0 : plan.priceYearly;
    if (price <= 0) {
      // Free plan requires no payment gateway transaction
      try {
        setCheckoutLoading(true);
        await subscriptionService.switchPlan({ planId: plan.id });
        setPaymentSuccess(true);
        if (refreshUser) await refreshUser();
        const updated = await subscriptionService.getCurrent();
        setCurrentSub(updated);
      } catch (err: any) {
        setCheckoutError(err.message || 'Failed to activate plan.');
      } finally {
        setCheckoutLoading(false);
      }
      return;
    }

    try {
      setCheckoutLoading(true);
      const order = await subscriptionService.createOrder(plan.id, effectiveCycle);
      setOrderData(order);
    } catch (err: any) {
      setCheckoutError(err.message || 'Failed to initialize payment order.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayCheckout = async () => {
    if (!orderData || !selectedPlan) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    // If running in local sandbox simulated mode without real Razorpay keys
    if (orderData.isSandbox && orderData.keyId?.startsWith('rzp_test_mock')) {
      return handleSimulatePayment();
    }

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      setCheckoutLoading(false);
      setCheckoutError('Unable to load Razorpay Checkout script. Please check your network connection.');
      return;
    }

    try {
      const cycleText = orderData.billingCycle === 'MONTHLY' ? 'Monthly' : '1 Year';
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'INVITE STUDIO',
        description: `${selectedPlan.name} Plan - ${cycleText} Subscription`,
        order_id: orderData.orderId,
        prefill: {
          name: user?.name || '',
          contact: user?.mobile || '',
          email: user?.email || ''
        },
        notes: {
          planId: selectedPlan.id,
          planCode: selectedPlan.code,
          billingCycle: orderData.billingCycle || 'YEARLY'
        },
        theme: {
          color: '#E11D48'
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            setCheckoutLoading(true);
            setCheckoutError(null);
            const res = await subscriptionService.verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });

            if (res.success) {
              setPaymentSuccess(true);
              await refreshUser();
              setTimeout(() => {
                setSelectedPlan(null);
                router.push('/subscription');
              }, 2200);
            } else {
              setCheckoutError(res.message || 'Payment verification failed.');
            }
          } catch (err: any) {
            setCheckoutError(err.message || 'Payment verification failed on the server.');
          } finally {
            setCheckoutLoading(false);
          }
        },
        modal: {
          ondismiss: async function () {
            setCheckoutLoading(false);
            setCheckoutError('Payment cancelled. Your subscription was not modified.');
            try {
              await subscriptionService.recordFailure({
                orderId: orderData.orderId,
                reason: 'USER_CANCELLED',
                description: 'User dismissed the Razorpay checkout modal'
              });
            } catch {
              // Ignore failure reporting error
            }
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);

      rzp.on('payment.failed', async function (response: any) {
        setCheckoutLoading(false);
        const description = response.error?.description || response.error?.reason || 'Payment failed';
        setCheckoutError(`Payment failed: ${description}`);
        try {
          await subscriptionService.recordFailure({
            orderId: orderData.orderId,
            paymentId: response.error?.metadata?.payment_id,
            reason: response.error?.code || 'PAYMENT_FAILED',
            description
          });
        } catch {
          // Ignore
        }
      });

      rzp.open();
    } catch (err: any) {
      setCheckoutLoading(false);
      setCheckoutError(err.message || 'Failed to open Razorpay checkout modal.');
    }
  };

  const handleSimulatePayment = async () => {
    if (!orderData || !selectedPlan) return;

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);

      // Generate simulated test payment parameters
      const testPaymentId = `pay_sim_${Date.now()}`;
      const res = await subscriptionService.verifyPayment({
        orderId: orderData.orderId,
        paymentId: testPaymentId,
        signature: 'sandbox_payment_test_sig'
      });

      if (res.success) {
        setPaymentSuccess(true);
        await refreshUser();
        setTimeout(() => {
          setSelectedPlan(null);
          router.push('/subscription');
        }, 2200);
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Payment verification failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6">
        <div className="h-8 bg-surface-warm rounded-lg w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-surface-warm rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Link
            href="/subscription"
            className="inline-flex items-center text-xs font-semibold text-charcoal-500 hover:text-charcoal-800 mb-3 space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Subscription</span>
          </Link>
          <h1 className="font-display font-extrabold text-3xl text-charcoal-900 tracking-tight">
            Choose Your Platform Plan
          </h1>
          <p className="mt-1 text-sm text-charcoal-500 max-w-2xl">
            Select the tier that best fits your hosting scale. All memberships include WhatsApp distribution, RSVP manager, and aggregate private analytics.
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="bg-surface-warm/80 p-1.5 rounded-2xl border border-surface-border flex items-center space-x-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setBillingCycle('YEARLY')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              billingCycle === 'YEARLY'
                ? 'bg-white text-charcoal-900 shadow-xs border border-surface-border'
                : 'text-charcoal-500 hover:text-charcoal-900'
            }`}
          >
            <span>Yearly Billing</span>
            <span className="ml-1.5 text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
              Save ~30%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              billingCycle === 'MONTHLY'
                ? 'bg-white text-charcoal-900 shadow-xs border border-surface-border'
                : 'text-charcoal-500 hover:text-charcoal-900'
            }`}
          >
            <span>Monthly Billing</span>
          </button>
        </div>
      </div>

      {/* Gateway Status Notice */}
      {gateway && (
        <div className="p-3.5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between text-xs text-charcoal-600">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Secure Indian Payments Gateway: <strong className="text-charcoal-900">Razorpay</strong> (UPI, RuPay, Visa, NetBanking)
            </span>
          </div>
          <Badge variant={gateway.configured ? 'success' : 'default'} className="text-[10px]">
            {gateway.mode === 'live' ? 'Live Gateway' : 'Test Mode'}
          </Badge>
        </div>
      )}

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = currentSub?.plan?.id === p.id;
          const isHigherTier = currentSub?.plan ? p.tier > currentSub.plan.tier : true;

          // Check price for selected billing cycle
          const isMonthlySelected = billingCycle === 'MONTHLY';
          const monthlySupported = p.hasMonthlyBilling && (p.priceMonthly ?? 0) > 0;
          const displayPricePaise =
            isMonthlySelected && monthlySupported ? p.priceMonthly || 0 : p.priceYearly;
          const cycleLabel = isMonthlySelected && monthlySupported ? '/month' : '/year';

          return (
            <Card
              key={p.id}
              className={`flex flex-col justify-between p-6 rounded-3xl transition-all duration-200 ${
                p.isPopular
                  ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-lg relative'
                  : 'hover:border-brand-300 transition-colors'
              } ${isCurrent ? 'bg-brand-50/20 border-brand-400' : ''}`}
            >
              <div>
                {/* Popular Badge */}
                <div className="flex items-center justify-between mb-3 min-h-[24px]">
                  {p.isPopular ? (
                    <Badge variant="brand" className="text-[10px] uppercase font-bold tracking-wider">
                      Most Popular
                    </Badge>
                  ) : isCurrent ? (
                    <Badge variant="success" className="text-[10px] uppercase font-bold">
                      Current Plan
                    </Badge>
                  ) : (
                    <div />
                  )}
                </div>

                <h3 className="font-display font-bold text-xl text-charcoal-900">{p.name}</h3>
                <p className="text-xs text-charcoal-500 mt-1 min-h-[32px]">
                  {p.description || `${p.name} subscription plan`}
                </p>

                {/* Price Display */}
                <div className="mt-4 flex items-baseline">
                  <span className="font-display font-black text-3xl text-charcoal-900">
                    {displayPricePaise === 0
                      ? '₹0'
                      : `₹${(displayPricePaise / 100).toLocaleString('en-IN')}`}
                  </span>
                  <span className="ml-1 text-xs text-charcoal-500 font-medium">{cycleLabel}</span>
                </div>

                {isMonthlySelected && !monthlySupported && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-1.5 mt-2">
                    Monthly billing not available for {p.name}. Billed yearly.
                  </p>
                )}

                {/* Key Limits highlight */}
                <div className="mt-5 p-3 rounded-2xl bg-surface-warm/70 space-y-1.5 text-xs text-charcoal-700">
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Max Events:</span>
                    <strong className="text-charcoal-900">{p.maxEvents} events</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Guests / Event:</span>
                    <strong className="text-charcoal-900">{p.maxGuestsPerEvent} guests</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Saved Address Book:</span>
                    <strong className="text-charcoal-900">{p.maxPermanentGuests} contacts</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Custom Invitations:</span>
                    <strong className={p.canUploadCustomTemplates ? 'text-emerald-700' : 'text-charcoal-500'}>
                      {p.canUploadCustomTemplates ? 'Allowed' : 'System templates'}
                    </strong>
                  </div>
                </div>

                {/* Features checklist */}
                <div className="mt-6 space-y-2.5 text-xs text-charcoal-600">
                  {p.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4 border-t border-surface-border">
                {isCurrent ? (
                  <Button variant="outline" className="w-full text-xs" disabled>
                    Current Active Plan
                  </Button>
                ) : displayPricePaise === 0 ? (
                  <Button variant="outline" className="w-full text-xs" disabled>
                    Included
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handleSelectPlan(p)}
                    className={`w-full text-xs font-semibold ${
                      p.isPopular ? 'bg-brand-600 hover:bg-brand-700 text-white' : ''
                    }`}
                  >
                    {currentSub?.isExpired
                      ? `Renew on ${p.name}`
                      : isHigherTier
                      ? `Upgrade to ${p.name}`
                      : `Switch to ${p.name}`}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-surface-border animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-charcoal-900">
                    Order Confirmation
                  </h3>
                  <span className="text-[10px] uppercase font-semibold text-charcoal-500">
                    {orderData?.billingCycle === 'MONTHLY' ? 'Monthly Billing' : 'Yearly Billing'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-charcoal-400 hover:text-charcoal-600 p-1.5 rounded-xl hover:bg-surface-warm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-display font-bold text-xl text-charcoal-900">
                  Subscription Activated!
                </h4>
                <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
                  Your payment for <strong>{selectedPlan.name}</strong> was verified successfully. All new quotas and features are now active.
                </p>
                <div className="pt-2">
                  <span className="text-xs text-brand-600 font-medium">Redirecting to dashboard...</span>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {/* Plan Summary Box */}
                <div className="p-4 rounded-2xl bg-surface-warm/70 border border-surface-border space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-charcoal-800 text-sm">
                      {selectedPlan.name} ({orderData?.billingCycle === 'MONTHLY' ? 'Monthly' : 'Yearly'})
                    </span>
                    <span className="font-display font-bold text-base text-charcoal-900">
                      ₹{((orderData?.amount || selectedPlan.priceYearly) / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="border-t border-surface-border/60 pt-2 space-y-1 text-charcoal-600">
                    <div className="flex justify-between">
                      <span>Events Limit:</span>
                      <strong>{selectedPlan.maxEvents} events</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Guests / Event:</span>
                      <strong>{selectedPlan.maxGuestsPerEvent} guests</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Saved Address Book:</span>
                      <strong>{selectedPlan.maxPermanentGuests} contacts</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <strong>{orderData?.billingCycle === 'MONTHLY' ? '30 Days' : '365 Days'}</strong>
                    </div>
                  </div>
                </div>

                {checkoutError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                {/* Gateway Instructions */}
                <div className="p-3.5 rounded-xl bg-brand-50/50 border border-brand-200 text-xs text-brand-900 space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-semibold text-brand-800">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    <span>
                      {gateway?.configured
                        ? `Razorpay Secure Checkout (${gateway.mode === 'test' ? 'Test Mode' : 'Live'})`
                        : 'Sandbox-Ready Gateway Integration'}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-600">
                    {gateway?.configured
                      ? 'Click pay to launch Razorpay UPI, NetBanking, and Card checkout. Your subscription will be activated automatically upon verified signature.'
                      : 'Orders are created via the backend provider abstraction and verified cryptographically on the server.'}
                  </p>
                  {orderData && (
                    <div className="text-[10px] font-mono text-charcoal-500 pt-1 flex items-center justify-between">
                      <span>Order ID: {orderData.orderId}</span>
                      {orderData.isSandbox && <Badge variant="warning" className="text-[9px]">SANDBOX MOCK</Badge>}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedPlan(null)}
                    disabled={checkoutLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={checkoutLoading || !orderData}
                    onClick={handleRazorpayCheckout}
                    className="bg-brand-600 hover:bg-brand-700 text-white"
                  >
                    {checkoutLoading
                      ? 'Processing...'
                      : `Pay ₹${((orderData?.amount || selectedPlan.priceYearly) / 100).toLocaleString('en-IN')} via Razorpay`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
