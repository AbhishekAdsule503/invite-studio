'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InvitationTemplateProps } from './types';

export function UnavailableTemplateFallback({
  invitation,
  token,
  rsvpStatus,
  submitted,
  submittingRsvp,
  rsvpFeedback,
  rsvpError,
  companionCount,
  setCompanionCount,
  onRsvp,
  onChangeResponse
}: InvitationTemplateProps) {
  const [selectedChoice, setSelectedChoice] = useState<'IN' | 'OUT'>(rsvpStatus || 'IN');

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

  const templateName = invitation.template?.title || `${invitation.eventType} Design`;

  return (
    <div className="min-h-screen bg-[#f8f3eb] text-[#34232b] flex items-center justify-center p-4 sm:p-6 my-auto w-full">
      <Card className="w-full max-w-xl shadow-2xl border-[#e9ded1] overflow-hidden p-0 bg-[#fffdfc] rounded-2xl">
        {/* Notice Header: Explicit state explaining that this design is in curation */}
        <div className="bg-[#401526] text-[#fffdfc] p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#d8b66e]/20 border border-[#d8b66e]/40 text-xs text-[#d8b66e] font-medium mb-3">
            <Info className="w-3.5 h-3.5" />
            <span>Design Notice · In Curation</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#fffdfc]">
            {invitation.eventName}
          </h1>

          <p className="mt-2 text-sm text-[#f8f3eb]/90">
            Invitation for <span className="font-semibold text-[#d8b66e]">{invitation.guestName}</span>
            {invitation.hostName ? ` · Hosted by ${invitation.hostName}` : ''}
          </p>

          <div className="mt-4 p-3 rounded-xl bg-black/25 border border-[#d8b66e]/20 text-xs text-[#f8f3eb]/80 leading-relaxed max-w-md mx-auto">
            The bespoke visual template for <strong>{templateName}</strong> is currently being prepared.
            INVITE STUDIO currently offers our handcrafted luxury designs for <strong>Weddings</strong> and <strong>Silver Jubilee Anniversaries</strong>.
          </div>
        </div>

        {/* Event Details */}
        <div className="p-6 sm:p-8 space-y-6">
          {invitation.personalizedMessage && (
            <div className="p-4 rounded-xl bg-[#f8f3eb] border border-[#e9ded1] text-xs sm:text-sm text-[#34232b] italic leading-relaxed">
              &ldquo;{invitation.personalizedMessage}&rdquo;
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#f8f3eb]/60 border border-[#e9ded1]">
              <Calendar className="w-4 h-4 text-[#401526] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#34232b] block">Date &amp; Time</span>
                <span className="text-[#887a78]">
                  {formattedDate}
                  {invitation.eventTime ? ` · ${invitation.eventTime}` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#f8f3eb]/60 border border-[#e9ded1]">
              <MapPin className="w-4 h-4 text-[#401526] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#34232b] block">Celebration Venue</span>
                <span className="text-[#887a78]">{invitation.venue}</span>
              </div>
            </div>
          </div>

          {/* RSVP Error message if any */}
          {rsvpError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{rsvpError}</span>
            </div>
          )}

          {/* RSVP Section */}
          <div className="pt-4 border-t border-[#e9ded1]">
            {invitation.isDeadlinePassed ? (
              <div className="text-center space-y-2 py-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>RSVP Window Closed</span>
                </div>
                <p className="text-xs text-[#887a78]">
                  The RSVP deadline ({formattedDeadline}) has passed. Please contact the host directly.
                </p>
                {rsvpStatus && (
                  <p className="text-xs font-semibold text-[#34232b]">
                    Your recorded response: {rsvpStatus === 'IN' ? `Joyfully Attending (${companionCount + 1})` : 'Declined with Regrets'}
                  </p>
                )}
              </div>
            ) : submitted ? (
              <div className="text-center space-y-3 py-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-[#34232b]">
                  {rsvpStatus === 'IN' ? 'Your RSVP has been Confirmed!' : 'Response Recorded'}
                </h3>
                <p className="text-xs text-[#887a78]">
                  {rsvpFeedback ||
                    (rsvpStatus === 'IN'
                      ? `Thank you! Your attendance for ${companionCount + 1} guest(s) is saved.`
                      : 'Thank you for letting the host know.')}
                </p>
                <button
                  type="button"
                  onClick={onChangeResponse}
                  className="text-xs font-semibold text-[#401526] underline underline-offset-4 hover:opacity-80 cursor-pointer"
                >
                  Change Response (Open until {formattedDeadline})
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="text-xs text-[#887a78]">
                  Kindly reply by <span className="font-semibold text-[#34232b]">{formattedDeadline}</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    type="button"
                    variant={selectedChoice === 'IN' ? 'primary' : 'outline'}
                    className={`flex-1 text-xs sm:text-sm ${
                      selectedChoice === 'IN' ? 'bg-[#401526] text-white' : 'border-[#e9ded1] text-[#34232b]'
                    }`}
                    onClick={() => setSelectedChoice('IN')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    <span>Joyfully Accept</span>
                  </Button>

                  <Button
                    type="button"
                    variant={selectedChoice === 'OUT' ? 'primary' : 'outline'}
                    className={`flex-1 text-xs sm:text-sm ${
                      selectedChoice === 'OUT' ? 'bg-[#401526] text-white' : 'border-[#e9ded1] text-[#34232b]'
                    }`}
                    onClick={() => setSelectedChoice('OUT')}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    <span>Decline with Regrets</span>
                  </Button>
                </div>

                {selectedChoice === 'IN' && (
                  <div className="p-3 bg-[#f8f3eb] rounded-xl border border-[#e9ded1] max-w-xs mx-auto text-left">
                    <label htmlFor="fallback-companion-select" className="text-xs font-semibold text-[#34232b] block mb-1">
                      Total attending:
                    </label>
                    <select
                      id="fallback-companion-select"
                      value={companionCount}
                      onChange={(e) => setCompanionCount(Number(e.target.value))}
                      className="w-full bg-white border border-[#e9ded1] rounded-lg px-2.5 py-1 text-xs text-[#34232b] focus:outline-hidden"
                    >
                      <option value={0}>1 Guest (Just {invitation.guestName})</option>
                      <option value={1}>2 Guests ({invitation.guestName} + 1)</option>
                      <option value={2}>3 Guests ({invitation.guestName} + 2)</option>
                      <option value={3}>4 Guests ({invitation.guestName} + 3)</option>
                      <option value={4}>5 Guests ({invitation.guestName} + 4)</option>
                    </select>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  className="w-full bg-[#401526] hover:bg-[#5c2032] text-white text-xs sm:text-sm py-2.5 shadow-md"
                  isLoading={submittingRsvp}
                  onClick={() => onRsvp(selectedChoice, selectedChoice === 'IN' ? companionCount : 0)}
                >
                  Confirm RSVP ({selectedChoice === 'IN' ? 'Attending' : 'Not Attending'})
                </Button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#e9ded1] text-center space-y-2">
            <p className="flex items-center justify-center text-[11px] text-[#887a78]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
              <span>Private RSVP &mdash; Only the host can view aggregate responses</span>
            </p>
            <Link href="/" className="inline-block text-[11px] text-[#401526] hover:underline font-medium">
              Powered by INVITE STUDIO
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
