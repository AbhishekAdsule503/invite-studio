'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, FileText, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { eventService, EventItem } from '@/services/event.service';
import { EventType, RsvpDeadlineType, validateEventDeadline } from '@smart-invitation/shared';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (event: EventItem) => void;
  initialData?: EventItem | null;
}

export function CreateEventModal({ isOpen, onClose, onSuccess, initialData }: CreateEventModalProps) {
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState<string>(EventType.WEDDING);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [rsvpDeadlineType, setRsvpDeadlineType] = useState<'DAYS_BEFORE' | 'EXACT_DATE'>('DAYS_BEFORE');
  const [rsvpDeadlineDaysBefore, setRsvpDeadlineDaysBefore] = useState(2);
  const [rsvpDeadlineDate, setRsvpDeadlineDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEventType(initialData.eventType || EventType.WEDDING);
      setEventDate(initialData.eventDate ? initialData.eventDate.split('T')[0] : '');
      setEventTime(initialData.eventTime || '');
      setVenue(initialData.venue || '');
      setDescription(initialData.description || '');
      setRsvpDeadlineType(initialData.rsvpDeadlineType || 'DAYS_BEFORE');
      setRsvpDeadlineDaysBefore(initialData.rsvpDeadlineDaysBefore !== null && initialData.rsvpDeadlineDaysBefore !== undefined ? initialData.rsvpDeadlineDaysBefore : 2);
      setRsvpDeadlineDate(initialData.rsvpDeadlineDate ? initialData.rsvpDeadlineDate.split('T')[0] : '');
    } else {
      setName('');
      setEventType(EventType.WEDDING);
      // Default to 14 days in future
      const defaultDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setEventDate(defaultDate);
      setEventTime('18:30');
      setVenue('');
      setDescription('');
      setRsvpDeadlineType('DAYS_BEFORE');
      setRsvpDeadlineDaysBefore(2);
      setRsvpDeadlineDate('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Real-time effective deadline calculation
  let effectiveDeadlineHint = '';
  if (eventDate) {
    if (rsvpDeadlineType === 'DAYS_BEFORE') {
      const d = new Date(eventDate);
      d.setDate(d.getDate() - (Number(rsvpDeadlineDaysBefore) || 0));
      effectiveDeadlineHint = `RSVP responses close on: ${d.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })}`;
    } else if (rsvpDeadlineDate) {
      const d = new Date(rsvpDeadlineDate);
      effectiveDeadlineHint = `RSVP responses close on: ${d.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })}`;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Event name is required.');
      return;
    }
    if (!eventDate) {
      setError('Event date is required.');
      return;
    }
    if (!venue.trim()) {
      setError('Event venue is required.');
      return;
    }

    // Deadline validation
    const deadlineValidation = validateEventDeadline(
      eventDate,
      rsvpDeadlineType,
      rsvpDeadlineDate || undefined,
      rsvpDeadlineDaysBefore
    );

    if (!deadlineValidation.valid) {
      setError(deadlineValidation.error || 'Invalid RSVP deadline settings.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        eventType,
        eventDate,
        eventTime,
        venue,
        description,
        rsvpDeadlineType,
        rsvpDeadlineDate: rsvpDeadlineType === 'EXACT_DATE' ? rsvpDeadlineDate : null,
        rsvpDeadlineDaysBefore: rsvpDeadlineType === 'DAYS_BEFORE' ? Number(rsvpDeadlineDaysBefore) : undefined
      };

      if (initialData) {
        const updated = await eventService.updateEvent(initialData.id, payload);
        onSuccess(updated);
      } else {
        const created = await eventService.createEvent(payload);
        onSuccess(created);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save event.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-surface-card rounded-2xl shadow-xl border border-surface-border overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                {initialData ? 'Edit Event Details' : 'Create New Celebration'}
              </h3>
              <p className="text-xs text-charcoal-500">
                Configure event details, venue, and private RSVP deadline rules
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Event Name *"
                placeholder="e.g. Rohit & Priya's Grand Wedding"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
                Event Type *
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={EventType.WEDDING}>Wedding</option>
                <option value={EventType.BIRTHDAY}>Birthday</option>
                <option value={EventType.ANNIVERSARY}>Anniversary</option>
                <option value={EventType.ENGAGEMENT}>Engagement</option>
                <option value={EventType.HOUSEWARMING}>Housewarming</option>
                <option value={EventType.FAMILY_GATHERING}>Family Gathering</option>
                <option value={EventType.OTHER}>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Event Date *"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />

            <Input
              label="Event Time (Optional)"
              type="text"
              placeholder="e.g. 6:30 PM onwards"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>

          <Input
            label="Venue & Location *"
            placeholder="e.g. Grand Heritage Ballroom, Bandra West, Mumbai"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
              Description / Host Note (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. We warmly invite your family to celebrate our special day with us."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* RSVP Deadline Configuration */}
          <div className="p-4 rounded-xl bg-surface-warm/70 border border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-800">
                  RSVP Attendance Deadline
                </h4>
                <p className="text-[11px] text-charcoal-500">
                  Guests will be reminded to respond before this deadline.
                </p>
              </div>

              <div className="flex items-center space-x-1 bg-surface-card p-1 rounded-lg border border-surface-border text-xs">
                <button
                  type="button"
                  onClick={() => setRsvpDeadlineType('DAYS_BEFORE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    rsvpDeadlineType === 'DAYS_BEFORE'
                      ? 'bg-brand-600 text-white'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  Days Before
                </button>
                <button
                  type="button"
                  onClick={() => setRsvpDeadlineType('EXACT_DATE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    rsvpDeadlineType === 'EXACT_DATE'
                      ? 'bg-brand-600 text-white'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  Exact Date
                </button>
              </div>
            </div>

            {rsvpDeadlineType === 'DAYS_BEFORE' ? (
              <div>
                <label className="block text-xs text-charcoal-600 mb-1">
                  Close RSVP how many days before the event?
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={rsvpDeadlineDaysBefore}
                    onChange={(e) => setRsvpDeadlineDaysBefore(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-24 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-card text-sm font-semibold text-charcoal-900"
                  />
                  <span className="text-xs text-charcoal-500">days before event</span>
                </div>
              </div>
            ) : (
              <Input
                label="Exact RSVP Closing Date"
                type="date"
                value={rsvpDeadlineDate}
                onChange={(e) => setRsvpDeadlineDate(e.target.value)}
                max={eventDate}
              />
            )}

            {effectiveDeadlineHint && (
              <p className="text-xs text-brand-700 font-medium bg-brand-50 p-2 rounded-lg border border-brand-200">
                {effectiveDeadlineHint}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-surface-border flex items-center justify-end space-x-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading}>
              <Check className="w-4 h-4 mr-1.5" />
              <span>{initialData ? 'Update Celebration' : 'Create Celebration'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
