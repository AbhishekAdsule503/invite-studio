'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Check,
  X,
  Share2,
  Calendar,
  Clock,
  Sparkles,
  Heart,
  Quote
} from 'lucide-react';
import { InvitationTemplateProps } from './types';

// Helper to determine refined category eyebrow
function getEventEyebrow(eventType?: string, eventName?: string): string {
  const type = (eventType || '').toUpperCase();
  const name = (eventName || '').toLowerCase();

  if (type === 'WEDDING' || name.includes('wedding') || name.includes('shaadi') || name.includes('vivah')) {
    return 'A CELEBRATION OF LOVE';
  }
  if (type === 'ANNIVERSARY' || name.includes('anniversary') || name.includes('silver jubilee') || name.includes('jubilee')) {
    return 'CELEBRATING YEARS OF TOGETHERNESS';
  }
  if (type === 'BIRTHDAY' || name.includes('birthday')) {
    return 'A JOYOUS CELEBRATION';
  }
  if (type === 'CORPORATE' || name.includes('gala') || name.includes('summit') || name.includes('conference') || name.includes('annual')) {
    return 'CORDIALLY INVITED';
  }
  if (type === 'HOUSEWARMING' || name.includes('housewarming') || name.includes('griha pravesh')) {
    return 'CELEBRATING A NEW BEGINNING';
  }
  if (name.includes('get together') || name.includes('reunion') || name.includes('party')) {
    return 'AN EVENING TOGETHER';
  }
  return 'CORDIALLY INVITED';
}

// Helper for refined greeting phrasing
function getGreetingPrefix(eventType?: string, eventName?: string): string {
  const type = (eventType || '').toUpperCase();
  const name = (eventName || '').toLowerCase();

  if (type === 'CORPORATE' || name.includes('gala') || name.includes('summit') || name.includes('corporate')) {
    return 'We cordially invite';
  }
  return 'Together with our families, we warmly invite';
}

// Helper to clean message of any raw URLs, template variables, or extra spaces
function sanitizeMessage(msg?: string | null): string {
  if (!msg) return '';
  return msg
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function UniversalLuxuryInvitation({
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
  const [shareCopied, setShareCopied] = useState(false);

  // Date parsing
  const eventDateObj = new Date(invitation.eventDate);
  const weekday = eventDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dayNumber = eventDateObj.toLocaleDateString('en-US', { day: 'numeric' });
  const monthName = eventDateObj.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const yearNumber = eventDateObj.toLocaleDateString('en-US', { year: 'numeric' });

  // Deadline parsing
  const deadlineDateObj = new Date(invitation.effectiveDeadline);
  const formattedDeadline = deadlineDateObj.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const isDeadlinePassed =
    invitation.isDeadlinePassed || new Date().getTime() > deadlineDateObj.getTime();

  const eyebrow = getEventEyebrow(invitation.eventType, invitation.eventName);
  const greetingPrefix = getGreetingPrefix(invitation.eventType, invitation.eventName);

  // Sanitized personal message
  const personalMsg = sanitizeMessage(invitation.personalizedMessage);
  const descriptionMsg = sanitizeMessage(invitation.description);

  // Cover image
  const coverImage = invitation.coverImageUrl?.trim() || null;

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: invitation.eventName,
          text: `You are cordially invited to ${invitation.eventName}!`,
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
    const el = document.getElementById('rsvp-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F3EB] text-[#34232B] py-6 sm:py-12 px-3 sm:px-6 selection:bg-[#D8B66E]/30 selection:text-[#401526]">
      {/* Centered Luxury Card Container */}
      <main className="max-w-3xl mx-auto bg-[#FFFDFC] shadow-[0_20px_60px_-15px_rgba(64,21,38,0.08)] rounded-xl relative overflow-hidden border border-[#E9DED1]">
        {/* Delicate Double Gold Inset Border */}
        <div className="absolute inset-2.5 sm:inset-4 border border-[#D8B66E]/40 rounded-lg pointer-events-none z-10" />

        {/* Ornamental Corner Diamond Accents */}
        <div className="absolute top-4 sm:top-5 left-4 sm:left-5 w-2 h-2 rotate-45 border border-[#D8B66E] pointer-events-none z-20" />
        <div className="absolute top-4 sm:top-5 right-4 sm:right-5 w-2 h-2 rotate-45 border border-[#D8B66E] pointer-events-none z-20" />
        <div className="absolute bottom-4 sm:bottom-5 left-4 sm:left-5 w-2 h-2 rotate-45 border border-[#D8B66E] pointer-events-none z-20" />
        <div className="absolute bottom-4 sm:bottom-5 right-4 sm:right-5 w-2 h-2 rotate-45 border border-[#D8B66E] pointer-events-none z-20" />

        <div className="relative z-10 px-5 sm:px-12 md:px-16 pt-10 sm:pt-14 pb-12 sm:pb-16 text-center">
          {/* 1. Brand Identity & Monogram Seal */}
          <header className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-[#D8B66E] bg-[#401526] text-[#D8B66E] flex items-center justify-center shadow-sm">
              <span className="font-serif italic text-xl font-normal select-none">I</span>
            </div>
            <div className="mt-3 text-[10px] tracking-[0.35em] uppercase text-[#34232B] font-semibold">
              INVITE STUDIO
            </div>
            <div className="text-[9px] tracking-[0.24em] uppercase text-[#B8944F] font-medium mt-0.5">
              LUXE CELEBRATIONS
            </div>

            <div className="mt-3 flex items-center gap-2 text-[#887A78]">
              <span className="w-1 h-1 rounded-full bg-[#D8B66E] inline-block" />
              <span className="text-[10px] tracking-[0.22em] uppercase font-medium">
                Private Invitation
              </span>
              <span className="w-1 h-1 rounded-full bg-[#D8B66E] inline-block" />
            </div>
          </header>

          {/* Decorative Divider */}
          <div className="flex items-center justify-center gap-3 my-7 sm:my-8">
            <span className="h-px w-10 sm:w-16 bg-[#D8B66E]/60" />
            <span className="w-1.5 h-1.5 rotate-45 border border-[#D8B66E] bg-transparent inline-block" />
            <span className="h-px w-10 sm:w-16 bg-[#D8B66E]/60" />
          </div>

          {/* 2. Hero Section: Eyebrow, Main Event Title, Guest Greeting */}
          <section className="space-y-4">
            <div className="inline-block px-4 py-1 rounded-full border border-[#D8B66E]/50 bg-[#F8F3EB] text-[11px] tracking-[0.26em] uppercase text-[#5C2032] font-semibold">
              {eyebrow}
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl text-[#401526] font-normal tracking-tight leading-[1.12] pt-2 max-w-2xl mx-auto">
              {invitation.eventName}
            </h1>

            {/* Guest Greeting */}
            <div className="pt-4 pb-2">
              <p className="font-serif italic text-sm sm:text-base text-[#887A78] tracking-wide">
                {greetingPrefix}
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#401526] font-normal tracking-wide mt-1.5">
                {invitation.guestName}
              </h2>
            </div>

            {/* Host attribution */}
            {invitation.hostName && invitation.hostName !== 'Your Host' && (
              <p className="text-xs sm:text-sm tracking-[0.16em] uppercase text-[#887A78] font-medium">
                Hosted with warmest regards by{' '}
                <span className="text-[#401526] font-semibold">{invitation.hostName}</span>
              </p>
            )}
          </section>

          {/* 3. Art-Directed Cover Image (if provided) */}
          {coverImage && (
            <div className="my-8 sm:my-10 relative max-w-xl mx-auto overflow-hidden rounded-lg border border-[#D8B66E]/50 p-1.5 bg-[#FFFDFC] shadow-md">
              <div className="relative aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt={invitation.eventName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#401526]/30 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          )}

          {/* 4. Invitation Message / Event Narrative */}
          {descriptionMsg && (
            <section className="my-6 sm:my-8 max-w-xl mx-auto">
              <p className="font-serif italic text-sm sm:text-base md:text-lg text-[#57464E] leading-relaxed">
                {descriptionMsg}
              </p>
            </section>
          )}

          {/* Decorative Divider */}
          <div className="flex items-center justify-center gap-3 my-7 sm:my-8">
            <span className="h-px w-10 sm:w-16 bg-[#D8B66E]/60" />
            <span className="w-1.5 h-1.5 rotate-45 border border-[#D8B66E] bg-transparent inline-block" />
            <span className="h-px w-10 sm:w-16 bg-[#D8B66E]/60" />
          </div>

          {/* 5. Refined Editorial Logistics Layout (Date, Time, Venue) */}
          <section className="my-8 sm:my-10 max-w-2xl mx-auto">
            <div className="border-t border-b border-[#D8B66E]/50 py-7 px-4 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#E9DED1]">
              {/* Date & Time Column */}
              <div className="flex flex-col items-center justify-center text-center space-y-2 md:pr-4">
                <span className="text-[11px] tracking-[0.25em] uppercase text-[#887A78] font-semibold">
                  DATE &amp; TIME
                </span>
                <span className="text-xs sm:text-sm tracking-[0.18em] uppercase text-[#5C2032] font-medium pt-1">
                  {weekday}
                </span>
                <div className="flex items-baseline gap-2 py-1">
                  <span className="font-serif text-3xl sm:text-4xl font-normal text-[#401526]">
                    {monthName} {dayNumber}
                  </span>
                </div>
                <span className="text-xs tracking-[0.2em] font-serif text-[#887A78]">
                  {yearNumber}
                </span>
                {invitation.eventTime && (
                  <span className="text-xs sm:text-sm text-[#401526] font-medium tracking-wider pt-1">
                    {invitation.eventTime}
                  </span>
                )}
              </div>

              {/* Venue & Location Column */}
              <div className="flex flex-col items-center justify-center text-center space-y-2 pt-6 md:pt-0 md:pl-4">
                <span className="text-[11px] tracking-[0.25em] uppercase text-[#887A78] font-semibold">
                  VENUE
                </span>
                <h3 className="font-serif text-xl sm:text-2xl text-[#401526] font-normal leading-snug pt-1">
                  {invitation.venue}
                </h3>
              </div>
            </div>
          </section>

          {/* 6. Host's Personal Message (Cleanly omitted if empty) */}
          {personalMsg && (
            <section className="my-8 sm:my-10 max-w-xl mx-auto">
              <div className="relative p-6 sm:p-7 rounded-xl bg-[#F8F3EB] border border-[#E9DED1] text-center shadow-xs">
                <Quote className="w-5 h-5 text-[#D8B66E] mx-auto mb-3 opacity-80" />
                <p className="font-serif italic text-sm sm:text-base text-[#34232B] leading-relaxed">
                  &ldquo;{personalMsg}&rdquo;
                </p>
                {invitation.hostName && invitation.hostName !== 'Your Host' && (
                  <p className="text-[11px] tracking-[0.18em] uppercase text-[#887A78] mt-3 font-medium">
                    &mdash; Personal note from {invitation.hostName}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Decorative Divider */}
          <div className="flex items-center justify-center gap-3 my-8">
            <span className="h-px w-10 sm:w-16 bg-[#D8B66E]/60" />
            <span className="w-1.5 h-1.5 rotate-45 border border-[#D8B66E] bg-transparent inline-block" />
            <span className="h-px w-10 sm:w-16 bg-[#D8B66E]/60" />
          </div>

          {/* 7. RSVP Section */}
          <section id="rsvp-section" className="pt-2 sm:pt-4 max-w-xl mx-auto scroll-mt-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-[#401526] font-normal leading-snug">
              We would be delighted to have you with us.
            </h2>

            <p className="text-xs sm:text-sm text-[#887A78] tracking-wide mt-2">
              Kindly respond by{' '}
              <span className="font-medium text-[#401526]">{formattedDeadline}</span>
            </p>

            <div className="mt-8">
              {isDeadlinePassed ? (
                /* Deadline Passed Notice */
                <div className="p-6 rounded-xl border border-[#D8B66E]/50 bg-[#F8F3EB] text-center space-y-2">
                  <p className="font-serif italic text-lg text-[#401526]">RSVP Window Closed</p>
                  <p className="text-xs sm:text-sm text-[#887A78] leading-relaxed">
                    The response deadline of {formattedDeadline} has passed. Please contact the
                    host directly for late attendance arrangements.
                  </p>
                  {rsvpStatus && (
                    <p className="text-xs font-semibold text-[#5C2032] pt-2 uppercase tracking-wider">
                      Your registered response:{' '}
                      {rsvpStatus === 'IN' ? 'Joyfully Accepted' : 'Regretfully Declined'}
                    </p>
                  )}
                </div>
              ) : submitted && rsvpStatus ? (
                /* Already Submitted State */
                <div className="p-6 sm:p-8 rounded-xl border border-[#D8B66E]/60 bg-[#F8F3EB] text-center space-y-3 shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-[#401526] text-[#D8B66E] flex items-center justify-center mx-auto shadow-sm">
                    {rsvpStatus === 'IN' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                  </div>
                  <h3 className="font-serif text-2xl text-[#401526]">
                    {rsvpStatus === 'IN' ? 'Joyfully Accepted' : 'Regretfully Declined'}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#887A78] leading-relaxed max-w-md mx-auto">
                    {rsvpStatus === 'IN'
                      ? companionCount > 0
                        ? `We are delighted to welcome you and ${companionCount} accompanying guest${companionCount > 1 ? 's' : ''
                        }.`
                        : 'Thank you for confirming your presence. We look forward to celebrating together.'
                      : 'Thank you for letting us know. You will be warmly missed.'}
                  </p>

                  {rsvpFeedback && (
                    <p className="text-xs text-[#5C2032] italic font-medium">{rsvpFeedback}</p>
                  )}

                  <div className="pt-4 border-t border-[#E9DED1] mt-5">
                    <button
                      type="button"
                      onClick={onChangeResponse}
                      className="text-xs tracking-[0.18em] uppercase font-medium text-[#5C2032] hover:text-[#401526] underline underline-offset-4 cursor-pointer"
                    >
                      Change Your Response
                    </button>
                  </div>
                </div>
              ) : (
                /* Active RSVP Form */
                <div className="space-y-6">
                  {/* Companion Count Selector */}
                  <div className="text-center">
                    <label className="block text-xs uppercase tracking-[0.2em] text-[#887A78] font-medium mb-3">
                      Accompanying Guests Attending With You
                    </label>
                    <div className="inline-flex items-center rounded-lg border border-[#E9DED1] bg-[#FFFDFC] p-1 shadow-2xs">
                      {[0, 1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCompanionCount(num)}
                          className={`px-3 sm:px-4 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${companionCount === num
                            ? 'bg-[#401526] text-[#D8B66E] shadow-2xs font-semibold'
                            : 'text-[#57464E] hover:bg-[#F8F3EB]'
                            }`}
                        >
                          {num === 0 ? 'Just Me' : `+${num}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accept / Decline Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3.5 justify-center max-w-md mx-auto pt-2">
                    <button
                      type="button"
                      disabled={submittingRsvp}
                      onClick={() => onRsvp('IN', companionCount)}
                      className="flex-1 py-3.5 px-6 rounded-lg bg-[#401526] text-[#D8B66E] border border-[#D8B66E]/50 font-serif text-base tracking-wide hover:bg-[#5C2032] transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 group"
                    >
                      <Check className="w-4 h-4 text-[#D8B66E] group-hover:scale-110 transition-transform" />
                      <span>{submittingRsvp ? 'Submitting...' : 'Joyfully Accept'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={submittingRsvp}
                      onClick={() => onRsvp('OUT', 0)}
                      className="flex-1 py-3.5 px-6 rounded-lg bg-[#FFFDFC] text-[#5C2032] border border-[#E9DED1] font-serif text-base tracking-wide hover:bg-[#F8F3EB] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4 text-[#887A78]" />
                      <span>{submittingRsvp ? 'Submitting...' : 'Regretfully Decline'}</span>
                    </button>
                  </div>

                  {rsvpError && (
                    <p className="text-xs text-rose-700 text-center font-medium">{rsvpError}</p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Quick Share Link */}
          <div className="mt-10 pt-4 flex justify-center">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 text-xs text-[#887A78] hover:text-[#401526] transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#D8B66E]" />
              <span>{shareCopied ? 'Link Copied to Clipboard!' : 'Share Invitation Link'}</span>
            </button>
          </div>

          {/* 8. Privacy Footer */}
          <footer className="mt-12 pt-8 border-t border-[#E9DED1] text-center space-y-3 flex flex-col items-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#FAF5EE] border border-[#D8B66E]/50 text-xs sm:text-sm text-[#380C19] shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#A88234] shrink-0" />
              <span>
                <strong className="font-semibold text-[#2D0A17]">Your response is private.</strong> Only aggregate attendance counts are shared with the host.
              </span>
            </div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-[#887A78] font-medium pt-1">
              INVITE STUDIO &middot; BESPOKE DIGITAL INVITATIONS
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default UniversalLuxuryInvitation;
