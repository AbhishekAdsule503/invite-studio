'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  CheckCircle2,
  MessageSquare,
  ExternalLink,
  Sparkles,
  Users,
  Search,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Clock,
  Play,
  AlertCircle,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthContext';
import { eventService, EventItem } from '@/services/event.service';
import { invitationService, InvitationItem } from '@/services/invitation.service';
import { GenerateInvitationsModal } from '@/components/invitations/GenerateInvitationsModal';
import { WhatsAppDispatchStepperModal } from '@/components/invitations/WhatsAppDispatchStepperModal';

export default function InvitationsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SENT'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showStepperModal, setShowStepperModal] = useState(false);
  const [stepperInvitations, setStepperInvitations] = useState<InvitationItem[]>([]);
  const [stepperStartIndex, setStepperStartIndex] = useState(0);

  const loadEvents = useCallback(async () => {
    try {
      const data = await eventService.listEvents({ limit: 100 });
      setEvents(data.events);
      if (data.events.length > 0 && !selectedEventId) {
        setSelectedEventId(data.events[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load events.');
    }
  }, [selectedEventId]);

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load invitations when selected event or status changes
  const loadInvitations = useCallback(async () => {
    if (!selectedEventId) {
      setInvitations([]);
      setSelectedIds(new Set());
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await invitationService.listInvitations({
        eventId: selectedEventId,
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 100
      });
      setInvitations(res.invitations);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations.');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, search, statusFilter]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleCopyLink = (inv: InvitationItem) => {
    navigator.clipboard.writeText(inv.invitationUrl);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMarkSent = async (invId: string) => {
    try {
      await invitationService.markInvitationSent(invId);
      loadInvitations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update invitation status.');
    }
  };

  const handleDeleteInvitation = async (invId: string) => {
    if (!confirm('Are you sure you want to delete this invitation? The guest link will become invalid.')) {
      return;
    }
    try {
      await invitationService.deleteInvitation(invId);
      loadInvitations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete invitation.');
    }
  };

  // Launch modal for all or pending invitations
  const startSequentialStepper = (startFromPending = true) => {
    if (invitations.length === 0) return;
    setStepperInvitations(invitations);
    if (startFromPending) {
      const firstPendingIdx = invitations.findIndex((i) => i.whatsappStatus === 'PENDING');
      setStepperStartIndex(firstPendingIdx !== -1 ? firstPendingIdx : 0);
    } else {
      setStepperStartIndex(0);
    }
    setShowStepperModal(true);
  };

  // Launch modal for specifically selected guests in bulk
  const startSelectedStepper = () => {
    const selectedList = invitations.filter((inv) => selectedIds.has(inv.id));
    if (selectedList.length === 0) return;
    setStepperInvitations(selectedList);
    setStepperStartIndex(0);
    setShowStepperModal(true);
  };

  // Launch modal for single guest row
  const startSingleGuestStepper = (inv: InvitationItem) => {
    setStepperInvitations([inv]);
    setStepperStartIndex(0);
    setShowStepperModal(true);
  };

  // Table row selection toggles
  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(invitations.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Metrics calculation
  const totalCount = invitations.length;
  const sentCount = invitations.filter((i) => i.whatsappStatus === 'SENT').length;
  const pendingCount = totalCount - sentCount;
  const currentEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display font-extrabold text-3xl text-charcoal-900 tracking-tight">
              Personalized Invitations
            </h1>
            <Badge variant="brand" className="text-xs">
              Universal Luxury Design
            </Badge>
          </div>
          <p className="mt-1 text-sm text-charcoal-500">
            Generate secure digital luxury invitation links, preview bilingual messages, and dispatch via WhatsApp with optional card attachment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowGenerateModal(true)}
            disabled={events.length === 0}
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            <span>Generate Invitations</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold">
            ×
          </button>
        </div>
      )}

      {/* WhatsApp Transparency Notice */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start space-x-3">
        <MessageSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-emerald-950">WhatsApp Click-to-Chat Flow: </span>
          <span>
            INVITE STUDIO prepares personalized bilingual greeting messages with unique cryptographic RSVP tokens and optional attached luxury card images. Clicking &quot;Share on WhatsApp&quot; launches your WhatsApp with the chat pre-filled. You press Send manually in WhatsApp and mark the invitation as sent. No spam bots or unverified bulk automation.
          </span>
        </div>
      </div>

      {/* Event Selection Bar & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Selector Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
              Select Celebration Event
            </label>
            {events.length === 0 ? (
              <p className="text-xs text-charcoal-400">No events found. Please create an event first.</p>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-sm text-charcoal-900 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({new Date(ev.eventDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}
          </div>

          {currentEvent && (
            <div className="mt-3 pt-3 border-t border-surface-border text-xs text-charcoal-500 flex items-center justify-between">
              <span className="truncate max-w-[150px]">{currentEvent.venue}</span>
              <Badge variant="brand" className="text-[10px]">
                {currentEvent.eventType}
              </Badge>
            </div>
          )}
        </Card>

        {/* Metric 1 */}
        <Card className="p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
              Total Generated
            </span>
            <h3 className="font-display font-extrabold text-2xl text-charcoal-900 mt-0.5">
              {totalCount}
            </h3>
            <span className="text-[11px] text-charcoal-500">invitations prepared</span>
          </div>
        </Card>

        {/* Metric 2 */}
        <Card className="p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
              Dispatched via WhatsApp
            </span>
            <h3 className="font-display font-extrabold text-2xl text-emerald-600 mt-0.5">
              {sentCount}
            </h3>
            <span className="text-[11px] text-charcoal-500">
              {totalCount > 0 ? `${Math.round((sentCount / totalCount) * 100)}% sent` : '0%'}
            </span>
          </div>
        </Card>

        {/* Metric 3 */}
        <Card className="p-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
                Pending Dispatch
              </span>
              <h3 className="font-display font-extrabold text-2xl text-amber-600 mt-0.5">
                {pendingCount}
              </h3>
              <span className="text-[11px] text-charcoal-500">ready to share</span>
            </div>
          </div>

          {pendingCount > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => startSequentialStepper(true)}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              <span>Dispatch</span>
            </Button>
          )}
        </Card>
      </div>

      {/* Bulk Action Bar (when guests are selected) */}
      {selectedIds.size > 0 && (
        <div className="p-4 rounded-xl bg-brand-50/80 border border-brand-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-900">
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
            <span>{selectedIds.size} guest(s) selected for WhatsApp sharing</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs"
            >
              Deselect All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={startSelectedStepper}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 text-xs"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Dispatch {selectedIds.size} Selected Guests</span>
            </Button>
          </div>
        </div>
      )}

      {/* Filter and Table Toolbar */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-card">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                placeholder="Search guest name or number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-surface-border bg-surface-card text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'SENT')}
              className="px-3 py-1.5 rounded-xl border border-surface-border bg-surface-card text-xs text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending Only</option>
              <option value="SENT">Sent Only</option>
            </select>

            <Button variant="ghost" size="sm" onClick={() => loadInvitations()} title="Refresh list">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {invitations.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startSequentialStepper(false)}
            >
              <MessageSquare className="w-4 h-4 mr-1.5 text-emerald-600" />
              <span>Launch WhatsApp Stepper</span>
            </Button>
          )}
        </div>

        {/* Invitations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-warm border-b border-surface-border text-xs uppercase text-charcoal-500 font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={invitations.length > 0 && selectedIds.size === invitations.length}
                    onChange={(e) => handleSelectAllRows(e.target.checked)}
                    className="rounded border-surface-border text-brand-600 focus:ring-brand-500"
                    title="Select all guests"
                  />
                </th>
                <th className="px-6 py-3.5">Guest &amp; WhatsApp</th>
                <th className="px-6 py-3.5">Celebration Details</th>
                <th className="px-6 py-3.5">Public RSVP Link</th>
                <th className="px-6 py-3.5">Dispatch Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-charcoal-400">
                    Loading invitations...
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center space-y-3">
                    <p className="text-sm font-semibold text-charcoal-700">No invitations generated yet</p>
                    <p className="text-xs text-charcoal-400 max-w-sm mx-auto">
                      Assign guests to this celebration and click Generate Invitations to create unique cryptographic links.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowGenerateModal(true)}
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      <span>Generate Invitations</span>
                    </Button>
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const isChecked = selectedIds.has(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-surface-warm/50 transition-colors ${isChecked ? 'bg-brand-50/20' : ''
                        }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(inv.id)}
                          className="rounded border-surface-border text-brand-600 focus:ring-brand-500"
                        />
                      </td>

                      {/* Guest info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-charcoal-900">{inv.eventGuest.name}</span>
                          {inv.eventGuest.relation && (
                            <Badge variant="default" className="text-[10px]">
                              {inv.eventGuest.relation}
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-xs text-charcoal-500 mt-0.5">
                          {inv.eventGuest.whatsappNumber}
                        </p>
                      </td>

                      {/* Celebration Details */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-charcoal-800 line-clamp-1">
                          {currentEvent?.name || inv.eventName || 'Celebration Event'}
                        </span>
                        <div className="flex items-center space-x-1.5 text-[11px] text-charcoal-400 mt-0.5">
                          <span>
                            {currentEvent
                              ? new Date(currentEvent.eventDate).toLocaleDateString()
                              : ''}
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[140px]">
                            {currentEvent?.venue || inv.eventVenue}
                          </span>
                        </div>
                      </td>

                      {/* RSVP Link */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <a
                            href={inv.invitationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-brand-600 hover:text-brand-800 underline truncate max-w-[180px]"
                          >
                            /invite/{inv.token.substring(0, 8)}...
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inv)}
                            className="text-charcoal-400 hover:text-brand-600 p-1 rounded-md hover:bg-surface-warm transition-colors"
                            title="Copy full invitation URL"
                          >
                            {copiedId === inv.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {inv.whatsappStatus === 'SENT' ? (
                          <div className="space-y-0.5">
                            <Badge variant="success">Sent</Badge>
                            {inv.sentAt && (
                              <p className="text-[10px] text-charcoal-400">
                                {new Date(inv.sentAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge variant="default">Pending</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startSingleGuestStepper(inv)}
                          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" />
                          <span>WhatsApp</span>
                        </Button>

                        {inv.whatsappStatus !== 'SENT' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMarkSent(inv.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>Mark Sent</span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvitation(inv.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      {showGenerateModal && (
        <GenerateInvitationsModal
          isOpen={showGenerateModal}
          events={events}
          selectedEventId={selectedEventId}
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => {
            loadInvitations();
          }}
        />
      )}

      {showStepperModal && stepperInvitations.length > 0 && (
        <WhatsAppDispatchStepperModal
          isOpen={showStepperModal}
          invitations={stepperInvitations}
          startIndex={stepperStartIndex}
          eventName={currentEvent?.name}
          eventType={currentEvent?.eventType}
          eventDate={currentEvent?.eventDate}
          eventTime={currentEvent?.eventTime}
          venue={currentEvent?.venue}
          hostName={user?.name || currentEvent?.name || 'Your Host'}
          onClose={() => setShowStepperModal(false)}
          onStatusUpdated={() => {
            loadInvitations();
          }}
        />
      )}
    </div>
  );
}
