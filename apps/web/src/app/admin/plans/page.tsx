'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Calendar,
  Users,
  Layers,
  Crown,
  AlertTriangle,
  Archive,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminService } from '@/services/admin.service';
import { SubscriptionPlan } from '@/services/subscription.service';

const DEFAULT_PLATFORM_CODES = ['BASIC', 'STANDARD', 'PREMIUM', 'TRIAL'];

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [includeLegacy, setIncludeLegacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [priceRupees, setPriceRupees] = useState('0');
  const [priceMonthlyRupees, setPriceMonthlyRupees] = useState('0');
  const [hasMonthlyBilling, setHasMonthlyBilling] = useState(false);
  const [hasYearlyBilling, setHasYearlyBilling] = useState(true);
  const [maxEvents, setMaxEvents] = useState('10');
  const [maxGuestsPerEvent, setMaxGuestsPerEvent] = useState('150');
  const [maxPermanentGuests, setMaxPermanentGuests] = useState('300');
  const [canUploadCustomTemplates, setCanUploadCustomTemplates] = useState(false);
  const [canCustomInviteUpload, setCanCustomInviteUpload] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [tier, setTier] = useState('1');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');

  const loadPlans = async (legacyFlag: boolean = includeLegacy) => {
    try {
      setLoading(true);
      const data = await adminService.listPlans(legacyFlag);
      setPlans(data);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to load plans' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans(includeLegacy);
  }, [includeLegacy]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage(null);
    }, 5000);
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setCode('');
    setPriceRupees('999');
    setPriceMonthlyRupees('149');
    setHasMonthlyBilling(true);
    setHasYearlyBilling(true);
    setMaxEvents('15');
    setMaxGuestsPerEvent('250');
    setMaxPermanentGuests('500');
    setCanUploadCustomTemplates(false);
    setCanCustomInviteUpload(false);
    setIsPopular(false);
    setTier('1');
    setDisplayOrder('1');
    setDescription('');
    setFeaturesText('Up to 15 Events / year\nUp to 250 Guests per Event\nStandard Support');
    setModalOpen(true);
  };

  const openEditModal = (p: SubscriptionPlan) => {
    setEditingPlan(p);
    setName(p.name);
    setCode(p.code);
    setPriceRupees((p.priceYearly / 100).toString());
    setPriceMonthlyRupees(((p.priceMonthly || 0) / 100).toString());
    setHasMonthlyBilling(p.hasMonthlyBilling ?? false);
    setHasYearlyBilling(p.hasYearlyBilling ?? true);
    setMaxEvents(p.maxEvents.toString());
    setMaxGuestsPerEvent(p.maxGuestsPerEvent.toString());
    setMaxPermanentGuests((p.maxPermanentGuests || 100).toString());
    setCanUploadCustomTemplates(p.canUploadCustomTemplates);
    setCanCustomInviteUpload(p.canCustomInviteUpload || false);
    setIsPopular(p.isPopular);
    setTier(p.tier.toString());
    setDisplayOrder((p.displayOrder ?? 0).toString());
    setDescription(p.description || '');
    setFeaturesText(p.features ? p.features.join('\n') : '');
    setModalOpen(true);
  };

  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      const pricePaise = Math.round(parseFloat(priceRupees || '0') * 100);
      const priceMonthlyPaise = Math.round(parseFloat(priceMonthlyRupees || '0') * 100);
      const parsedFeatures = featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        code: code.toUpperCase().trim(),
        priceYearly: pricePaise,
        priceMonthly: priceMonthlyPaise,
        hasMonthlyBilling,
        hasYearlyBilling,
        currency: 'INR',
        maxEvents: parseInt(maxEvents, 10),
        maxGuestsPerEvent: parseInt(maxGuestsPerEvent, 10),
        maxPermanentGuests: parseInt(maxPermanentGuests, 10),
        canUploadCustomTemplates,
        canCustomInviteUpload,
        tier: parseInt(tier, 10),
        displayOrder: parseInt(displayOrder, 10),
        isPopular,
        description: description.trim(),
        features: parsedFeatures
      };

      if (editingPlan) {
        await adminService.updatePlan(editingPlan.id, payload);
        showNotification('success', `Plan '${payload.name}' updated successfully.`);
      } else {
        await adminService.createPlan(payload);
        showNotification('success', `New plan '${payload.name}' created successfully.`);
      }

      setModalOpen(false);
      loadPlans();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Failed to save plan');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (p: SubscriptionPlan) => {
    try {
      const updated = await adminService.togglePlan(p.id);
      showNotification('success', `Plan ${p.code} is now ${updated.isActive ? 'active' : 'disabled'}.`);
      loadPlans();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Failed to toggle plan status');
    }
  };

  const openDeleteModal = (p: SubscriptionPlan) => {
    setPlanToDelete(p);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    try {
      setDeleteLoading(true);
      await adminService.deletePlan(planToDelete.id);
      showNotification('success', `Plan '${planToDelete.name}' (${planToDelete.code}) was deleted successfully.`);
      setDeleteModalOpen(false);
      setPlanToDelete(null);
      loadPlans();
    } catch (err: any) {
      showNotification(
        'error',
        err.response?.data?.error || err.message || 'Cannot delete plan due to existing references.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Metrics summary
  const activeCount = plans.filter((p) => p.isActive && !p.isLegacy).length;
  const inactiveCount = plans.filter((p) => !p.isActive || p.isLegacy).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Alert banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
              : 'bg-red-950/60 border border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-charcoal-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-charcoal-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-500/30 text-[10px] uppercase font-bold">
              Subscription Management
            </Badge>
            <span className="text-charcoal-600">•</span>
            <span className="text-xs text-charcoal-400">Dynamic Multi-Tier Architecture</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
            Subscription Plans &amp; Feature Limits
          </h1>
          <p className="mt-1 text-xs text-charcoal-400">
            Manage your default platform tiers (Basic, Standard, Premium) or introduce dynamic custom plans with monthly &amp; yearly pricing.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludeLegacy(!includeLegacy)}
            className={`text-xs space-x-1.5 border-charcoal-800 ${
              includeLegacy ? 'bg-amber-950/40 text-amber-300 border-amber-800/60' : 'text-charcoal-400 hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{includeLegacy ? 'Hide Legacy Plans' : 'Show Legacy / Archived'}</span>
          </Button>

          <Button
            onClick={openCreateModal}
            size="sm"
            className="bg-brand-600 hover:bg-brand-500 text-white text-xs space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Plan</span>
          </Button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-charcoal-900/60 border border-charcoal-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-charcoal-400 block">Active Public Plans</span>
            <span className="font-display font-extrabold text-2xl text-emerald-400 mt-0.5 block">
              {activeCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-charcoal-900/60 border border-charcoal-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-charcoal-400 block">Inactive / Legacy Plans</span>
            <span className="font-display font-extrabold text-2xl text-charcoal-400 mt-0.5 block">
              {inactiveCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-charcoal-800 text-charcoal-400">
            <Archive className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-charcoal-900/60 border border-charcoal-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-charcoal-400 block">Default Core Tiers</span>
            <span className="font-display font-semibold text-xs text-brand-300 mt-1 block">
              BASIC • STANDARD • PREMIUM
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-accent">
            <Crown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-charcoal-500 animate-pulse">
          Loading subscription tiers from database...
        </div>
      ) : plans.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-charcoal-900/30 border border-charcoal-800/80 p-8">
          <p className="text-sm text-charcoal-400">No subscription plans found.</p>
          <Button onClick={openCreateModal} size="sm" className="mt-4 bg-brand-600 text-white text-xs">
            Create First Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isDefault = DEFAULT_PLATFORM_CODES.includes(p.code);
            const subscribers = p._count?.subscriptions || 0;

            return (
              <div
                key={p.id}
                className={`p-6 rounded-3xl bg-charcoal-900/70 border flex flex-col justify-between transition-all ${
                  p.isLegacy
                    ? 'border-amber-900/50 bg-amber-950/10 opacity-70'
                    : p.isActive
                    ? p.isPopular
                      ? 'border-brand-500/50 ring-1 ring-brand-500/20 shadow-xl'
                      : 'border-charcoal-800 hover:border-charcoal-700'
                    : 'border-charcoal-800/40 opacity-60'
                }`}
              >
                <div>
                  {/* Badges Bar */}
                  <div className="flex items-center justify-between mb-3 min-h-[22px]">
                    <div className="flex items-center space-x-1.5">
                      {p.isLegacy ? (
                        <Badge variant="default" className="bg-amber-950/80 text-amber-300 border-amber-800/60 text-[10px] uppercase font-bold">
                          Archived Legacy
                        </Badge>
                      ) : p.isActive ? (
                        <Badge
                          variant={p.isPopular ? 'brand' : 'default'}
                          className="text-[10px] uppercase font-bold"
                        >
                          {p.isPopular ? 'Popular Choice' : 'Active'}
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="text-[10px] uppercase font-bold">
                          Disabled
                        </Badge>
                      )}

                      {isDefault && (
                        <Badge variant="default" className="text-[10px] text-charcoal-400 bg-charcoal-800 border-charcoal-700">
                          Core
                        </Badge>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-charcoal-500 uppercase">
                      Order: {p.displayOrder ?? 0}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl text-white">{p.name}</h3>
                  <span className="text-xs font-mono text-brand-accent block mt-0.5">{p.code}</span>

                  {/* Pricing Display (Yearly & Monthly) */}
                  <div className="mt-4 p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800/80 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-charcoal-400">Yearly:</span>
                      <div>
                        <span className="font-display font-black text-xl text-white">
                          {p.priceYearly === 0 ? '₹0' : `₹${(p.priceYearly / 100).toLocaleString('en-IN')}`}
                        </span>
                        <span className="text-[11px] text-charcoal-400 ml-1">/yr</span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-1 border-t border-charcoal-800">
                      <span className="text-xs text-charcoal-400">Monthly:</span>
                      <div>
                        {p.hasMonthlyBilling && (p.priceMonthly ?? 0) > 0 ? (
                          <>
                            <span className="font-display font-bold text-base text-charcoal-200">
                              ₹{((p.priceMonthly || 0) / 100).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-charcoal-400 ml-1">/mo</span>
                          </>
                        ) : (
                          <span className="text-[11px] text-charcoal-500 italic">Not enabled</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-charcoal-400 mt-2 min-h-[32px] line-clamp-2">
                    {p.description || 'Configurable membership plan'}
                  </p>

                  {/* Limits summary */}
                  <div className="mt-4 p-3 rounded-2xl bg-charcoal-800/30 border border-charcoal-800/60 space-y-1.5 text-xs text-charcoal-300">
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">Max Events:</span>
                      <strong className="text-white">{p.maxEvents} events</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">Guests / Event:</span>
                      <strong className="text-white">{p.maxGuestsPerEvent} guests</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">Saved Book:</span>
                      <strong className="text-white">{p.maxPermanentGuests} contacts</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">Subscribers:</span>
                      <strong className={subscribers > 0 ? 'text-emerald-400' : 'text-charcoal-400'}>
                        {subscribers} active
                      </strong>
                    </div>
                  </div>

                  {/* Feature highlights */}
                  <div className="mt-4 space-y-1.5 text-xs text-charcoal-400">
                    {p.features?.slice(0, 3).map((f, idx) => (
                      <div key={idx} className="flex items-start">
                        <Check className="w-3.5 h-3.5 text-brand-accent mr-2 shrink-0 mt-0.5" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="mt-6 pt-4 border-t border-charcoal-800 flex items-center justify-between gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(p)}
                    className="flex-1 border-charcoal-700 text-charcoal-200 hover:text-white text-xs px-2 py-1 h-auto"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    <span>Edit</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(p)}
                    className={`text-xs px-2.5 py-1 h-auto border-charcoal-700 ${
                      p.isActive ? 'text-charcoal-400 hover:text-amber-400' : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    {p.isActive ? 'Disable' : 'Enable'}
                  </Button>

                  {!isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteModal(p)}
                      title={subscribers > 0 ? 'Referenced plans cannot be deleted' : 'Delete unreferenced plan'}
                      className="text-xs px-2 py-1 h-auto border-charcoal-800 text-charcoal-500 hover:text-red-400 hover:border-red-900/60"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Form Modal (Create / Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-charcoal-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 border border-charcoal-800 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-800">
              <h3 className="font-display font-bold text-lg text-white">
                {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create Subscription Plan'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-charcoal-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal-400 font-semibold mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard"
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-charcoal-400 font-semibold mb-1">Plan Code (Unique)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. STANDARD"
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono uppercase focus:outline-hidden focus:border-brand-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Pricing & Billing Availability */}
              <div className="p-3.5 rounded-2xl bg-charcoal-800/40 border border-charcoal-800 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400 block">
                  Pricing &amp; Billing Cycles
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-charcoal-400 text-[10px] mb-1">Yearly Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={priceRupees}
                      onChange={(e) => setPriceRupees(e.target.value)}
                      className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono focus:outline-hidden focus:border-brand-500"
                    />
                    <label className="flex items-center space-x-2 text-charcoal-400 text-[10px] mt-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasYearlyBilling}
                        onChange={(e) => setHasYearlyBilling(e.target.checked)}
                        className="rounded bg-charcoal-800 border-charcoal-700 text-brand-600 focus:ring-brand-500"
                      />
                      <span>Enable Yearly Billing</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-charcoal-400 text-[10px] mb-1">Monthly Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={priceMonthlyRupees}
                      onChange={(e) => setPriceMonthlyRupees(e.target.value)}
                      className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono focus:outline-hidden focus:border-brand-500"
                    />
                    <label className="flex items-center space-x-2 text-charcoal-400 text-[10px] mt-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasMonthlyBilling}
                        onChange={(e) => setHasMonthlyBilling(e.target.checked)}
                        className="rounded bg-charcoal-800 border-charcoal-700 text-brand-600 focus:ring-brand-500"
                      />
                      <span>Enable Monthly Billing</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Display Order & Tier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal-400 font-semibold mb-1">Display Order (1, 2, 3...)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono focus:outline-hidden focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-charcoal-400 font-semibold mb-1">Tier Level (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    required
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono focus:outline-hidden focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="p-3.5 rounded-2xl bg-charcoal-800/40 border border-charcoal-800 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400 block">
                  Server-Enforced Quota Limits
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-charcoal-400 text-[10px] mb-1">Max Events</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={maxEvents}
                      onChange={(e) => setMaxEvents(e.target.value)}
                      className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-charcoal-400 text-[10px] mb-1">Guests / Event</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={maxGuestsPerEvent}
                      onChange={(e) => setMaxGuestsPerEvent(e.target.value)}
                      className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-charcoal-400 text-[10px] mb-1">Max Saved Book</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={maxPermanentGuests}
                      onChange={(e) => setMaxPermanentGuests(e.target.value)}
                      className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center space-x-2 text-charcoal-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canUploadCustomTemplates}
                    onChange={(e) => setCanUploadCustomTemplates(e.target.checked)}
                    className="rounded bg-charcoal-800 border-charcoal-700 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Allow Custom Templates</span>
                </label>

                <label className="flex items-center space-x-2 text-charcoal-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="rounded bg-charcoal-800 border-charcoal-700 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Badge as Most Popular</span>
                </label>
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-1">Marketing Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Most popular for active hosts and grand family celebrations"
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-1">
                  Features List (One feature per line)
                </label>
                <textarea
                  rows={4}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="Up to 25 Events / year&#10;Up to 500 Guests per Event&#10;Custom Occasion Studio"
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 p-2.5 text-white font-mono text-[11px] focus:outline-hidden focus:border-brand-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-charcoal-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={formSubmitting}
                  className="border-charcoal-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={formSubmitting}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-xs"
                >
                  {formSubmitting ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && planToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-charcoal-900 rounded-3xl max-w-md w-full p-6 border border-charcoal-800 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-display font-bold text-lg text-white">
                Delete Plan: {planToDelete.name}?
              </h3>
            </div>

            <p className="text-xs text-charcoal-300 leading-relaxed">
              Permanent deletion is only allowed if this plan has <strong>zero active subscriptions</strong> and <strong>zero historical payment references</strong>.
            </p>

            <div className="p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-charcoal-400">Plan Code:</span>
                <span className="font-mono text-white">{planToDelete.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Recorded Subscriptions:</span>
                <span className="font-mono text-white">{planToDelete._count?.subscriptions || 0}</span>
              </div>
            </div>

            <p className="text-[11px] text-charcoal-500">
              If this plan has any prior subscribers, the system will reject deletion and require deactivating it instead to protect billing history.
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-charcoal-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="border-charcoal-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-500 text-white text-xs"
              >
                {deleteLoading ? 'Checking references...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
