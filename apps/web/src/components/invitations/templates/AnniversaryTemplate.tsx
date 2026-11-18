'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Quote,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  Share2
} from 'lucide-react';
import { InvitationTemplateProps } from './types';

// Helper to parse anniversary couple names or event title gracefully
function parseAnniversaryTitle(eventName: string) {
  const clean = eventName.replace(/('s\s+anniversary|anniversary|silver jubilee|vow renewal)$/i, '').trim();
  const separators = [' & ', ' and ', ' + ', ' - '];
  for (const sep of separators) {
    if (clean.includes(sep)) {
      const [first, ...rest] = clean.split(sep);
      const cleanSecond = rest.join(sep).trim().replace(/['’]s$/i, '').trim();
      return {
        names: `${first.trim()} & ${cleanSecond}’s`,
        subtitle: 'Silver Vow',
        isParsed: true
      };
    }
  }
  return { names: eventName, subtitle: 'Celebration', isParsed: false };
}

// Calculate days remaining
function getDaysRemaining(deadlineStr: string): number {
  const deadline = new Date(deadlineStr).getTime();
  const now = new Date().getTime();
  const diffTime = deadline - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function AnniversaryTemplate({
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
  const [shareCopied, setShareCopied] = useState(false);

  const titleInfo = parseAnniversaryTitle(invitation.eventName);

  const eventDateObj = new Date(invitation.eventDate);
  const formattedDate = eventDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });

  const deadlineDateObj = new Date(invitation.effectiveDeadline);
  const formattedDeadline = deadlineDateObj.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short'
  });

  const fullDeadline = deadlineDateObj.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const daysLeft = getDaysRemaining(invitation.effectiveDeadline);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: invitation.eventName,
          text: `You're invited to celebrate ${invitation.eventName}!`,
          url
        });
        return;
      } catch {
        // Fall back to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  const scrollToRsvp = () => {
    const el = document.getElementById('anniversary-rsvp-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const coverImage =
    invitation.coverImageUrl ||
    'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1200&q=80';

  const defaultQuote = '“Twenty-five years, still my favourite hello.”';
  const displayQuote = invitation.personalizedMessage || defaultQuote;

  return (
    <div className="min-h-screen bg-[#fff9f6] text-[#4a2e3a] flex flex-col justify-between selection:bg-[#f7d9de] selection:text-[#4a2e3a]">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-6 pb-14 w-full">
        {/* Top Tag */}
        <p className="text-center text-xs tracking-[0.35em] text-[#8e6e83] uppercase font-medium">
          INVITE STUDIO · <span>SILVER JUBILEE</span>
        </p>

        {/* Hero Rounded Container */}
        <div
          className="mt-4 rounded-[32px] overflow-hidden relative shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #f7d9de 0%, #f3e2c7 55%, #fff9f6 100%)',
            border: '1px solid #f0d6d0'
          }}
        >
          <div className="grid md:grid-cols-[1fr_380px]">
            {/* Left Column */}
            <div className="p-6 sm:p-10 md:p-14 flex flex-col justify-between">
              <div>
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs tracking-[0.2em] font-medium"
                  style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    color: '#8e6e83',
                    border: '1px solid #ead0c8'
                  }}
                >
                  <Heart className="w-3 h-3 text-[#c48a7a] fill-[#c48a7a]/20" />
                  <span>25 YEARS TOGETHER</span>
                </span>

                <p className="font-serif italic text-2xl mt-6 text-[#8e6e83]">
                  Dear {invitation.guestName},
                </p>

                <h1 className="font-serif leading-[1.05] mt-2 text-[#4a2e3a] text-4xl sm:text-5xl md:text-[56px] tracking-tight">
                  <span>{titleInfo.names}</span>{' '}
                  <em style={{ color: '#c48a7a' }} className="font-serif">
                    {titleInfo.subtitle}
                  </em>
                </h1>

                <p className="mt-4 max-w-[440px] leading-relaxed text-[#8e6e83] text-sm sm:text-base">
                  {invitation.description ||
                    `An evening of love, music & memories hosted by ${invitation.hostName || 'their family'} — celebration dinner under fairy lights.`}
                  <br />
                  <span className="font-medium text-[#4a2e3a] mt-1 inline-block">
                    {formattedDate} · {invitation.eventTime || '7 PM'} · {invitation.venue}
                  </span>
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-7">
                  <button
                    type="button"
                    onClick={scrollToRsvp}
                    className="rounded-full px-7 py-3 text-sm font-semibold transition-all hover:brightness-110 shadow-md cursor-pointer"
                    style={{ background: '#4a2e3a', color: '#fff9f6' }}
                  >
                    <span>{submitted ? 'View Your RSVP' : 'Reserve Your Seat'}</span>
                  </button>
                  <span className="text-sm italic font-serif" style={{ color: '#c48a7a' }}>
                    reply by {formattedDeadline}
                  </span>
                </div>
              </div>

              {/* Itinerary Timeline */}
              <div
                className="flex flex-wrap items-center gap-6 mt-8 pt-6"
                style={{ borderTop: '1px solid rgba(200, 138, 122, 0.3)' }}
              >
                <div>
                  <p className="font-serif text-2xl font-bold" style={{ color: '#4a2e3a' }}>
                    {invitation.eventTime || '7 PM'}
                  </p>
                  <p className="text-xs tracking-wider uppercase font-medium" style={{ color: '#8e6e83' }}>
                    VOW RENEWAL
                  </p>
                </div>
                <div>
                  <p className="font-serif text-2xl font-bold" style={{ color: '#4a2e3a' }}>
                    8 PM
                  </p>
                  <p className="text-xs tracking-wider uppercase font-medium" style={{ color: '#8e6e83' }}>
                    CANDLELIGHT DINNER
                  </p>
                </div>
                <div>
                  <p className="font-serif text-2xl font-bold truncate max-w-[140px]" style={{ color: '#4a2e3a' }}>
                    {invitation.venue.split(',')[0]}
                  </p>
                  <p className="text-xs tracking-wider uppercase font-medium" style={{ color: '#8e6e83' }}>
                    CELEBRATION HALL
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Photo with Quote Card */}
            <div className="relative p-4 sm:p-5">
              <div className="rounded-[24px] overflow-hidden h-full min-h-[380px] sm:min-h-[440px] relative shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Anniversary couple celebration"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to top, rgba(74, 46, 58, 0.55), transparent 55%)'
                  }}
                />

                {/* Floating Quote Card */}
                <div
                  className="absolute bottom-4 left-4 right-4 rounded-2xl p-4 flex items-center gap-3 shadow-lg border border-[#f0d6d0]/60"
                  style={{ background: 'rgba(255, 249, 246, 0.94)', backdropFilter: 'blur(8px)' }}
                >
                  <span className="shrink-0 text-[#4a2e3a]">
                    <Quote className="w-4 h-4 fill-[#4a2e3a]/15 rotate-180" />
                  </span>
                  <p className="font-serif italic text-xs sm:text-sm leading-relaxed" style={{ color: '#4a2e3a' }}>
                    {displayQuote.startsWith('“') ? displayQuote : `“${displayQuote}”`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RSVP Section */}
        <div
          id="anniversary-rsvp-section"
          className="rounded-[32px] mt-4 p-6 sm:p-8 md:p-10 text-center bg-white shadow-sm"
          style={{ border: '1px solid #f0d6d0' }}
        >
          <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-[#f7d9de]/60 text-[#4a2e3a]">
            <Heart className="w-5 h-5 fill-[#c48a7a]/30 text-[#c48a7a]" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl mt-3" style={{ color: '#4a2e3a' }}>
            Will you celebrate with us?
          </h2>

          {rsvpError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium flex items-center justify-center space-x-2 max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{rsvpError}</span>
            </div>
          )}

          {/* STATE 1: RSVP Closed */}
          {invitation.isDeadlinePassed ? (
            <div className="mt-6 max-w-md mx-auto space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>RSVP Window Closed</span>
              </div>
              <p className="text-sm text-[#8e6e83]">
                The response window for this celebration was open until {fullDeadline}. New responses are no longer accepted.
              </p>
              {rsvpStatus && (
                <div className="p-4 rounded-2xl bg-[#fff9f6] border border-[#f0d6d0] text-center">
                  <p className="text-xs uppercase tracking-wider text-[#8e6e83] font-semibold">Your Recorded Response</p>
                  <p className="font-serif text-lg font-bold text-[#4a2e3a] mt-0.5">
                    {rsvpStatus === 'IN'
                      ? `Attending with joy · ${companionCount + 1} guest${companionCount > 0 ? 's' : ''}`
                      : 'Sending blessings from afar'}
                  </p>
                </div>
              )}
            </div>
          ) : submitted ? (
            /* STATE 2: RSVP Recorded */
            <div className="mt-6 max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: '#4a2e3a' }}>
                {rsvpStatus === 'IN' ? 'Joyfully Confirmed!' : 'Blessings Received with Thanks'}
              </h3>
              <p className="text-xs sm:text-sm text-[#8e6e83] leading-relaxed">
                {rsvpFeedback ||
                  (rsvpStatus === 'IN'
                    ? `Thank you, ${invitation.guestName}! Your attendance for ${companionCount + 1} guest(s) is recorded.`
                    : `Thank you, ${invitation.guestName}. We have recorded your warm blessings.`)}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onChangeResponse}
                  className="text-xs font-semibold underline underline-offset-4 cursor-pointer hover:opacity-80"
                  style={{ color: '#4a2e3a' }}
                >
                  Change Response (Available until {fullDeadline})
                </button>
              </div>
            </div>
          ) : (
            /* STATE 3: Open for Submission */
            <div className="mt-6 max-w-lg mx-auto space-y-5">
              <p className="text-xs text-[#8e6e83]">
                Please let us know by {fullDeadline} ({daysLeft > 0 ? `${daysLeft} days remaining` : 'closing today'})
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedChoice('IN')}
                  className="rounded-full px-8 py-3.5 text-sm font-medium transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  style={
                    selectedChoice === 'IN'
                      ? {
                          background: 'linear-gradient(135deg, #e8a798, #c48a7a)',
                          color: '#fff',
                          boxShadow: '0 4px 14px rgba(196, 138, 122, 0.4)'
                        }
                      : {
                          border: '1px solid #ead0c8',
                          color: '#8e6e83',
                          background: '#fff'
                        }
                  }
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>With joy, we’ll be there</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChoice('OUT')}
                  className="rounded-full px-8 py-3.5 text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
                  style={
                    selectedChoice === 'OUT'
                      ? {
                          background: '#4a2e3a',
                          color: '#fff9f6',
                          boxShadow: '0 4px 14px rgba(74, 46, 58, 0.3)'
                        }
                      : {
                          border: '1px solid #ead0c8',
                          color: '#8e6e83',
                          background: '#fff'
                        }
                  }
                >
                  <XCircle className="w-4 h-4" />
                  <span>Send blessings from afar</span>
                </button>
              </div>

              {/* Companion Count Selector (when attending) */}
              {selectedChoice === 'IN' && (
                <div
                  className="p-3.5 rounded-2xl max-w-xs mx-auto text-left space-y-1.5"
                  style={{ background: '#fff9f6', border: '1px solid #f0d6d0' }}
                >
                  <label htmlFor="anniversary-companion-select" className="text-xs font-semibold text-[#4a2e3a] block">
                    Total guests attending with you:
                  </label>
                  <select
                    id="anniversary-companion-select"
                    value={companionCount}
                    onChange={(e) => setCompanionCount(Number(e.target.value))}
                    className="w-full bg-white border border-[#ead0c8] rounded-xl px-3 py-1.5 text-sm text-[#4a2e3a] focus:outline-hidden focus:ring-2 focus:ring-[#c48a7a]"
                  >
                    <option value={0}>1 Guest (Just {invitation.guestName})</option>
                    <option value={1}>2 Guests ({invitation.guestName} + 1)</option>
                    <option value={2}>3 Guests ({invitation.guestName} + 2)</option>
                    <option value={3}>4 Guests ({invitation.guestName} + 3)</option>
                    <option value={4}>5 Guests ({invitation.guestName} + 4)</option>
                  </select>
                </div>
              )}

              {/* Confirm RSVP Action */}
              <div>
                <button
                  type="button"
                  disabled={submittingRsvp}
                  onClick={() => onRsvp(selectedChoice, selectedChoice === 'IN' ? companionCount : 0)}
                  className="mt-1 text-sm font-semibold underline underline-offset-4 disabled:opacity-50 cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center gap-1.5"
                  style={{ color: '#4a2e3a' }}
                >
                  {submittingRsvp ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#4a2e3a] border-t-transparent rounded-full animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Confirm RSVP ({selectedChoice === 'IN' ? 'Attending' : 'Not Attending'})</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Privacy Note & Footer */}
        <div className="mt-8 text-center space-y-3">
          <p className="flex items-center justify-center text-xs font-medium text-[#8e6e83] gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#c48a7a]" />
            <span>Private RSVP Guarantee &mdash; Response shared only with the host</span>
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-[#8e6e83]/80">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1 hover:text-[#4a2e3a] transition-colors cursor-pointer"
            >
              <Share2 className="w-3 h-3 text-[#c48a7a]" />
              <span>{shareCopied ? 'Link Copied' : 'Share Invitation'}</span>
            </button>
            <span>·</span>
            <Link href="/" className="hover:text-[#4a2e3a] transition-colors">
              INVITE STUDIO
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
