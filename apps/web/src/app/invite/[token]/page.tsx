'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { invitationService, PublicInvitationData } from '@/services/invitation.service';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function InviteeRsvpPage({ params }: PageProps) {
  const { token } = use(params);

  const [invitation, setInvitation] = useState<PublicInvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rsvpStatus, setRsvpStatus] = useState<'IN' | 'OUT' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [rsvpFeedback, setRsvpFeedback] = useState<string>('');
  const [rsvpError, setRsvpError] = useState<string>('');

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    invitationService
      .getPublicInvitation(token)
      .then((data) => {
        setInvitation(data);
        if (data.rsvpStatus) {
          setRsvpStatus(data.rsvpStatus);
          setSubmitted(true);
        }
      })
      .catch((err: unknown) => {
        const anyErr = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
        const msg =
          (err instanceof Error ? err.message : '') ||
          anyErr?.response?.data?.error ||
          anyErr?.response?.data?.message ||
          anyErr?.message ||
          'This invitation link is invalid or has expired. Please verify with your host.';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleRsvp = async (choice: 'IN' | 'OUT') => {
    setSubmittingRsvp(true);
    setRsvpError('');
    try {
      const res = await invitationService.submitPublicRsvp(token, { status: choice });
      setRsvpStatus(choice);
      setSubmitted(true);
      setRsvpFeedback(res.message);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      const msg =
        (err instanceof Error ? err.message : '') ||
        anyErr?.response?.data?.error ||
        anyErr?.response?.data?.message ||
        anyErr?.message ||
        'Failed to submit RSVP. Please try again.';
      setRsvpError(msg);
    } finally {
      setSubmittingRsvp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 my-auto">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-display font-semibold text-charcoal-700">Loading your private invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <Card className="w-full max-w-md p-8 text-center shadow-lg border-surface-border space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="font-display font-bold text-xl text-charcoal-900">
            Invitation Not Found
          </h2>
          <p className="text-xs text-charcoal-500 leading-relaxed">
            {error || 'We could not locate this invitation link. It may have been updated or expired.'}
          </p>
          <div className="pt-2">
            <Link href="/" className="inline-block text-xs font-semibold text-brand-600 hover:text-brand-800">
              Return to INVITE STUDIO
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const formattedDate = new Date(invitation.eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedDeadline = new Date(invitation.effectiveDeadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
      <Card className="w-full max-w-lg shadow-xl border-surface-border overflow-hidden p-0">
        {/* Banner Decorative Header */}
        <div className="bg-gradient-to-tr from-brand-900 via-brand-800 to-brand-600 p-8 text-center text-white relative overflow-hidden">
          {invitation.template?.previewImageUrl && (
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invitation.template.previewImageUrl}
                alt="Card background"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="relative z-10">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Personal Celebration Invitation</span>
            </div>

            <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">
              {invitation.eventName}
            </h1>

            <p className="mt-2 text-sm text-brand-100 font-medium">
              Warmly inviting <span className="font-bold text-white underline decoration-amber-400 decoration-2">{invitation.guestName}</span>
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Personalized Message from Host */}
          {invitation.personalizedMessage && (
            <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200/80 text-xs sm:text-sm text-charcoal-800 italic leading-relaxed text-center">
              &ldquo;{invitation.personalizedMessage}&rdquo;
            </div>
          )}

          {/* Event Logistics */}
          <div className="space-y-3.5 p-4 rounded-2xl bg-surface-warm border border-surface-border text-sm text-charcoal-700">
            <div className="flex items-start">
              <Calendar className="w-4 h-4 text-brand-600 mr-2.5 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-charcoal-900">{formattedDate}</span>
                {invitation.eventTime && (
                  <p className="text-xs text-charcoal-500 mt-0.5">{invitation.eventTime}</p>
                )}
              </div>
            </div>

            <div className="flex items-start">
              <MapPin className="w-4 h-4 text-brand-600 mr-2.5 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-charcoal-900">{invitation.venue}</span>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="w-4 h-4 text-brand-600 mr-2.5 mt-0.5 shrink-0" />
              <div className="text-xs text-charcoal-500">
                Please submit your response by{' '}
                <span className="font-semibold text-charcoal-800">{formattedDeadline}</span>
              </div>
            </div>
          </div>

          {/* Description if any */}
          {invitation.description && (
            <div className="text-xs text-charcoal-600 leading-relaxed border-l-2 border-brand-400 pl-3">
              {invitation.description}
            </div>
          )}

          {/* Error Banner if RSVP submission fails */}
          {rsvpError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{rsvpError}</span>
            </div>
          )}

          {/* Response Submission Status */}
          {invitation.isDeadlinePassed ? (
            <div className="text-center p-5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <Clock className="w-6 h-6 text-amber-600 mx-auto mb-1" />
              <span className="font-semibold text-sm">RSVP Window Closed</span>
              <p className="text-charcoal-600">The deadline for this event was {formattedDeadline}. New responses are no longer accepted.</p>
              {rsvpStatus && (
                <p className="font-semibold pt-1 text-brand-700">
                  Your recorded response: {rsvpStatus === 'IN' ? 'Attending' : 'Not Attending'}
                </p>
              )}
            </div>
          ) : submitted ? (
            <div className="text-center p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Response Recorded: {rsvpStatus === 'IN' ? 'Attending (IN)' : 'Not Attending (OUT)'}
              </h3>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                {rsvpFeedback ||
                  (rsvpStatus === 'IN'
                    ? `Thank you, ${invitation.guestName}! Your attendance has been confirmed.`
                    : `Thank you, ${invitation.guestName}. We have recorded that you cannot make it.`)}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitted(false)}
                className="mt-2 text-xs"
              >
                Change My Response (Available until {formattedDeadline})
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div>
                <h3 className="font-display font-bold text-lg text-charcoal-900">
                  Will you be joining us?
                </h3>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Select your response below to notify the host privately
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleRsvp('IN')}
                  isLoading={submittingRsvp && rsvpStatus === 'IN'}
                  disabled={submittingRsvp}
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 py-4 font-semibold text-white"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  <span>Accept Invitation (IN)</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleRsvp('OUT')}
                  isLoading={submittingRsvp && rsvpStatus === 'OUT'}
                  disabled={submittingRsvp}
                  className="py-4 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 font-semibold"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  <span>Decline (OUT)</span>
                </Button>
              </div>
            </div>
          )}

          {/* Privacy Guarantee Note */}
          <div className="pt-4 border-t border-surface-border text-center text-xs text-charcoal-400 space-y-1">
            <p className="flex items-center justify-center font-medium text-charcoal-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
              Private RSVP Guarantee
            </p>
            <p>
              Your individual response is never displayed publicly or to other guests. Only aggregate counts are visible to the host.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
