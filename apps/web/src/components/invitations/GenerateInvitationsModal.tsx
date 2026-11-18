'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, AlertCircle, Users, Languages, RotateCcw, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { invitationService } from '@/services/invitation.service';
import { eventService, EventItem, EventGuest } from '@/services/event.service';
import { DEFAULT_WHATSAPP_TEMPLATES } from '@smart-invitation/shared';

interface GenerateInvitationsModalProps {
  isOpen: boolean;
  events: EventItem[];
  selectedEventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerateInvitationsModal({
  isOpen,
  events,
  selectedEventId,
  onClose,
  onSuccess
}: GenerateInvitationsModalProps) {
  const [activeEventId, setActiveEventId] = useState(selectedEventId);
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN');
  const [customMessage, setCustomMessage] = useState(DEFAULT_WHATSAPP_TEMPLATES.EN);
  const [eventGuests, setEventGuests] = useState<EventGuest[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [regenerate, setRegenerate] = useState(false);

  // Custom card options
  const [cardOption, setCardOption] = useState<'STUDIO' | 'CUSTOM'>('STUDIO');
  const [customCardFile, setCustomCardFile] = useState<File | null>(null);
  const [customCardPreviewUrl, setCustomCardPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync active event ID
  useEffect(() => {
    if (selectedEventId) setActiveEventId(selectedEventId);
    else if (events.length > 0) setActiveEventId(events[0].id);
  }, [selectedEventId, events]);

  // Load event guests when active event changes
  useEffect(() => {
    if (!isOpen || !activeEventId) return;

    setError('');
    setLoading(true);

    eventService
      .listEventGuests(activeEventId, { limit: 200 })
      .then((guestRes) => {
        setEventGuests(guestRes.guests);
        // Default to selecting all guests
        setSelectedGuestIds(new Set(guestRes.guests.map((g) => g.id)));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load guests.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, activeEventId]);

  if (!isOpen) return null;

  const handleLanguageChange = (lang: 'EN' | 'HI') => {
    setLanguage(lang);
    setCustomMessage(DEFAULT_WHATSAPP_TEMPLATES[lang]);
  };

  const handleToggleGuest = (id: string) => {
    const next = new Set(selectedGuestIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedGuestIds(next);
  };

  const handleSelectAllGuests = (check: boolean) => {
    if (check) setSelectedGuestIds(new Set(eventGuests.map((g) => g.id)));
    else setSelectedGuestIds(new Set());
  };

  const insertTag = (tag: string) => {
    setCustomMessage((prev) => prev + ` ${tag}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId) {
      setError('Please select an event.');
      return;
    }
    if (selectedGuestIds.size === 0) {
      setError('Please select at least one guest.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      let uploadedCoverUrl: string | null = null;
      if (cardOption === 'CUSTOM' && customCardFile) {
        const uploadRes = await invitationService.uploadTemplateImage(customCardFile);
        uploadedCoverUrl = uploadRes.imageUrl;
      }

      await invitationService.generateInvitations({
        eventId: activeEventId,
        templateId: null,
        coverImageUrl: uploadedCoverUrl,
        eventGuestIds: Array.from(selectedGuestIds),
        customMessage,
        regenerate
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate invitations.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-surface-card rounded-2xl shadow-xl border border-surface-border overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Generate Personalized Invitations
              </h3>
              <p className="text-xs text-charcoal-500">
                Generates unique, secure digital luxury invitation links for every guest
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-surface-warm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} id="generate-invites-form" className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Event Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
              Target Celebration Event *
            </label>
            <select
              value={activeEventId}
              onChange={(e) => setActiveEventId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({new Date(ev.eventDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Invitation Card Style Option */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Invitation Card Style
              </label>
              <div className="inline-flex rounded-lg bg-surface-warm p-0.5 border border-surface-border text-xs">
                <button
                  type="button"
                  onClick={() => setCardOption('STUDIO')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${cardOption === 'STUDIO'
                      ? 'bg-brand-600 text-white shadow-xs font-semibold'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                    }`}
                >
                  Studio Luxury Design
                </button>
                <button
                  type="button"
                  onClick={() => setCardOption('CUSTOM')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${cardOption === 'CUSTOM'
                      ? 'bg-brand-600 text-white shadow-xs font-semibold'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                    }`}
                >
                  Upload Custom Card
                </button>
              </div>
            </div>

            {cardOption === 'STUDIO' ? (
              <div className="p-4 rounded-xl bg-[#FAF6F0] border border-[#D8B66E]/40 flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full border border-[#D8B66E] bg-[#401526] text-[#D8B66E] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="font-serif italic text-sm">I</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#401526]">
                    Universal Signature Luxury Invitation
                  </p>
                  <p className="text-[11px] text-[#887A78] mt-0.5 leading-relaxed">
                    Every guest automatically receives our studio design in Warm Ivory, Champagne Gold, and Deep Burgundy, dynamically rendered with your celebration date, venue, host name, and guest pass.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-3">
                {customCardPreviewUrl ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-charcoal-900 truncate max-w-[240px]">
                          {customCardFile?.name || 'Custom Card Image'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomCardFile(null);
                          setCustomCardPreviewUrl(null);
                        }}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center space-x-1 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-0.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <div className="relative aspect-[3/2] w-full max-h-48 rounded-lg overflow-hidden border border-[#D8B66E]/40 bg-[#F8F3EB] flex items-center justify-center shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={customCardPreviewUrl}
                        alt="Custom Card Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-[11px] text-charcoal-500 text-center">
                      ✨ This custom card will be attached to each generated invitation and displayed on the guest&apos;s link.
                    </p>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="p-5 rounded-xl border-2 border-dashed border-[#D8B66E]/60 hover:border-[#D8B66E] bg-[#FAF6F0]/60 hover:bg-[#FAF6F0] transition-colors text-center space-y-2">
                      <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 text-brand-600 mx-auto flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-charcoal-900">
                          Upload your own custom card / design
                        </p>
                        <p className="text-[11px] text-charcoal-500 mt-0.5">
                          Supports JPG, PNG, WebP up to 10MB (Wedding card, flyer, custom artwork)
                        </p>
                      </div>
                      <span className="inline-flex items-center text-xs font-semibold text-brand-600 bg-white px-3.5 py-1.5 rounded-lg border border-surface-border shadow-2xs hover:bg-brand-50 transition-colors">
                        Select Card Image
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setCustomCardFile(f);
                          setCustomCardPreviewUrl(URL.createObjectURL(f));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* 3. Language & Custom WhatsApp Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                  Default WhatsApp Message
                </label>
              </div>

              {/* Language Switch */}
              <div className="flex items-center rounded-lg bg-surface-warm p-0.5 border border-surface-border text-xs">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('EN')}
                  className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] transition-all ${language === 'EN'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                    }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('HI')}
                  className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] transition-all ${language === 'HI'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                    }`}
                >
                  हिंदी (Hindi)
                </button>
              </div>
            </div>

            {/* Quick Placeholder Chips */}
            <div className="flex flex-wrap items-center gap-1 mb-2">
              {['{{guestName}}', '{{eventName}}', '{{eventDate}}', '{{venue}}', '{{invitationUrl}}', '{{hostName}}'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-warm border border-surface-border text-charcoal-600 hover:text-brand-600 hover:border-brand-300"
                >
                  {tag}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomMessage(DEFAULT_WHATSAPP_TEMPLATES[language])}
                className="text-[10px] text-charcoal-400 hover:text-charcoal-700 ml-auto flex items-center space-x-1"
                title="Reset message"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <textarea
              rows={5}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-xs text-charcoal-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />
            <p className="text-[11px] text-charcoal-400 mt-1">
              Placeholders will be automatically resolved for each guest upon dispatch.
            </p>
          </div>

          {/* 4. Guest Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Select Guests ({selectedGuestIds.size} of {eventGuests.length} selected)
              </label>
              <button
                type="button"
                onClick={() => handleSelectAllGuests(selectedGuestIds.size !== eventGuests.length)}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                {selectedGuestIds.size === eventGuests.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="border border-surface-border rounded-xl divide-y divide-surface-border max-h-40 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-xs text-charcoal-400">Loading guests...</div>
              ) : eventGuests.length === 0 ? (
                <div className="p-4 text-center text-xs text-charcoal-400">
                  No guests assigned to this celebration yet. Please add guests to the event first.
                </div>
              ) : (
                eventGuests.map((g) => {
                  const isChecked = selectedGuestIds.has(g.id);
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleToggleGuest(g.id)}
                      className={`px-3 py-2 flex items-center justify-between text-xs cursor-pointer ${isChecked ? 'bg-brand-50/40' : 'hover:bg-surface-warm/40'
                        }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleGuest(g.id)}
                          className="rounded border-surface-border text-brand-600 focus:ring-brand-500"
                        />
                        <span className="font-semibold text-charcoal-900">{g.name}</span>
                        <span className="text-charcoal-500 font-mono text-[11px]">({g.whatsappNumber})</span>
                      </div>
                      <Badge variant="default" className="text-[10px]">
                        {g.relation || 'Guest'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 5. Regenerate Option */}
          <div className="p-3 rounded-xl bg-surface-warm border border-surface-border flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-charcoal-900">
                Regenerate Existing Links
              </p>
              <p className="text-[11px] text-charcoal-500">
                Re-issues new cryptographic invitation tokens if invitations already exist.
              </p>
            </div>
            <input
              type="checkbox"
              checked={regenerate}
              onChange={(e) => setRegenerate(e.target.checked)}
              className="rounded border-surface-border text-brand-600 focus:ring-brand-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between bg-surface-card">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            form="generate-invites-form"
            variant="primary"
            size="sm"
            isLoading={submitting}
            disabled={selectedGuestIds.size === 0 || submitting}
          >
            <Send className="w-4 h-4 mr-1.5" />
            <span>Generate {selectedGuestIds.size} Invitation(s)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
