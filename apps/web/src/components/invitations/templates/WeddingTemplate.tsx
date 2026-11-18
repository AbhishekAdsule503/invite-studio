'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CalendarDays,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Lock,
  Share2,
  HelpCircle,
  Flag,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { InvitationTemplateProps } from './types';

// Helper to parse couple names or event title gracefully
function parseCoupleNames(eventName: string) {
  const cleanName = eventName.replace(/('s\s+wedding|wedding|\s+marriage)$/i, '').trim();
  const separators = [' & ', ' and ', ' + ', ' - '];
  for (const sep of separators) {
    if (cleanName.includes(sep)) {
      const [first, ...rest] = cleanName.split(sep);
      return {
        first: first.trim(),
        second: rest.join(sep).trim(),
        hasCouple: true
      };
    }
  }
  return { first: cleanName, second: '', hasCouple: false };
}

// Calculate days remaining until deadline
function getDaysLeft(deadlineStr: string): number {
  const deadline = new Date(deadlineStr).getTime();
  const now = new Date().getTime();
  const diffTime = deadline - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function WeddingTemplate({
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
  // Local pending selection before confirming
  const [selectedChoice, setSelectedChoice] = useState<'IN' | 'OUT'>(rsvpStatus || 'IN');
  const [shareCopied, setShareCopied] = useState(false);

  const couple = parseCoupleNames(invitation.eventName);

  const eventDateObj = new Date(invitation.eventDate);
  const weekday = eventDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dayNumber = eventDateObj.toLocaleDateString('en-US', { day: '2-digit' });
  const monthShort = eventDateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const monthYear = eventDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const deadlineDateObj = new Date(invitation.effectiveDeadline);
  const formattedDeadline = deadlineDateObj.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const daysLeft = getDaysLeft(invitation.effectiveDeadline);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: invitation.eventName,
          text: `You're invited to ${invitation.eventName}!`,
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
    const el = document.getElementById('wedding-rsvp-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const coverImage =
    invitation.coverImageUrl ||
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="min-h-screen bg-[#f8f3eb] text-[#34232b] flex flex-col justify-between selection:bg-[#d8b66e]/30 selection:text-[#401526]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-4 flex flex-col gap-5 pb-12 w-full">
        {/* BrandHeader */}
        <header className="flex items-center justify-between px-2 sm:px-6 md:px-10 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#401526] flex items-center justify-center shrink-0 shadow-sm">
              <span className="font-serif text-[#d8b66e] text-lg leading-none italic font-normal">I</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[11px] tracking-[0.32em] font-medium text-[#34232b]">
                INVITE STUDIO
              </span>
              <span className="text-[11px] tracking-[0.18em] text-[#b8944f] mt-1 font-medium">
                LUXE CELEBRATIONS
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#887a78]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d8b66e] inline-block animate-pulse"></span>
            <span className="text-xs tracking-[0.2em] font-medium">PRIVATE INVITATION</span>
          </div>
        </header>

        {/* InvitationHero */}
        <section className="relative overflow-hidden rounded-2xl bg-[#401526] text-[#fffdfc] shadow-2xl">
          <div className="grid md:grid-cols-[1.05fr_0.95fr]">
            {/* Left Column: Couple & Host Greeting */}
            <div className="relative px-6 sm:px-8 md:px-14 pt-12 md:pt-16 pb-10 md:pb-14 flex flex-col justify-center overflow-hidden">
              {/* Radial gradient background highlights */}
              <div
                className="absolute inset-0 opacity-60 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(600px 400px at 20% 10%, rgba(216, 182, 110, 0.28), transparent 60%), radial-gradient(500px 500px at 90% 100%, rgba(92, 32, 50, 0.9), transparent 60%)'
                }}
              />
              {/* Gold inset border */}
              <div className="absolute inset-3 sm:inset-4 border border-[#d8b66e]/40 rounded-xl pointer-events-none" />

              {/* Diamond ornament at top */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 flex items-center justify-center gap-2 pointer-events-none">
                <span className="h-px w-8 bg-[#d8b66e]/70" />
                <span className="w-2 h-2 rotate-45 border border-[#d8b66e] bg-transparent inline-block" />
                <span className="h-px w-8 bg-[#d8b66e]/70" />
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 border border-[#d8b66e]/50 rounded-full px-4 py-1.5 bg-[#fffdfc]/5 backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#d8b66e] shrink-0" />
                  <span className="text-xs tracking-[0.28em] text-[#d8b66e] font-medium uppercase">
                    A Celebration of Love
                  </span>
                </div>

                <p className="font-serif italic text-[#d8b66e] text-xl md:text-2xl mt-6">
                  You&apos;re Invited, {invitation.guestName}!
                </p>

                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.05] mt-3 text-[#fffdfc] tracking-tight">
                  {couple.hasCouple ? (
                    <>
                      {couple.first}
                      <span className="italic font-light text-[#d8b66e] mx-3 text-3xl sm:text-4xl md:text-5xl">&amp;</span>
                      <br className="md:hidden" />
                      {couple.second}
                    </>
                  ) : (
                    invitation.eventName
                  )}
                </h1>

                <div className="flex items-center gap-3 mt-5">
                  <span className="h-px w-10 sm:w-12 bg-[#d8b66e]/80" />
                  <span className="text-xs sm:text-sm tracking-[0.22em] text-[#fffdfc]/80 uppercase font-medium">
                    Wedding Celebration
                  </span>
                  <span className="h-px w-10 sm:w-12 bg-[#d8b66e]/80" />
                </div>

                <p className="text-sm text-[#d8b66e] mt-3 font-medium">
                  {invitation.hostName ? `Hosted with love by ${invitation.hostName}` : 'Hosted by our families'}
                </p>

                {invitation.description && (
                  <p className="text-sm text-[#fffdfc]/70 mt-2 leading-relaxed font-sans">
                    {invitation.description}
                  </p>
                )}

                {invitation.personalizedMessage && (
                  <div className="mt-4 p-3.5 rounded-xl bg-[#fffdfc]/10 border border-[#d8b66e]/30 text-xs sm:text-sm text-[#fffdfc]/90 italic leading-relaxed">
                    &ldquo;{invitation.personalizedMessage}&rdquo;
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 mt-8 pt-2">
                  <button
                    type="button"
                    onClick={scrollToRsvp}
                    className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold bg-gradient-to-r from-[#d8b66e] to-[#b8944f] text-[#401526] hover:brightness-105 shadow-md shadow-[#d8b66e]/20 transition-all cursor-pointer"
                  >
                    <span>{submitted ? 'View Your RSVP' : 'Respond to Invitation'}</span>
                  </button>

                  <span className="text-xs text-[#d8b66e] italic font-serif">
                    Reply requested by {formattedDeadline}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Cover Photo with floating logistics card */}
            <div className="relative min-h-[360px] md:min-h-[500px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage}
                alt="Wedding celebration venue"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Arch & side gradient shading */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to right, #401526 0%, rgba(64, 21, 38, 0.55) 18%, rgba(64, 21, 38, 0.05) 45%), linear-gradient(to top, rgba(42, 14, 25, 0.65) 0%, transparent 45%)'
                }}
              />

              {/* Top corner filigree floral ornament */}
              <div className="absolute top-5 right-5 w-16 h-16 border-t border-r border-[#d8b66e]/70 rounded-tr-xl pointer-events-none" />
              <div className="absolute top-7 right-7 text-[#d8b66e]/80 pointer-events-none">
                <Sparkles className="w-5 h-5" />
              </div>

              {/* Floating Date & Venue Summary Card */}
              <div className="absolute bottom-6 left-4 right-4 sm:left-6 sm:right-6 md:left-8 md:right-8 bg-[#fffdfc] text-[#34232b] rounded-xl p-4 sm:p-5 flex gap-4 items-center shadow-xl border border-[#e9ded1]">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#401526] flex flex-col items-center justify-center shrink-0 text-center shadow-sm">
                  <span className="font-serif text-[#fffdfc] text-lg leading-none font-bold">
                    {dayNumber}
                  </span>
                  <span className="text-[10px] tracking-widest text-[#d8b66e] font-semibold mt-0.5">
                    {monthShort}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-sm sm:text-base text-[#34232b] italic font-semibold truncate">
                    {invitation.venue}
                  </p>
                  <p className="text-xs text-[#887a78] mt-0.5">
                    {invitation.eventTime ? `${invitation.eventTime} onwards` : 'Evening celebration'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* EventDetails: WHEN & WHERE */}
        <section className="bg-[#fffdfc] rounded-2xl border border-[#e9ded1] px-6 sm:px-8 md:px-14 py-10 md:py-12 relative overflow-hidden shadow-xs">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-[#d8b66e] rounded-b-full" />

          <div className="text-center">
            <p className="text-xs tracking-[0.32em] text-[#b8944f] uppercase font-semibold">
              When &amp; Where
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-[#34232b] mt-2 font-normal">
              Join Us in Celebration
            </h2>
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="h-px w-14 sm:w-16 bg-[#d8b66e]" />
              <span className="text-[#b8944f]">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="h-px w-14 sm:w-16 bg-[#d8b66e]" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-0 mt-10 md:mt-12">
            {/* Column 1: Date & Time */}
            <div className="flex flex-col items-center text-center md:border-r border-[#e9ded1] px-4">
              <div className="w-11 h-11 rounded-full bg-[#f8f3eb] border border-[#e9ded1] flex items-center justify-center text-[#401526]">
                <CalendarDays className="w-5 h-5 text-[#401526]" />
              </div>
              <p className="text-xs tracking-[0.22em] text-[#887a78] mt-4 font-medium">
                {weekday}
              </p>
              <p className="font-serif text-5xl text-[#401526] leading-none mt-1 font-bold">
                {dayNumber}
              </p>
              <p className="font-serif italic text-lg text-[#34232b]">
                {monthYear}
              </p>
              <p className="text-sm text-[#887a78] mt-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{invitation.eventTime || '6:30 PM onwards'}</span>
              </p>
            </div>

            {/* Column 2: Venue */}
            <div className="flex flex-col items-center text-center md:border-r border-[#e9ded1] px-4">
              <div className="w-11 h-11 rounded-full bg-[#401526] flex items-center justify-center text-[#d8b66e]">
                <MapPin className="w-5 h-5 text-[#d8b66e]" />
              </div>
              <p className="text-xs tracking-[0.22em] text-[#887a78] mt-4 font-medium">
                VENUE
              </p>
              <p className="font-serif text-2xl text-[#34232b] mt-1 font-semibold leading-tight">
                {invitation.venue}
              </p>
              <p className="text-sm text-[#887a78] mt-1 leading-relaxed max-w-[260px]">
                Detailed parking and ballroom access provided at entrance
              </p>
            </div>

            {/* Column 3: Response Deadline */}
            <div className="flex flex-col items-center text-center px-4">
              <div className="w-11 h-11 rounded-full bg-[#401526] flex items-center justify-center text-[#d8b66e]">
                <UserCheck className="w-5 h-5 text-[#d8b66e]" />
              </div>
              <p className="text-xs tracking-[0.22em] text-[#887a78] mt-4 font-medium">
                KINDLY RESPOND BY
              </p>
              <p className="font-serif text-2xl text-[#34232b] mt-1 font-semibold">
                {formattedDeadline}
              </p>
              <p className="text-sm text-[#887a78] mt-1">
                We&apos;re saving you a seat
              </p>
              <div className="flex items-center gap-1.5 mt-3 bg-[#f8f3eb] border border-[#e9ded1] rounded-full px-3 py-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{
                    backgroundColor: invitation.isDeadlinePassed
                      ? '#d97706'
                      : daysLeft <= 3
                      ? '#e11d48'
                      : '#2e7d4f'
                  }}
                />
                <span className="text-xs font-sans text-[#34232b] font-medium">
                  {invitation.isDeadlinePassed
                    ? 'RSVP window closed'
                    : daysLeft > 0
                    ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left to respond`
                    : 'Response due today'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* RsvpSection */}
        <section
          id="wedding-rsvp-section"
          className="bg-[#fffdfc] rounded-2xl border border-[#e9ded1] px-6 sm:px-8 md:px-14 py-10 md:py-12 text-center relative overflow-hidden shadow-xs"
        >
          {/* Shimmer gold line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d8b66e] to-transparent" />

          {rsvpError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium flex items-center justify-center space-x-2 max-w-lg mx-auto">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{rsvpError}</span>
            </div>
          )}

          {/* STATE 1: RSVP Window Closed */}
          {invitation.isDeadlinePassed ? (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#401526] text-[#fffdfc] rounded-full px-4 py-1.5 text-xs tracking-[0.18em]">
                <Lock className="w-3.5 h-3.5 text-[#d8b66e]" />
                <span className="font-semibold uppercase">RSVP Window Closed</span>
              </div>

              <h2 className="font-serif text-3xl md:text-4xl text-[#34232b]">
                The RSVP window has closed
              </h2>

              <p className="text-sm text-[#887a78] leading-relaxed">
                We appreciate your consideration. The final deadline to submit responses for this celebration was{' '}
                <span className="font-medium text-[#34232b]">{formattedDeadline}</span>.
              </p>

              {rsvpStatus && (
                <div className="p-5 rounded-xl bg-[#f8f3eb] border border-[#e9ded1] mt-6 max-w-md mx-auto text-center space-y-1">
                  <p className="text-xs tracking-[0.2em] text-[#b8944f] font-semibold uppercase">
                    Your Recorded Response
                  </p>
                  <p className="font-serif text-xl text-[#34232b] font-bold">
                    {rsvpStatus === 'IN'
                      ? `Joyfully Accepted · ${companionCount + 1} guest${companionCount > 0 ? 's' : ''}`
                      : 'Graciously Declined'}
                  </p>
                </div>
              )}
            </div>
          ) : submitted ? (
            /* STATE 2: RSVP Submitted & Confirmed */
            <div className="max-w-xl mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="inline-flex items-center gap-2 bg-[#401526] text-[#fffdfc] rounded-full px-4 py-1 text-xs tracking-[0.18em]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d8b66e] inline-block" />
                <span className="font-semibold uppercase">Response Recorded</span>
              </div>

              <h2 className="font-serif text-3xl md:text-4xl text-[#34232b]">
                {rsvpStatus === 'IN' ? 'Joyfully Accepted!' : 'Decline Recorded'}
              </h2>

              <p className="text-sm text-[#887a78] leading-relaxed max-w-md mx-auto">
                {rsvpFeedback ||
                  (rsvpStatus === 'IN'
                    ? `Thank you, ${invitation.guestName}! Your attendance with ${companionCount + 1} guest(s) has been privately confirmed for the host.`
                    : `Thank you, ${invitation.guestName}. We have noted that you will not be able to attend.`)}
              </p>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onChangeResponse}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#401526] hover:text-[#5c2032] underline underline-offset-4 decoration-[#d8b66e] cursor-pointer"
                >
                  <span>Change My Response</span>
                  <span className="text-[#887a78] font-normal">(Open until {formattedDeadline})</span>
                </button>
              </div>
            </div>
          ) : (
            /* STATE 3: Open for Submission */
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <p className="text-xs tracking-[0.32em] text-[#b8944f] uppercase font-semibold">
                  Kindly Respond
                </p>
                <h2 className="font-serif text-3xl md:text-4xl text-[#34232b] mt-1 font-normal">
                  Will You Join Us?
                </h2>
                <p className="text-sm text-[#887a78] mt-2">
                  Please let us know your plans by{' '}
                  <span className="font-semibold text-[#34232b]">{formattedDeadline}</span>.
                </p>
              </div>

              {/* Two Choice Toggle Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setSelectedChoice('IN')}
                  className={`p-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    selectedChoice === 'IN'
                      ? 'bg-[#401526] text-[#fffdfc] border-[#401526] shadow-md shadow-[#401526]/20'
                      : 'bg-[#fffdfc] text-[#34232b] border-[#e9ded1] hover:border-[#d8b66e] hover:bg-[#f8f3eb]'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${selectedChoice === 'IN' ? 'text-[#d8b66e]' : 'text-emerald-600'}`}
                  />
                  <span>Joyfully Accept (IN)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChoice('OUT')}
                  className={`p-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    selectedChoice === 'OUT'
                      ? 'bg-[#5c2032] text-[#fffdfc] border-[#5c2032] shadow-md shadow-[#5c2032]/20'
                      : 'bg-[#fffdfc] text-[#887a78] border-[#e9ded1] hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50/50'
                  }`}
                >
                  <XCircle
                    className={`w-4 h-4 ${selectedChoice === 'OUT' ? 'text-[#d8b66e]' : 'text-rose-500'}`}
                  />
                  <span>Decline with Regrets (OUT)</span>
                </button>
              </div>

              {/* Companion Count Selector (when attending) */}
              {selectedChoice === 'IN' && (
                <div className="p-4 rounded-xl bg-[#f8f3eb] border border-[#e9ded1] max-w-md mx-auto text-left space-y-2">
                  <label htmlFor="wedding-companion-select" className="text-xs font-semibold text-[#34232b] block">
                    Total Guests Attending (including yourself):
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id="wedding-companion-select"
                      value={companionCount}
                      onChange={(e) => setCompanionCount(Number(e.target.value))}
                      className="w-full bg-[#fffdfc] border border-[#e9ded1] rounded-lg px-3 py-2 text-sm text-[#34232b] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#d8b66e]"
                    >
                      <option value={0}>1 Guest (Just {invitation.guestName})</option>
                      <option value={1}>2 Guests ({invitation.guestName} + 1 companion)</option>
                      <option value={2}>3 Guests ({invitation.guestName} + 2 companions)</option>
                      <option value={3}>4 Guests ({invitation.guestName} + 3 companions)</option>
                      <option value={4}>5 Guests ({invitation.guestName} + 4 companions)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Submit Confirmation Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={submittingRsvp}
                  onClick={() => onRsvp(selectedChoice, selectedChoice === 'IN' ? companionCount : 0)}
                  className="rounded-full px-8 py-3.5 text-sm font-semibold bg-gradient-to-r from-[#d8b66e] via-[#c29c50] to-[#b8944f] text-[#401526] hover:brightness-105 shadow-md shadow-[#d8b66e]/30 disabled:opacity-60 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  {submittingRsvp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#401526] border-t-transparent rounded-full animate-spin" />
                      <span>Recording Your Response...</span>
                    </>
                  ) : (
                    <span>Confirm RSVP ({selectedChoice === 'IN' ? 'Attending' : 'Not Attending'})</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* PrivacyNote */}
        <section className="bg-[#FAF5EE] border border-[#d8b66e]/50 rounded-2xl flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left px-5 py-4 max-w-2xl mx-auto shadow-xs">
          <div className="w-10 h-10 rounded-full border border-[#d8b66e] bg-[#fffdfc] flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-[#A88234]" />
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-[#380C19] max-w-[560px]">
            <strong className="font-semibold text-[#2D0A17]">Your response is private.</strong> Only the event host can view aggregate attendance numbers. Your individual response is never displayed publicly or to other guests.
          </p>
        </section>

        {/* InviteFooter */}
        <footer className="bg-[#2a0e19] text-[#fffdfc] rounded-2xl px-6 md:px-12 py-7 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-[#d8b66e]/50 flex items-center justify-center shrink-0">
              <span className="font-serif italic text-[#d8b66e] text-sm">I</span>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.28em] text-[#fffdfc] uppercase font-medium">
                CRAFTED WITH INVITE STUDIO
              </p>
              <p className="text-xs text-[#fffdfc]/50 mt-0.5">
                Luxury digital invitations &amp; private RSVP management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[#fffdfc]/70 text-xs">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 hover:text-[#d8b66e] transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#d8b66e]" />
              <span>{shareCopied ? 'Link Copied!' : 'Share'}</span>
            </button>
            <span className="text-[#fffdfc]/30">·</span>
            <Link href="/" className="hover:text-[#d8b66e] transition-colors">
              <span>Home</span>
            </Link>
            <span className="text-[#fffdfc]/30">·</span>
            <span className="text-[#fffdfc]/50">Private Link</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
