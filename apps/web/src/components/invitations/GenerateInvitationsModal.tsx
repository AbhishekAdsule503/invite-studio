'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, Check, AlertCircle, Palette, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { invitationService, InvitationTemplate } from '@/services/invitation.service';
import { eventService, EventItem, EventGuest } from '@/services/event.service';

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
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [eventGuests, setEventGuests] = useState<EventGuest[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [regenerate, setRegenerate] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync active event ID
  useEffect(() => {
    if (selectedEventId) setActiveEventId(selectedEventId);
    else if (events.length > 0) setActiveEventId(events[0].id);
  }, [selectedEventId, events]);

  // Load templates & event guests when modal opens or active event changes
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setLoading(true);

    const currentEv = events.find((e) => e.id === activeEventId);
    const eventType = currentEv ? currentEv.eventType : undefined;

    Promise.all([
      invitationService.listTemplates(eventType),
      activeEventId ? eventService.listEventGuests(activeEventId, { limit: 200 }) : Promise.resolve({ guests: [] })
    ])
      .then(([tmplList, guestRes]) => {
        setTemplates(tmplList);
        if (tmplList.length > 0) {
          setSelectedTemplateId((prev) => {
            if (!prev) {
              setCustomMessage(tmplList[0].defaultMessage || '');
              return tmplList[0].id;
            }
            return prev;
          });
        }
        setEventGuests(guestRes.guests);
        // Default to selecting all guests
        setSelectedGuestIds(new Set(guestRes.guests.map((g) => g.id)));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load options.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, activeEventId, events]);

  if (!isOpen) return null;

  const handleTemplateSelect = (tmpl: InvitationTemplate) => {
    setSelectedTemplateId(tmpl.id);
    if (!customMessage || customMessage === templates.find((t) => t.id === selectedTemplateId)?.defaultMessage) {
      setCustomMessage(tmpl.defaultMessage || '');
    }
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
      await invitationService.generateInvitations({
        eventId: activeEventId,
        templateId: selectedTemplateId || null,
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
                Generates unique, secure digital invitation links and prefilled WhatsApp messages
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
              className="w-full px-3 py-2 rounded-xl border border-surface-border bg-white text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({new Date(ev.eventDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Template Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5 flex items-center justify-between">
              <span>Choose Invitation Design *</span>
              <span className="text-[11px] font-normal text-charcoal-500 lowercase">
                {templates.length} designs available
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-1">
              {templates.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleTemplateSelect(tmpl)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-xs'
                        : 'border-surface-border bg-surface-card hover:border-brand-300'
                    }`}
                  >
                    <div>
                      <div className="w-full h-16 rounded-lg bg-surface-warm overflow-hidden mb-2 relative flex items-center justify-center">
                        {tmpl.previewImageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={tmpl.previewImageUrl}
                            alt={tmpl.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Palette className="w-6 h-6 text-brand-400" />
                        )}
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-charcoal-900 line-clamp-1">{tmpl.title}</p>
                    </div>

                    <Badge variant={tmpl.isSystem ? 'default' : 'brand'} className="text-[9px] mt-1.5 self-start">
                      {tmpl.eventType || 'All'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Custom Personalized Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Personalized WhatsApp Message *
              </label>
              <div className="flex items-center space-x-1">
                {['{{guestName}}', '{{eventName}}', '{{eventDate}}', '{{venue}}'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertTag(tag)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-warm border border-surface-border text-charcoal-600 hover:text-brand-600 hover:border-brand-300"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. Namaste {{guestName}}, you are warmly invited to {{eventName}} on {{eventDate}} at {{venue}}! RSVP: {{invitationUrl}}"
              className="w-full px-3 py-2 rounded-xl border border-surface-border bg-white text-xs text-charcoal-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
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

            <div className="border border-surface-border rounded-xl divide-y divide-surface-border max-h-36 overflow-y-auto">
              {eventGuests.length === 0 ? (
                <div className="p-4 text-center text-xs text-charcoal-400">
                  No guests assigned to this event yet.
                </div>
              ) : (
                eventGuests.map((g) => {
                  const isChecked = selectedGuestIds.has(g.id);
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleToggleGuest(g.id)}
                      className={`px-3 py-2 flex items-center justify-between text-xs cursor-pointer ${
                        isChecked ? 'bg-brand-50/40' : 'hover:bg-surface-warm/40'
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
