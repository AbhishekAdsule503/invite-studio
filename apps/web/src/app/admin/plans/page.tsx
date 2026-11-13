'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Check,
  X,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Calendar,
  Users,
  Layers,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminService } from '@/services/admin.service';
import { SubscriptionPlan } from '@/services/subscription.service';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [priceRupees, setPriceRupees] = useState('0');
  const [maxEvents, setMaxEvents] = useState('10');
  const [maxGuestsPerEvent, setMaxGuestsPerEvent] = useState('150');
  const [maxPermanentGuests, setMaxPermanentGuests] = useState('300');
  const [canUploadCustomTemplates, setCanUploadCustomTemplates] = useState(false);
  const [canCustomInviteUpload, setCanCustomInviteUpload] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [tier, setTier] = useState('1');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await adminService.listPlans();
      setPlans(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setCode('');
    setPriceRupees('999');
    setMaxEvents('15');
    setMaxGuestsPerEvent('250');
    setMaxPermanentGuests('500');
    setCanUploadCustomTemplates(false);
    setCanCustomInviteUpload(false);
    setIsPopular(false);
    setTier('1');
    setDescription('');
    setFeaturesText('Up to 15 Events / year\nUp to 250 Guests per Event\nStandard Support');
    setModalOpen(true);
  };

  const openEditModal = (p: SubscriptionPlan) => {
    setEditingPlan(p);
    setName(p.name);
    setCode(p.code);
    setPriceRupees((p.priceYearly / 100).toString());
    setMaxEvents(p.maxEvents.toString());
    setMaxGuestsPerEvent(p.maxGuestsPerEvent.toString());
    setMaxPermanentGuests((p.maxPermanentGuests || 100).toString());
    setCanUploadCustomTemplates(p.canUploadCustomTemplates);
    setCanCustomInviteUpload(p.canCustomInviteUpload || false);
    setIsPopular(p.isPopular);
    setTier(p.tier.toString());
    setDescription(p.description || '');
    setFeaturesText(p.features ? p.features.join('\n') : '');
    setModalOpen(true);
  };

  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      const pricePaise = Math.round(parseFloat(priceRupees || '0') * 100);
      const parsedFeatures = featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        name,
        code: code.toUpperCase(),
        priceYearly: pricePaise,
        currency: 'INR',
        maxEvents: parseInt(maxEvents, 10),
        maxGuestsPerEvent: parseInt(maxGuestsPerEvent, 10),
        maxPermanentGuests: parseInt(maxPermanentGuests, 10),
        canUploadCustomTemplates,
        canCustomInviteUpload,
        tier: parseInt(tier, 10),
        isPopular,
        description,
        features: parsedFeatures
      };

      if (editingPlan) {
        await adminService.updatePlan(editingPlan.id, payload);
      } else {
        await adminService.createPlan(payload);
      }

      setModalOpen(false);
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to save plan');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (p: SubscriptionPlan) => {
    try {
      await adminService.togglePlan(p.id);
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle plan status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-charcoal-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="brand" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase font-bold">
              Subscription Architecture
            </Badge>
            <span className="text-charcoal-600">•</span>
            <span className="text-xs text-charcoal-400">Configurable Yearly Tiers</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
            Yearly Plans &amp; Quota Limits
          </h1>
          <p className="mt-1 text-xs text-charcoal-400">
            Define pricing in INR, configure event quotas, guest capacities, and customize template permissions.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          size="sm"
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Plan</span>
        </Button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-charcoal-500 animate-pulse">
          Loading subscription tiers...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`p-6 rounded-3xl bg-charcoal-900/60 border flex flex-col justify-between transition-all ${
                p.isActive
                  ? p.isPopular
                    ? 'border-purple-500/50 ring-1 ring-purple-500/20 shadow-xl'
                    : 'border-charcoal-800'
                  : 'border-charcoal-800/40 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant={p.isActive ? (p.isPopular ? 'brand' : 'default') : 'danger'}
                    className="text-[10px] uppercase font-bold"
                  >
                    {p.isActive ? (p.isPopular ? 'Popular Choice' : 'Active Plan') : 'Disabled'}
                  </Badge>
                  <span className="text-[10px] font-mono text-charcoal-500 uppercase">Tier {p.tier}</span>
                </div>

                <h3 className="font-display font-bold text-xl text-white mt-1">{p.name}</h3>
                <span className="text-xs font-mono text-purple-400 block mt-0.5">{p.code}</span>

                {/* Price Display */}
                <div className="mt-4 flex items-baseline">
                  <span className="font-display font-black text-3xl text-white">
                    {p.priceYearly === 0 ? '₹0' : `₹${(p.priceYearly / 100).toLocaleString('en-IN')}`}
                  </span>
                  <span className="ml-1 text-xs text-charcoal-400">/year</span>
                </div>

                <p className="text-xs text-charcoal-400 mt-2 min-h-[32px]">
                  {p.description || 'Yearly membership plan'}
                </p>

                {/* Limits summary */}
                <div className="mt-4 p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800 space-y-1.5 text-xs text-charcoal-300">
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
                    <span className="text-charcoal-400">Custom Studio:</span>
                    <strong className={p.canUploadCustomTemplates ? 'text-emerald-400' : 'text-charcoal-500'}>
                      {p.canUploadCustomTemplates ? 'Enabled' : 'Disabled'}
                    </strong>
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="mt-4 space-y-1.5 text-xs text-charcoal-400">
                  {p.features?.slice(0, 4).map((f, idx) => (
                    <div key={idx} className="flex items-start">
                      <Check className="w-3.5 h-3.5 text-purple-400 mr-2 shrink-0 mt-0.5" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-4 border-t border-charcoal-800 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditModal(p)}
                  className="flex-1 border-charcoal-700 text-charcoal-200 hover:text-white text-xs px-2 py-1 h-auto"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  <span>Edit Plan</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(p)}
                  className={`text-xs px-2 py-1 h-auto border-charcoal-700 ${
                    p.isActive ? 'text-charcoal-400 hover:text-red-400' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  {p.isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Form Modal (Create / Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-charcoal-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-charcoal-800 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto space-y-5">
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
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
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
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono uppercase focus:outline-hidden focus:border-purple-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal-400 font-semibold mb-1">Yearly Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono focus:outline-hidden focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-charcoal-400 font-semibold mb-1">Tier Level (0-3)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    required
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white font-mono focus:outline-hidden focus:border-purple-500"
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
                    className="rounded bg-charcoal-800 border-charcoal-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Allow Custom Templates</span>
                </label>

                <label className="flex items-center space-x-2 text-charcoal-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="rounded bg-charcoal-800 border-charcoal-700 text-purple-600 focus:ring-purple-500"
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
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
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
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 p-2.5 text-white font-mono text-[11px] focus:outline-hidden focus:border-purple-500 leading-relaxed"
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
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                >
                  {formSubmitting ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
