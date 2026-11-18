'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthContext';
import { rsvpService, OverallRsvpSummary } from '@/services/rsvp.service';
import { eventService, EventItem } from '@/services/event.service';

export default function DashboardPage() {
  const { user } = useAuth();
  const hostName = user?.name || user?.mobile || 'Host';

  const [metrics, setMetrics] = useState<OverallRsvpSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      rsvpService.getOverallRsvpSummary().catch(() => null),
      eventService.listEvents({ limit: 5 }).catch(() => ({ events: [] }))
    ])
      .then(([m, evRes]) => {
        if (m) setMetrics(m);
        if (evRes?.events) setRecentEvents(evRes.events);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const totalInvited = metrics?.totalInvited ?? 0;
  const totalIn = metrics?.totalIn ?? 0;
  const totalOut = metrics?.totalOut ?? 0;
  const totalNotResponded = metrics?.totalNotResponded ?? 0;
  const totalEvents = metrics?.totalEvents ?? recentEvents.length;
  const totalMyGuests = metrics?.totalMyGuests ?? 0;

  const percentIn = totalInvited > 0 ? Math.round((totalIn / totalInvited) * 100) : 0;
  const percentResponded = totalInvited > 0 ? Math.round(((totalIn + totalOut) / totalInvited) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Host Workspace</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal-900 tracking-tight">
            Welcome back, {hostName}
          </h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Manage your reusable guest book, track upcoming events, and view private aggregate RSVP attendance.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/guests">
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
              My Guests ({totalMyGuests})
            </Button>
          </Link>
          <Link href="/events">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Aggregate Attendance & Metrics Overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-charcoal-900">
              Workspace RSVP Overview
            </h2>
            <p className="text-xs text-charcoal-500">
              Aggregate attendance across all your celebrations. Individual guest responses remain strictly private.
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Private RSVP Architecture</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Invited */}
          <Card className="p-5 border-surface-border">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Total Invited
              </p>
              <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="font-display font-extrabold text-3xl text-charcoal-900 mt-2">
              {loading ? '...' : totalInvited}
            </p>
            <p className="text-[11px] text-charcoal-400 mt-1">across {totalEvents} celebration(s)</p>
          </Card>

          {/* Card 2: Accepted (IN) */}
          <Card className="p-5 border-emerald-200 bg-emerald-50/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Accepted (IN)
              </p>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="font-display font-extrabold text-3xl text-emerald-700 mt-2">
              {loading ? '...' : totalIn}
            </p>
            <p className="text-[11px] text-emerald-600 mt-1">
              {percentIn}% confirmed attendance
            </p>
          </Card>

          {/* Card 3: Declined (OUT) */}
          <Card className="p-5 border-surface-border">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                Declined (OUT)
              </p>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="font-display font-extrabold text-3xl text-charcoal-700 mt-2">
              {loading ? '...' : totalOut}
            </p>
            <p className="text-[11px] text-charcoal-400 mt-1">cannot attend</p>
          </Card>

          {/* Card 4: Not Responded */}
          <Card className="p-5 border-amber-200 bg-amber-50/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Not Responded
              </p>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="font-display font-extrabold text-3xl text-amber-700 mt-2">
              {loading ? '...' : totalNotResponded}
            </p>
            <p className="text-[11px] text-amber-700 mt-1">awaiting response</p>
          </Card>
        </div>

        {/* Visual Progress Bar */}
        {totalInvited > 0 && (
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-2">
            <div className="flex items-center justify-between text-xs text-charcoal-600 font-medium">
              <span>Overall Response Rate ({percentResponded}%)</span>
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

      {/* RSVP Privacy Banner */}
      <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200/80 flex items-start space-x-3 text-sm text-brand-900">
        <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Privacy-First Architecture: </span>
          <span>
            Only aggregate counts (Total Invited, Accepted, Declined, Not Responded) are delivered to your host dashboard. Individual guest response choices and timestamps are never sent to your browser, guaranteeing complete invitee privacy.
          </span>
        </div>
      </div>

      {/* Active Events Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Your scheduled celebrations and invitation status</CardDescription>
          </div>
          <Link href="/events">
            <Button variant="ghost" size="sm">
              <span>View All</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-charcoal-400">Loading events...</div>
          ) : recentEvents.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="font-display font-bold text-base text-charcoal-900">
                No celebrations created yet
              </h4>
              <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
                Create your first celebration event to add guests, generate personalized links, and track private RSVPs.
              </p>
              <div className="pt-2">
                <Link href="/events">
                  <Button variant="primary" size="sm">
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span>Create First Event</span>
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl border border-surface-border bg-surface-card hover:border-brand-300 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-charcoal-900 text-base">
                        {ev.name}
                      </h4>
                      <p className="text-xs text-charcoal-500">
                        {new Date(ev.eventDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}{' '}
                        &bull; {ev.venue}{' '}
                        {ev.effectiveDeadline && (
                          <span className="text-brand-700 font-medium">
                            &bull; RSVP Deadline:{' '}
                            {new Date(ev.effectiveDeadline).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <Badge variant="brand" className="text-xs">
                      {ev.eventType}
                    </Badge>
                    <Link href={`/events/${ev.id}`}>
                      <Button variant="outline" size="sm">
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                    <Link href="/invitations">
                      <Button variant="secondary" size="sm">
                        <Send className="w-3.5 h-3.5 mr-1" />
                        <span>Invites</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
