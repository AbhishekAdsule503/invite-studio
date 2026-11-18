'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, ShieldCheck, Heart, Mail, ExternalLink, ArrowUpRight } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();

  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/guests') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/invitations') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/admin');

  if (isDashboardRoute) {
    return null;
  }

  return (
    <footer className="bg-[#20070E] text-[#E5DCD3] border-t border-[#380C19] pt-16 pb-12 text-xs">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-2xl bg-[#380C19] border border-[#D8B66E]/30 flex items-center justify-center text-[#D8B66E] shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-xl tracking-tight text-white">
                  Invite Studio
                </span>
                <span className="text-[9px] font-sans font-medium tracking-[0.24em] text-[#D8B66E] uppercase">
                  Atelier of Celebrations
                </span>
              </div>
            </Link>

            <p className="text-[#B9AAA5] text-xs leading-relaxed max-w-sm">
              Digital India deserves digital invitations. INVITE STUDIO is a modern digital invitation, relationship management, and event RSVP platform built for Indian weddings, milestone celebrations, and family gatherings.
            </p>

            <div className="pt-2 flex items-center space-x-2 text-[11px] text-[#D8B66E]">
              <ShieldCheck className="w-4 h-4 text-[#D8B66E]" />
              <span>Strict RSVP Headcount Privacy &bull; Zero Cross-Guest Stalking</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-white tracking-wide uppercase text-[11px]">
              Platform
            </h4>
            <ul className="space-y-2 text-[#B9AAA5]">
              <li>
                <Link href="/#hero" className="hover:text-[#D8B66E] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#D8B66E] transition-colors">
                  Features &amp; Atelier
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#D8B66E] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#occasions" className="hover:text-[#D8B66E] transition-colors">
                  Supported Occasions
                </Link>
              </li>
              <li>
                <Link href="/#guest-management" className="hover:text-[#D8B66E] transition-colors">
                  Guest &amp; Relationships
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-[#D8B66E] transition-colors">
                  Subscription Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Occasions Quick Links */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-white tracking-wide uppercase text-[11px]">
              Celebrations
            </h4>
            <ul className="space-y-2 text-[#B9AAA5]">
              <li>
                <Link href="/#occasions" className="hover:text-[#D8B66E] transition-colors">
                  Weddings &amp; Engagements
                </Link>
              </li>
              <li>
                <Link href="/#occasions" className="hover:text-[#D8B66E] transition-colors">
                  Birthdays &amp; Anniversaries
                </Link>
              </li>
              <li>
                <Link href="/#occasions" className="hover:text-[#D8B66E] transition-colors">
                  Baby Showers &amp; Naming
                </Link>
              </li>
              <li>
                <Link href="/#occasions" className="hover:text-[#D8B66E] transition-colors">
                  Housewarming Ceremonies
                </Link>
              </li>
              <li>
                <Link href="/#occasions" className="hover:text-[#D8B66E] transition-colors">
                  Religious &amp; Cultural Pujas
                </Link>
              </li>
              <li>
                <Link href="/#occasions" className="hover:text-[#D8B66E] transition-colors">
                  Family Gatherings &amp; Reunions
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-white tracking-wide uppercase text-[11px]">
              Trust &amp; Legal
            </h4>
            <ul className="space-y-2 text-[#B9AAA5]">
              <li>
                <Link href="/privacy" className="hover:text-[#D8B66E] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#D8B66E] transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-[#D8B66E] transition-colors">
                  Refund &amp; Cancellation
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-[#D8B66E] transition-colors">
                  About the Studio
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#D8B66E] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#D8B66E] transition-colors flex items-center space-x-1">
                  <span>Host Support</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#380C19] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#887A78] text-[11px]">
          <p>
            &copy; {new Date().getFullYear()} INVITE STUDIO &bull; Atelier of Celebrations. Built for celebratory hosts across India.
          </p>

          <div className="flex items-center space-x-6">
            <Link href="/privacy" className="hover:text-[#D8B66E] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#D8B66E] transition-colors">
              Terms
            </Link>
            <Link href="/refund" className="hover:text-[#D8B66E] transition-colors">
              Refunds
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
