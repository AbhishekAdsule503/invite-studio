'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  UserPlus,
  ArrowLeft,
  Trash2,
  Search,
  Phone,
  Mail,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { eventService, EventItem, EventGuest } from '@/services/event.service';
import { rsvpService, EventRsvpSummary } from '@/services/rsvp.service';
import { AddEventGuestsModal } from '@/components/events/AddEventGuestsModal';

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [rsvpSummary, setRsvpSummary] = useState<EventRsvpSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddGuestsModalOpen, setIsAddGuestsModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ev, guestRes, rsvpRes] = await Promise.all([
        eventService.getEvent(eventId),
        eventService.listEventGuests(eventId, { search: searchTerm, limit: 150 }),
        rsvpService.getEventRsvpSummary(eventId).catch(() => null)
      ]);
      setEvent(ev);
      setGuests(guestRes.guests);
      setRsvpSummary(rsvpRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load event details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [eventId, searchTerm]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchEventData();
    }, 200);
    return () => clearTimeout(delayDebounce);
  }, [fetchEventData]);

  const handleRemoveGuest = async (eventGuest: EventGuest) => {
    if (
      !confirm(
        `Remove ${eventGuest.name} from this celebration? (Note: Permanent guest data in your address book will NOT be deleted).`
      )
    ) {
      return;
    }

    setRemovingId(eventGuest.id);
    try {
      await eventService.removeEventGuest(eventId, eventGuest.id);
      fetchEventData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove guest');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading && !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-sm text-charcoal-400">
        <Calendar className="w-8 h-8 animate-pulse text-brand-500 mx-auto mb-2" />
        <p>Loading celebration details &amp; guest list...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 max-w-md mx-auto">
          {error || 'Event not found or has been deleted.'}
        </div>
        <Link href="/events">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back to All Celebrations</span>
          </Button>
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(event.eventDate).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const deadlineFormatted = event.effectiveDeadline
    ? new Date(event.effectiveDeadline).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  // Aggregate RSVP numbers
  const totalInvited = rsvpSummary?.totalInvited ?? guests.length;
  const totalIn = rsvpSummary?.totalIn ?? 0;
  const totalOut = rsvpSummary?.totalOut ?? 0;
  const totalNotResponded = rsvpSummary?.totalNotResponded ?? Math.max(0, totalInvited - (totalIn + totalOut));

  const percentIn = totalInvited > 0 ? Math.round((totalIn / totalInvited) * 100) : 0;
  const percentResponded = totalInvited > 0 ? Math.round(((totalIn + totalOut) / totalInvited) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Back Navigation & Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-charcoal-500">
        <Link href="/events" className="hover:text-brand-600 transition-colors flex items-center">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>All Events</span>
        </Link>
        <span>/</span>
        <span className="font-semibold text-charcoal-900">{event.name}</span>
      </div>

      {/* Event Details Hero Card */}
      <Card className="p-6 bg-gradient-to-br from-surface-card to-brand-50/20 border-surface-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Badge variant="brand" className="uppercase tracking-wider">
                {event.eventType.replace('_', ' ')}
              </Badge>
              {deadlineFormatted && (
                <span className="text-xs font-semibold text-brand-800 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                  RSVP closes: {deadlineFormatted}
                </span>
              )}
            </div>

            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal-900 tracking-tight">
              {event.name}
            </h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-charcoal-600">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-brand-600 mr-2 shrink-0" />
                <span className="font-medium">{formattedDate} {event.eventTime ? `at ${event.eventTime}` : ''}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-brand-600 mr-2 shrink-0" />
                <span>{event.venue}</span>
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 text-brand-600 mr-2 shrink-0" />
                <span className="font-bold text-charcoal-900">{guests.length} Invited Guest(s)</span>
              </div>
            </div>

            {event.description && (
              <p className="text-xs text-charcoal-500 max-w-2xl pt-1">
                {event.description}
              </p>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <Link href="/invitations">
              <Button variant="outline" size="sm">
                <Send className="w-4 h-4 mr-1.5" />
                <span>Manage Invitations</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddGuestsModalOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              <span>Add Guests to Celebration</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Aggregate RSVP Attendance Cards (Strict Privacy: Aggregate Only) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-charcoal-900">
              RSVP Attendance Overview
            </h3>
            <p className="text-xs text-charcoal-500">
              Real-time aggregate attendance totals. Individual guest choices are kept strictly private.
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Privacy-First Guarantee</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Invited */}
          <Card className="p-5 border-surface-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Total Invited
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="font-display font-extrabold text-3xl text-charcoal-900 mt-2">
              {totalInvited}
            </p>
            <p className="text-[11px] text-charcoal-400 mt-1">invitations generated / assigned</p>
          </Card>

          {/* 2. Accepted (IN) */}
          <Card className="p-5 border-emerald-200 bg-emerald-50/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Accepted (IN)
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="font-display font-extrabold text-3xl text-emerald-700 mt-2">
              {totalIn}
            </p>
            <p className="text-[11px] text-emerald-600 mt-1">
              {percentIn}% confirmed attendance
            </p>
          </Card>

          {/* 3. Declined (OUT) */}
          <Card className="p-5 border-surface-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Declined (OUT)
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="font-display font-extrabold text-3xl text-charcoal-700 mt-2">
              {totalOut}
            </p>
            <p className="text-[11px] text-charcoal-400 mt-1">cannot attend celebration</p>
          </Card>

          {/* 4. Not Responded */}
          <Card className="p-5 border-amber-200 bg-amber-50/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Not Responded
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="font-display font-extrabold text-3xl text-amber-700 mt-2">
              {totalNotResponded}
            </p>
            <p className="text-[11px] text-amber-700 mt-1">awaiting response</p>
          </Card>
        </div>

        {/* Aggregate Progress Bar */}
        {totalInvited > 0 && (
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-2">
            <div className="flex items-center justify-between text-xs text-charcoal-600 font-medium">
              <span>Attendance Progress ({percentResponded}% response rate)</span>
              <span>{totalIn + totalOut} of {totalInvited} responded</span>
            </div>
            <div className="w-full bg-surface-warm rounded-full h-2.5 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-2.5 transition-all duration-300"
                style={{ width: `${percentIn}%` }}
                title={`${totalIn} Attending (${percentIn}%)`}
              />
              <div
                className="bg-rose-400 h-2.5 transition-all duration-300"
                style={{ width: `${totalInvited > 0 ? (totalOut / totalInvited) * 100 : 0}%` }}
                title={`${totalOut} Declined`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Guest List Card */}
      <Card className="p-0 overflow-hidden shadow-sm border-surface-border">
        {/* Table toolbar */}
        <div className="p-4 border-b border-surface-border bg-surface-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-lg text-charcoal-900">
              Event Guest List ({guests.length})
            </h3>
            <p className="text-xs text-charcoal-500">
              Assigned guest contacts for this celebration. Individual RSVP status is private.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 rounded-xl border border-surface-border bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {guests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-display font-bold text-base text-charcoal-900">
              No guests assigned to this celebration yet
            </h4>
            <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
              Add guests from your permanent &quot;My Guests&quot; directory or enter event-specific attendees.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddGuestsModalOpen(true)}
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                <span>Add First Guest to Event</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-warm border-b border-surface-border text-xs uppercase text-charcoal-500 font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Guest Name</th>
                  <th className="px-6 py-3.5">WhatsApp</th>
                  <th className="px-6 py-3.5">Relation</th>
                  <th className="px-6 py-3.5">Assignment Type</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-white">
                {guests.map((g) => (
                  <tr key={g.id} className="hover:bg-surface-warm/40 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-charcoal-900">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {g.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-charcoal-900">{g.name}</p>
                          {g.email && <p className="text-xs text-charcoal-400">{g.email}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 text-xs text-charcoal-700 font-mono">
                      <a
                        href={`https://wa.me/${g.whatsappNumber.replace('+', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 hover:text-emerald-600 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{g.whatsappNumber}</span>
                      </a>
                    </td>

                    <td className="px-6 py-3.5">
                      <Badge variant="default" className="text-xs">
                        {g.relation || 'Guest'}
                      </Badge>
                    </td>

                    <td className="px-6 py-3.5">
                      {g.guestId ? (
                        <span className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                          <BookmarkCheck className="w-3 h-3 mr-1" />
                          Permanent Directory
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold text-charcoal-600 bg-surface-warm border border-surface-border px-2.5 py-0.5 rounded-full">
                          Event Only
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleRemoveGuest(g)}
                        disabled={removingId === g.id}
                        className="p-1.5 rounded-lg text-charcoal-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove from Event (leaves My Guests intact)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Guests Modal */}
      <AddEventGuestsModal
        isOpen={isAddGuestsModalOpen}
        eventId={eventId}
        eventName={event.name}
        currentEventGuests={guests}
        onClose={() => setIsAddGuestsModalOpen(false)}
        onSuccess={() => fetchEventData()}
      />
    </div>
  );
}
