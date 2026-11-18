'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  Users,
  Search,
  Trash2,
  Edit2,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { eventService, EventItem } from '@/services/event.service';
import { CreateEventModal } from '@/components/events/CreateEventModal';

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await eventService.listEvents({
        search: searchTerm,
        eventType: typeFilter,
        page,
        limit: 12
      });
      setEvents(data.events);
      setTotalPages(data.pagination.totalPages);
      setTotalEvents(data.pagination.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load events.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter, page]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchEvents();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchEvents]);

  const handleDelete = async (event: EventItem) => {
    if (!confirm(`Are you sure you want to delete "${event.name}"? This will remove its event guest list.`)) {
      return;
    }
    try {
      await eventService.deleteEvent(event.id);
      fetchEvents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Celebrations ({totalEvents} Total)</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl text-charcoal-900 tracking-tight">
            Events &amp; Celebrations
          </h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Create events, assign guests from your reusable directory, and configure RSVP deadlines.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingEvent(null);
            setIsCreateModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Create Event</span>
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by event name or venue..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-border bg-surface-card text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { label: 'All', value: '' },
              { label: 'Wedding', value: 'WEDDING' },
              { label: 'Birthday', value: 'BIRTHDAY' },
              { label: 'Anniversary', value: 'ANNIVERSARY' },
              { label: 'Family Gathering', value: 'FAMILY_GATHERING' },
              { label: 'Other', value: 'OTHER' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setTypeFilter(tab.value);
                  setPage(1);
                }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
                  typeFilter === tab.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-warm text-charcoal-600 hover:bg-surface-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Events Grid */}
      {loading ? (
        <div className="p-16 text-center text-sm text-charcoal-400">
          <Calendar className="w-8 h-8 animate-pulse text-brand-500 mx-auto mb-2" />
          <p>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-lg text-charcoal-900">
            No events scheduled
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            {searchTerm || typeFilter
              ? 'No celebrations match your current search criteria.'
              : 'Create your first celebration to start building your independent event guest list.'}
          </p>
          {!searchTerm && !typeFilter && (
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingEvent(null);
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Create Celebration</span>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => {
            const formattedDate = new Date(ev.eventDate).toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            const deadlineDate = ev.effectiveDeadline
              ? new Date(ev.effectiveDeadline).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                })
              : null;

            return (
              <Card
                key={ev.id}
                className="hover:border-brand-300 transition-all shadow-xs flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="brand" className="capitalize">
                      {ev.eventType.replace('_', ' ').toLowerCase()}
                    </Badge>

                    {deadlineDate && (
                      <span className="text-[11px] font-medium text-charcoal-500 bg-surface-warm px-2 py-0.5 rounded-full">
                        RSVP by {deadlineDate}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-xl text-charcoal-900 mb-2 group-hover:text-brand-700 transition-colors">
                    {ev.name}
                  </h3>

                  <div className="space-y-2 text-xs text-charcoal-600 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 text-brand-600 mr-2 shrink-0" />
                      <span>{formattedDate} {ev.eventTime ? `at ${ev.eventTime}` : ''}</span>
                    </div>

                    <div className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 text-brand-600 mr-2 shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </div>

                    <div className="flex items-center">
                      <Users className="w-3.5 h-3.5 text-brand-600 mr-2 shrink-0" />
                      <span className="font-semibold text-charcoal-900">{ev.guestCount} Assigned Guests</span>
                    </div>
                  </div>

                  {ev.description && (
                    <p className="text-xs text-charcoal-500 line-clamp-2 border-t border-surface-border/60 pt-2 mb-2">
                      {ev.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-surface-border flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingEvent(ev);
                        setIsCreateModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-charcoal-400 hover:text-brand-600 hover:bg-surface-warm"
                      title="Edit Event"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ev)}
                      className="p-1.5 rounded-lg text-charcoal-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Link href={`/events/${ev.id}`}>
                    <Button variant="outline" size="sm">
                      <span>Manage Guests</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-6 py-3.5 bg-surface-card rounded-xl border border-surface-border flex items-center justify-between text-xs text-charcoal-500">
          <span>
            Page {page} of {totalPages} ({totalEvents} total celebrations)
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingEvent(null);
        }}
        initialData={editingEvent}
        onSuccess={() => fetchEvents()}
      />
    </div>
  );
}
