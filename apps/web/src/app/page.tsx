'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Check,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Users,
  Calendar,
  Mail,
  MessageSquare,
  Share2,
  FileSpreadsheet,
  Layers,
  Crown,
  Heart,
  Clock,
  ChevronDown,
  Gift,
  Home,
  Flame,
  Building2,
  PartyPopper,
  Zap,
  HelpCircle,
  ExternalLink,
  Smartphone,
  Eye,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { subscriptionService, SubscriptionPlan } from '@/services/subscription.service';

export default function LandingPage() {
  // Dynamic Pricing State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [pricingCycle, setPricingCycle] = useState<'YEARLY' | 'MONTHLY'>('YEARLY');
  const [loadingPlans, setLoadingPlans] = useState(true);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Language demo state for WhatsApp section
  const [selectedLanguage, setSelectedLanguage] = useState<'EN' | 'HI'>('EN');

  useEffect(() => {
    async function fetchPublicPlans() {
      try {
        setLoadingPlans(true);
        const res = await subscriptionService.getPlans();
        // Filter out legacy, inactive, and internal onboarding trial plans
        const publicPlans = (res.plans || []).filter(
          (p) => !p.isLegacy && p.isActive !== false && p.code !== 'TRIAL'
        );
        setPlans(publicPlans);
      } catch {
        // Fallback to default approved tiers if backend connection is unavailable
        setPlans([
          {
            id: 'fallback-free',
            name: 'Free',
            code: 'FREE',
            priceYearly: 0,
            priceMonthly: 0,
            currency: 'INR',
            hasMonthlyBilling: true,
            hasYearlyBilling: false,
            maxEvents: 2,
            maxGuestsPerEvent: 50,
            maxPermanentGuests: 100,
            canUploadCustomTemplates: false,
            canCustomInviteUpload: true,
            tier: 0,
            isPopular: false,
            description: 'Essential tier for private family functions and intimate gatherings',
            features: [
              'Up to 100 Saved Contacts',
              '2 Invitation Campaigns / month',
              'Basic Invitation Templates (3 designs)',
              'Manual WhatsApp 1-Click Sharing',
              'Basic Contact Categories & Dashboard'
            ]
          },
          {
            id: 'fallback-personal',
            name: 'Personal',
            code: 'PERSONAL',
            priceYearly: 99900,
            priceMonthly: 9900,
            currency: 'INR',
            hasMonthlyBilling: true,
            hasYearlyBilling: true,
            maxEvents: 10,
            maxGuestsPerEvent: 200,
            maxPermanentGuests: 1000,
            canUploadCustomTemplates: true,
            canCustomInviteUpload: true,
            tier: 1,
            isPopular: true,
            description: 'Perfect for personal celebrations, birthdays & staying connected',
            features: [
              'Up to 1,000 Saved Contacts',
              '10 Invitation Campaigns / month',
              'Premium Invitation Stationery (10 designs)',
              'Birthday & Anniversary Reminders',
              '100 Automated WhatsApp Messages / mo',
              'Contact Export (CSV / Excel)'
            ]
          },
          {
            id: 'fallback-family',
            name: 'Family',
            code: 'FAMILY',
            priceYearly: 199900,
            priceMonthly: 19900,
            currency: 'INR',
            hasMonthlyBilling: true,
            hasYearlyBilling: true,
            maxEvents: 30,
            maxGuestsPerEvent: 500,
            maxPermanentGuests: 3000,
            canUploadCustomTemplates: true,
            canCustomInviteUpload: true,
            tier: 2,
            isPopular: false,
            description: 'Ideal for joint families planning weddings and festivals together',
            features: [
              'Up to 3,000 Saved Contacts',
              '30 Invitation Campaigns / month',
              'Shared Family Access (2 Members)',
              'Excel Bulk Contact Import & Export',
              'Birthday, Anniversary & Festival Reminders',
              '250 Automated WhatsApp Messages / mo'
            ]
          },
          {
            id: 'fallback-family-plus',
            name: 'Family Plus',
            code: 'FAMILY_PLUS',
            priceYearly: 399900,
            priceMonthly: 39900,
            currency: 'INR',
            hasMonthlyBilling: true,
            hasYearlyBilling: true,
            maxEvents: 75,
            maxGuestsPerEvent: 2000,
            maxPermanentGuests: 10000,
            canUploadCustomTemplates: true,
            canCustomInviteUpload: true,
            tier: 3,
            isPopular: false,
            description: 'The ultimate celebration atelier suite for grand families & VIP events',
            features: [
              'Up to 10,000 Saved Contacts',
              '75 Invitation Campaigns / month',
              'Shared Family Access (5 Members)',
              'Custom Invitation Branding & Watermarks',
              '500 Automated WhatsApp Messages / mo',
              'Priority Concierge Support'
            ]
          }
        ]);
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPublicPlans();
  }, []);

  const occasions = [
    {
      name: 'Wedding',
      subtitle: 'Vivah & Grand Nuptials',
      description: 'Multi-day wedding ceremonies, Sangeet, Mehendi, and reception invitations with dignified Indian cultural elegance.',
      icon: Heart,
      tag: 'Grand Celebrations'
    },
    {
      name: 'Engagement',
      subtitle: 'Roka & Ring Ceremony',
      description: 'Formal announcement and ring exchange invitations crafted to honor both families.',
      icon: Sparkles,
      tag: 'Milestones'
    },
    {
      name: 'Birthday',
      subtitle: 'Milestones & Celebrations',
      description: 'From 1st birthdays to 50th and 75th milestone jubilees, celebrate life with cheerful sophistication.',
      icon: PartyPopper,
      tag: 'Annual'
    },
    {
      name: 'Anniversary',
      subtitle: 'Silver & Golden Jubilees',
      description: 'Honor enduring love with heirloom digital invitations sent to cherished lifelong friends and relatives.',
      icon: Crown,
      tag: 'Cherished'
    },
    {
      name: 'Baby Shower',
      subtitle: 'Godh Bharai & Srimantham',
      description: 'Welcome new beginnings with gentle, warm invitations designed for maternal blessings.',
      icon: Gift,
      tag: 'Blessings'
    },
    {
      name: 'Housewarming',
      subtitle: 'Griha Pravesh & Vastu Puja',
      description: 'Invite loved ones to bless your new home with auspicious timing, venue maps, and RSVP headcounts.',
      icon: Home,
      tag: 'New Beginnings'
    },
    {
      name: 'Religious & Cultural',
      subtitle: 'Pujas, Havans & Jagrans',
      description: 'Traditional digital invites for Satyanarayan Katha, Mata ki Chowki, Diwali get-togethers, and festive poojas.',
      icon: Flame,
      tag: 'Auspicious'
    },
    {
      name: 'Family Gatherings',
      subtitle: 'Reunions & Picnics',
      description: 'Bring extended families together without endless confusion across scattered group chats.',
      icon: Users,
      tag: 'Family'
    },
    {
      name: 'Corporate Events',
      subtitle: 'Galas & Dinners',
      description: 'Professional executive invitations for annual dinners, felicitations, and milestone business evenings.',
      icon: Building2,
      tag: 'Professional'
    },
    {
      name: 'Special Celebrations',
      subtitle: 'Retirements & Graduations',
      description: 'Mark pivotal career achievements, convocation dinners, and retirement felicitations in high style.',
      icon: Layers,
      tag: 'Commemorative'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Create Your Account',
      description: 'Sign up securely in seconds using your mobile number or email with instant 5-digit OTP verification.'
    },
    {
      step: '02',
      title: 'Build Your Guest List',
      description: 'Add guests manually or import your entire contact list from Excel into your permanent My Guests address book.'
    },
    {
      step: '03',
      title: 'Organize Guest Relationships',
      description: 'Categorize contacts by meaningful groups such as Family, Relatives, Friends, and Colleagues for targeted events.'
    },
    {
      step: '04',
      title: 'Create Your Event',
      description: 'Specify occasion, event date, start time, venue address, dress code, and optional RSVP confirmation deadlines.'
    },
    {
      step: '05',
      title: 'Generate Personalized Invitations',
      description: 'Our engine creates a unique, unguessable invitation link for each guest displaying their personal name.'
    },
    {
      step: '06',
      title: 'Share & Track RSVP',
      description: 'Send via WhatsApp click-to-chat. Guests respond with 1 tap; view your live aggregate headcount from the dashboard.'
    }
  ];

  const faqs = [
    {
      q: 'What is INVITE STUDIO?',
      a: 'INVITE STUDIO is a modern digital invitation, reusable guest-database, relationship organization, and RSVP management platform built specifically for Indian hosts and celebratory families.'
    },
    {
      q: 'How can I create a digital invitation?',
      a: 'Log in using your mobile number, create an event with your date, time, and venue, assign your guests, and generate personalized digital invitation links with one click.'
    },
    {
      q: 'Can I save my guest list for future events?',
      a: 'Yes! The My Guests section acts as your permanent celebration address book. Any contact you save can be reused for upcoming birthdays, weddings, pujas, and anniversaries without re-typing their details.'
    },
    {
      q: 'Can I organize guests by family, relatives, and friends?',
      a: 'Yes. Every guest record supports relationship categorization (such as Family, Relatives, Friends, Colleagues, and Custom Groups) so you can filter and select the exact group for each function.'
    },
    {
      q: 'Can I import guests from Excel?',
      a: 'Yes. You can upload an Excel spreadsheet (.xlsx or .xls) with Full Name, WhatsApp Number, and optional Relationship. The system validates the numbers and imports them cleanly.'
    },
    {
      q: 'Can I create multiple events?',
      a: 'Yes. Depending on your active subscription plan, you can manage multiple standalone or multi-day events simultaneously from one dashboard.'
    },
    {
      q: 'Does every guest get a personalized invitation link?',
      a: 'Yes. Rather than a generic broadcast link, each guest receives an individualized URL that warmly displays their name and allows them to submit their RSVP response directly.'
    },
    {
      q: 'Can I share invitations through WhatsApp?',
      a: 'Yes. INVITE STUDIO provides a 1-click WhatsApp click-to-chat dispatch utility with pre-filled personalized messages in both English and Hindi. No manual copying and pasting.'
    },
    {
      q: 'Do guests need to download an app?',
      a: 'No! Guests do not need to download any application, sign up, or create an account. They simply click the WhatsApp link to open the invitation in any mobile browser.'
    },
    {
      q: 'How can guests respond to an invitation?',
      a: 'On their personal invitation page, guests tap either Attending or Not Attending. If enabled by the host, they can also specify the number of accompanying family members.'
    },
    {
      q: 'Can I see RSVP responses?',
      a: 'Yes. Your host dashboard displays a live aggregate headcount summary (Attending, Declined, and Awaiting Response) to help you accurately plan seating, catering, and accommodations.'
    },
    {
      q: 'Can I cancel or change my subscription?',
      a: 'Yes. You can manage or cancel your subscription at any time directly through your host dashboard under Subscription settings.'
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#F8F3EB] text-[#34232B] overflow-x-hidden selection:bg-[#D8B66E]/30 selection:text-[#401526]">
      {/* =========================================================================
          1. HERO SECTION (Deep Burgundy, Champagne Gold Accents, Luxury Mockup)
          ========================================================================= */}
      <section
        id="hero"
        className="relative bg-gradient-to-b from-[#2E0B17] via-[#240813] to-[#1A040D] text-white pt-14 pb-20 sm:pt-20 sm:pb-28 overflow-hidden border-b border-[#380C19]"
      >
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#D8B66E]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#5C2032]/30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
              {/* Bespoke Atelier Tagline Pill */}
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#380C19] border border-[#D8B66E]/30 text-[#D8B66E] text-[11px] font-semibold uppercase tracking-[0.22em] shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#D8B66E]" />
                <span>Bespoke Celebration Atelier</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-serif tracking-tight text-white leading-[1.12]">
                <span className="block font-semibold text-3xl sm:text-5xl lg:text-[52px] xl:text-[60px]">
                  Digital India Deserves
                </span>
                <span className="block font-serif italic font-normal text-[#D8B66E] text-4xl sm:text-6xl lg:text-[62px] xl:text-[70px] mt-1 sm:mt-2">
                  Digital Invitations.
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-[#E5DCD3] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans">
                Every invitation should be digital &mdash; beautifully designed, personally delivered, and effortlessly managed. Create memorable invitations, organize your guests, and manage every celebration from one simple platform.
              </p>

              {/* Supporting description */}
              <p className="text-xs sm:text-sm text-[#B9AAA5] max-w-xl mx-auto lg:mx-0 leading-relaxed">
                From weddings and birthdays to anniversaries, engagements and family celebrations &mdash; INVITE STUDIO brings your invitations, guest lists, relationships and RSVPs together in one place.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link href="/login" className="w-full sm:w-auto">
                  <button
                    type="button"
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-[#D8B66E] hover:bg-[#E5C378] text-[#2E0B17] font-semibold text-sm px-7 py-3.5 rounded-full shadow-lg shadow-[#D8B66E]/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                  >
                    <span>Create Your Free Invitation</span>
                    <ArrowRight className="w-4 h-4 text-[#2E0B17]" />
                  </button>
                </Link>

                <a href="#how-it-works" className="w-full sm:w-auto">
                  <button
                    type="button"
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-[#380C19]/80 hover:bg-[#401526] text-white border border-[#D8B66E]/30 font-semibold text-sm px-6 py-3.5 rounded-full transition-colors whitespace-nowrap"
                  >
                    <span>Discover How It Works</span>
                  </button>
                </a>
              </div>

              {/* Product Benefits (No fake reviews or ratings) */}
              <div className="pt-4 border-t border-[#380C19]/80 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-xs text-[#E5DCD3]">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-[#D8B66E]/20 text-[#D8B66E] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#D8B66E]" />
                  </div>
                  <span className="whitespace-nowrap">Personalized Digital Invitations</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-[#D8B66E]/20 text-[#D8B66E] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#D8B66E]" />
                  </div>
                  <span className="whitespace-nowrap">Smart Guest &amp; Relationship Management</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-[#D8B66E]/20 text-[#D8B66E] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#D8B66E]" />
                  </div>
                  <span className="whitespace-nowrap">Easy WhatsApp Sharing &amp; RSVP Tracking</span>
                </div>
              </div>
            </div>

            {/* Right Mockup Column */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              {/* Main Invitation Card Mockup */}
              <div className="relative w-full max-w-[340px] sm:max-w-[380px] rounded-3xl bg-[#1F0710] border-2 border-[#D8B66E]/40 p-6 sm:p-7 shadow-2xl shadow-black/60 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                {/* Gilded Inner Border with Corner Accents */}
                <div className="border border-[#D8B66E]/30 rounded-2xl p-6 sm:p-7 text-center relative space-y-4 bg-gradient-to-b from-[#280A15] to-[#18040C]">
                  {/* Corner Diamond Flourishes */}
                  <span className="absolute top-2 left-2 text-[10px] text-[#D8B66E]/60">&lowast;</span>
                  <span className="absolute top-2 right-2 text-[10px] text-[#D8B66E]/60">&lowast;</span>
                  <span className="absolute bottom-2 left-2 text-[10px] text-[#D8B66E]/60">&lowast;</span>
                  <span className="absolute bottom-2 right-2 text-[10px] text-[#D8B66E]/60">&lowast;</span>

                  <span className="text-[10px] font-sans font-semibold tracking-[0.25em] text-[#D8B66E] uppercase block">
                    Together With Their Families
                  </span>

                  <div className="py-2">
                    <h3 className="font-serif font-bold text-2xl sm:text-3xl text-white tracking-wide">
                      Siddharth <span className="text-[#D8B66E] italic font-serif">&amp;</span> Ananya
                    </h3>
                    <p className="text-[11px] font-sans text-[#E5DCD3] tracking-widest uppercase mt-1">
                      Request the honor of your presence
                    </p>
                  </div>

                  <div className="py-2 border-y border-[#D8B66E]/20 space-y-1 text-xs text-[#E5DCD3]">
                    <div className="flex items-center justify-center space-x-1.5 font-semibold text-white">
                      <Calendar className="w-3.5 h-3.5 text-[#D8B66E]" />
                      <span>Saturday, November 28, 2026</span>
                    </div>
                    <div className="flex items-center justify-center space-x-1.5 text-[11px] text-[#B9AAA5]">
                      <Clock className="w-3.5 h-3.5 text-[#D8B66E]" />
                      <span>6:00 PM Onwards &bull; Udaipur Palace</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#380C19] border border-[#D8B66E]/30 text-[10px] font-semibold text-[#D8B66E]">
                      <CheckCircle2 className="w-3 h-3 text-[#D8B66E]" />
                      <span>RSVP Enabled &bull; Instant Access</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating UI Element 1: WhatsApp Sharing (Top Right) */}
              <div className="absolute -top-4 -right-2 sm:-right-4 bg-white text-[#34232B] rounded-2xl p-3 shadow-xl border border-[#E9DED1] flex items-center space-x-3 max-w-[210px] animate-in fade-in duration-300">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#34232B] leading-tight">Instant WhatsApp</h4>
                  <p className="text-[10px] text-[#887A78] leading-tight mt-0.5">One-click personal delivery</p>
                </div>
              </div>

              {/* Floating UI Element 2: RSVP Confirmed (Bottom Left) */}
              <div className="absolute -bottom-5 -left-2 sm:-left-4 bg-white text-[#34232B] rounded-2xl p-3.5 shadow-xl border border-[#E9DED1] flex items-center space-x-3 max-w-[220px]">
                <div className="w-8 h-8 rounded-xl bg-[#FAF5F6] text-[#401526] flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-[#401526]" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#34232B] leading-tight">128 Guests Attending</h4>
                  <p className="text-[10px] text-emerald-600 font-semibold leading-tight mt-0.5">&bull; Live aggregate responses</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. INTRODUCTION — WHAT IS INVITE STUDIO? (One Platform. Every Celebration.)
          ========================================================================= */}
      <section id="features" className="py-20 sm:py-28 bg-[#FFFDFC] border-b border-[#E9DED1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
              The Digital Invitation Atelier
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight">
              One Platform. Every Celebration.{' '}
              <span className="italic font-serif text-[#5C2032]">Complete Guest Management.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#6E5E65] leading-relaxed">
              INVITE STUDIO is a digital invitation and guest-management platform that helps individuals, families and event hosts create personalized invitations, organize their guest lists, manage relationships and track guest responses &mdash; all from one convenient dashboard.
            </p>
            <p className="text-xs sm:text-sm text-[#887A78] leading-relaxed max-w-2xl mx-auto">
              You no longer need to scramble across scattered spreadsheets, disconnected messaging apps, and forgotten paper slips. Everything you need is centralized in a single, refined workspace.
            </p>
          </div>

          {/* Four Pillar Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CARD 1 — Digital Invitations */}
            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] hover:border-[#D8B66E] transition-all hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#34232B]">Digital Invitations</h3>
                <p className="text-xs text-[#6E5E65] mt-2.5 leading-relaxed">
                  Create beautiful, personalized digital invitations for your celebrations. Each guest receives an unguessable invitation link greeting them with their own name.
                </p>
              </div>
              <div className="pt-6 border-t border-[#E9DED1] mt-6">
                <span className="text-[11px] font-semibold text-[#5C2032] inline-flex items-center space-x-1">
                  <span>Universal Luxury Layout</span>
                  <Check className="w-3.5 h-3.5 text-[#5C2032]" />
                </span>
              </div>
            </div>

            {/* CARD 2 — Guest Management */}
            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] hover:border-[#D8B66E] transition-all hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#34232B]">Guest Management</h3>
                <p className="text-xs text-[#6E5E65] mt-2.5 leading-relaxed">
                  Save, organize, update and reuse your guest list for multiple events. Build your permanent address book once and avoid re-entering contacts year after year.
                </p>
              </div>
              <div className="pt-6 border-t border-[#E9DED1] mt-6">
                <span className="text-[11px] font-semibold text-[#5C2032] inline-flex items-center space-x-1">
                  <span>Excel Import &amp; Address Book</span>
                  <Check className="w-3.5 h-3.5 text-[#5C2032]" />
                </span>
              </div>
            </div>

            {/* CARD 3 — Relationship Management */}
            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] hover:border-[#D8B66E] transition-all hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center mb-6">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#34232B]">Relationship Management</h3>
                <p className="text-xs text-[#6E5E65] mt-2.5 leading-relaxed">
                  Organize guests by their relationship with the host, such as family, relatives, friends, colleagues and other groups. Make guest organization structured and effortless.
                </p>
              </div>
              <div className="pt-6 border-t border-[#E9DED1] mt-6">
                <span className="text-[11px] font-semibold text-[#5C2032] inline-flex items-center space-x-1">
                  <span>Family &bull; Friends &bull; Relatives</span>
                  <Check className="w-3.5 h-3.5 text-[#5C2032]" />
                </span>
              </div>
            </div>

            {/* CARD 4 — RSVP Management */}
            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] hover:border-[#D8B66E] transition-all hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#34232B]">RSVP Management</h3>
                <p className="text-xs text-[#6E5E65] mt-2.5 leading-relaxed">
                  Allow guests to respond through their personal invitation link. View overall aggregate attendance responses from your host dashboard without invasive cross-guest tracking.
                </p>
              </div>
              <div className="pt-6 border-t border-[#E9DED1] mt-6">
                <span className="text-[11px] font-semibold text-[#5C2032] inline-flex items-center space-x-1">
                  <span>Live Private Headcounts</span>
                  <Check className="w-3.5 h-3.5 text-[#5C2032]" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. OCCASIONS SECTION (Universal Luxury Invitation Design System)
          ========================================================================= */}
      <section id="occasions" className="py-20 sm:py-28 bg-[#F8F3EB] border-b border-[#E9DED1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
              Bespoke For Every Celebration
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight">
              Every Occasion Deserves a{' '}
              <span className="italic font-serif text-[#5C2032]">Digital Invitation</span>
            </h2>
            <p className="text-sm sm:text-base text-[#6E5E65] leading-relaxed">
              Whether you are hosting an intimate puja at home, a milestone golden anniversary, or a five-day royal Indian wedding, INVITE STUDIO provides a timeless, gilded aesthetic.
            </p>
          </div>

          {/* 10 Occasions Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {occasions.map((occ, idx) => {
              const Icon = occ.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#FFFDFC] rounded-3xl p-6 border border-[#E9DED1] hover:border-[#D8B66E] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#887A78] bg-[#F8F3EB] px-2 py-0.5 rounded-md">
                        {occ.tag}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#34232B] group-hover:text-[#401526] transition-colors">
                        {occ.name}
                      </h3>
                      <p className="text-[10px] text-[#D8B66E] font-medium tracking-wide mt-0.5">
                        {occ.subtitle}
                      </p>
                    </div>

                    <p className="text-xs text-[#6E5E65] leading-relaxed">
                      {occ.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E9DED1]/60 mt-5">
                    <Link href="/login" className="block w-full">
                      <button
                        type="button"
                        className="w-full text-center py-2 text-xs font-semibold text-[#401526] hover:text-white hover:bg-[#401526] rounded-xl border border-[#401526]/20 transition-all"
                      >
                        Create Invitation
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. HOW IT WORKS (6 Clear Steps)
          ========================================================================= */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-[#FFFDFC] border-b border-[#E9DED1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
              Effortless Workflow
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight">
              Your Celebration,{' '}
              <span className="italic font-serif text-[#5C2032]">Simplified in 6 Steps.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#6E5E65] leading-relaxed">
              We eliminated the chaos of lost spreadsheets and repeated texting so you can focus on hosting.
            </p>
          </div>

          {/* 6 Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] space-y-4 hover:border-[#D8B66E] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-black text-3xl text-[#D8B66E]">
                    {st.step}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#887A78] bg-white px-2.5 py-1 rounded-full border border-[#E9DED1]">
                    Step {idx + 1}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-lg text-[#34232B]">
                  {st.title}
                </h3>

                <p className="text-xs text-[#6E5E65] leading-relaxed">
                  {st.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <Link href="/login">
              <button
                type="button"
                className="inline-flex items-center space-x-2 bg-[#401526] hover:bg-[#2D0A17] text-white font-semibold text-xs px-8 py-3.5 rounded-full shadow-md transition-all"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4 text-[#D8B66E]" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. GUEST & RELATIONSHIP MANAGEMENT (Major Feature Section)
          ========================================================================= */}
      <section id="guest-management" className="py-20 sm:py-28 bg-[#F8F3EB] border-b border-[#E9DED1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
                Zero Repetitive Data Entry
              </span>

              <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight leading-tight">
                Your Guest List, Relationships &amp; Events &mdash;{' '}
                <span className="italic font-serif text-[#5C2032]">All Organized.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#6E5E65] leading-relaxed">
                Managing hundreds of guests should not mean managing hundreds of spreadsheets. INVITE STUDIO makes guest organization simple, structured, and permanently reusable.
              </p>

              {/* Verified Feature Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-[#57464E]">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5C2032] shrink-0 mt-0.5" />
                  <span>Save guest name and WhatsApp contact info</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5C2032] shrink-0 mt-0.5" />
                  <span>Maintain a permanent, reusable address book</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5C2032] shrink-0 mt-0.5" />
                  <span>Organize guests by relationship categories</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5C2032] shrink-0 mt-0.5" />
                  <span>Separate family, relatives, friends &amp; colleagues</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5C2032] shrink-0 mt-0.5" />
                  <span>Import and bulk-validate guests from Excel (.xlsx)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5C2032] shrink-0 mt-0.5" />
                  <span>Export guest information when required</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5C2032] shrink-0 mt-0.5" />
                  <span>Assign selected guests to different events</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5C2032] shrink-0 mt-0.5" />
                  <span>Avoid entering the same guest details repeatedly</span>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/login">
                  <button
                    type="button"
                    className="inline-flex items-center space-x-2 bg-[#401526] hover:bg-[#2D0A17] text-white text-xs font-semibold px-6 py-3 rounded-full shadow-sm"
                  >
                    <span>Manage Your Guests in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D8B66E]" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Right Dashboard Mockup (Demonstrating Relationship Groups & Guest Table) */}
            <div className="lg:col-span-6">
              <div className="bg-[#FFFDFC] rounded-3xl border border-[#E9DED1] shadow-xl p-5 sm:p-6 space-y-4">
                {/* Mockup Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E9DED1]">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-[#401526] text-[#D8B66E] flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#34232B]">My Guests &bull; Address Book</h4>
                      <p className="text-[10px] text-[#887A78]">Sample Host Workspace Preview</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    420 Saved Contacts
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-[11px]">
                  <span className="px-3 py-1 rounded-full bg-[#401526] text-white font-semibold whitespace-nowrap">
                    All (420)
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#F8F3EB] text-[#57464E] font-medium whitespace-nowrap border border-[#E9DED1]">
                    Family (64)
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#F8F3EB] text-[#57464E] font-medium whitespace-nowrap border border-[#E9DED1]">
                    Relatives (148)
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#F8F3EB] text-[#57464E] font-medium whitespace-nowrap border border-[#E9DED1]">
                    Friends (112)
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#F8F3EB] text-[#57464E] font-medium whitespace-nowrap border border-[#E9DED1]">
                    Colleagues (96)
                  </span>
                </div>

                {/* Simulated Table */}
                <div className="divide-y divide-[#E9DED1]/70 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-[#34232B]">Rajesh &amp; Sunita Verma</h5>
                      <span className="text-[10px] font-mono text-[#887A78]">+91 98201 XXXXX</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-[#FAF5F6] text-[#401526] font-semibold px-2 py-0.5 rounded-md">
                        Family
                      </span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                        Assigned
                      </span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-[#34232B]">Amitabh &amp; Jaya Sharma</h5>
                      <span className="text-[10px] font-mono text-[#887A78]">+91 98112 XXXXX</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-md">
                        Relatives
                      </span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                        Assigned
                      </span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-[#34232B]">Vikramaditya Rathore</h5>
                      <span className="text-[10px] font-mono text-[#887A78]">+91 97173 XXXXX</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-md">
                        Friends
                      </span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                        Assigned
                      </span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-[#34232B]">Priya &amp; Rohan Mehta</h5>
                      <span className="text-[10px] font-mono text-[#887A78]">+91 99204 XXXXX</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-purple-50 text-purple-800 font-semibold px-2 py-0.5 rounded-md">
                        Colleagues
                      </span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                        Assigned
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#F8F3EB] rounded-2xl flex items-center justify-between text-[11px] text-[#57464E]">
                  <span className="flex items-center space-x-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#5C2032]" />
                    <span>Excel Import &amp; Export Enabled</span>
                  </span>
                  <span className="text-[10px] text-[#887A78] font-mono">MyGuests_2026.xlsx</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. EVENT MANAGEMENT (Multi-Event Dashboard)
          ========================================================================= */}
      <section className="py-20 sm:py-28 bg-[#FFFDFC] border-b border-[#E9DED1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
              Unified Celebration Control
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight">
              Manage Every Event{' '}
              <span className="italic font-serif text-[#5C2032]">From One Dashboard.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#6E5E65] leading-relaxed">
              Create multiple events under a single account. Define custom venues, schedules, invitation texts, and specific guest groups for each occasion without crossing data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#34232B]">Multi-Day Celebrations</h3>
              <p className="text-xs text-[#6E5E65] leading-relaxed">
                Indian weddings frequently involve separate ceremonies &mdash; Mehendi, Sangeet, Wedding, and Reception. Create dedicated event cards for each function with unique dates and venues.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#34232B]">Segmented Guest Lists</h3>
              <p className="text-xs text-[#6E5E65] leading-relaxed">
                Invite intimate family to private home ceremonies, while inviting larger circles of friends and colleagues to the main evening reception &mdash; easily mapped from your saved address book.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#34232B]">Event Deadlines &amp; Venues</h3>
              <p className="text-xs text-[#6E5E65] leading-relaxed">
                Specify exact venue locations, arrival times, dress codes, and set automatic RSVP confirmation deadlines (e.g. 3 days before the date) for catering arrangements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. PERSONALIZED DIGITAL INVITATIONS (Smartphone Experience)
          ========================================================================= */}
      <section className="py-20 sm:py-28 bg-[#F8F3EB] border-b border-[#E9DED1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Phone Mockup (Left) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[300px] sm:max-w-[320px] rounded-[40px] bg-[#1F0710] border-4 border-[#34232B] p-3 shadow-2xl shadow-black/30">
                <div className="rounded-[32px] bg-[#2A0814] p-5 text-center text-white space-y-4 border border-[#D8B66E]/30">
                  <div className="w-16 h-1 bg-[#380C19] rounded-full mx-auto" />
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#D8B66E] block">
                    Personalized Digital Invitation
                  </span>

                  <div className="py-2">
                    <p className="text-xs text-[#D8B66E] italic font-serif">Dear</p>
                    <h4 className="font-serif font-bold text-xl text-white">
                      Mr. &amp; Mrs. Sharma
                    </h4>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#1A040D] border border-[#D8B66E]/20 space-y-1 text-xs">
                    <p className="font-serif text-sm font-semibold text-white">Ananya &amp; Siddharth</p>
                    <p className="text-[11px] text-[#B9AAA5]">Wedding Ceremony &bull; Udaipur</p>
                    <p className="text-[10px] text-[#D8B66E] pt-1">Nov 28, 2026 &bull; 6:00 PM</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      className="w-full py-2 bg-[#D8B66E] text-[#2E0B17] font-semibold text-xs rounded-xl shadow-xs"
                    >
                      &check; Attending (Yes)
                    </button>
                    <button
                      type="button"
                      className="w-full py-2 bg-[#380C19] text-[#E5DCD3] font-semibold text-xs rounded-xl border border-[#D8B66E]/20"
                    >
                      &cross; Regretfully Decline
                    </button>
                  </div>

                  <p className="text-[9px] text-[#887A78] pt-1">
                    Demo Illustration &bull; Zero App Download Required
                  </p>
                </div>
              </div>
            </div>

            {/* Right Feature Details */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
                A Personal Touch for Every Guest
              </span>

              <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight leading-tight">
                Not Just a Link.{' '}
                <span className="italic font-serif text-[#5C2032]">A Personal Invitation.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#6E5E65] leading-relaxed">
                Generic broadcast links feel impersonal. INVITE STUDIO generates an individual, bespoke digital invitation URL for every guest on your list. When they click, they see an invitation addressed specifically to them.
              </p>

              <div className="space-y-3.5 pt-2 text-xs text-[#57464E]">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#FAF5F6] text-[#5C2032] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-[#34232B]">Universal Luxury Design:</strong> Heirloom-quality typography, gilded borders, and responsive design tailored for smartphones.
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#FAF5F6] text-[#5C2032] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-[#34232B]">Personalized Guest Names:</strong> Displays your guest&apos;s title and family name directly on the card header.
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#FAF5F6] text-[#5C2032] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-[#34232B]">Unique Unguessable Links:</strong> Cryptographically generated invite tokens prevent unauthorized access.
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#FAF5F6] text-[#5C2032] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-[#34232B]">No App Download Required:</strong> Runs seamlessly on iOS Safari, Android Chrome, and all web browsers.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. WHATSAPP SHARING (Sequential Dispatch & Language Options)
          ========================================================================= */}
      <section className="py-20 sm:py-28 bg-[#FFFDFC] border-b border-[#E9DED1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
              Direct Delivery
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight">
              From Your Dashboard to{' '}
              <span className="italic font-serif text-[#5C2032]">Their WhatsApp.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#6E5E65] leading-relaxed">
              Share personalized invitations with guests directly through WhatsApp, making it easy for everyone to receive and view their invitation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* WhatsApp Preview Box */}
            <div className="lg:col-span-6 bg-[#0B141A] rounded-3xl p-5 sm:p-7 text-white shadow-xl space-y-4 border border-[#233138]">
              <div className="flex items-center justify-between pb-3 border-b border-[#233138]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#25D366] text-[#0B141A] flex items-center justify-center font-bold">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white">WhatsApp Click-to-Chat Message</h4>
                    <span className="text-[10px] text-[#25D366] font-mono">1-Click Dispatch Preview</span>
                  </div>
                </div>

                {/* Language Toggle */}
                <div className="bg-[#1F2C34] p-1 rounded-xl flex items-center space-x-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage('EN')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      selectedLanguage === 'EN' ? 'bg-[#25D366] text-[#0B141A]' : 'text-gray-300'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage('HI')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      selectedLanguage === 'HI' ? 'bg-[#25D366] text-[#0B141A]' : 'text-gray-300'
                    }`}
                  >
                    Hindi (हिंदी)
                  </button>
                </div>
              </div>

              {/* Message Bubble */}
              <div className="bg-[#005C4B] rounded-2xl p-4 text-xs text-[#E9EDEF] space-y-2 leading-relaxed">
                {selectedLanguage === 'EN' ? (
                  <>
                    <p className="font-semibold text-white">Namaste Rajesh ji,</p>
                    <p>
                      You are cordially invited to celebrate the wedding of <strong>Ananya &amp; Siddharth</strong> on <strong>Saturday, November 28, 2026</strong> at Udaipur Palace, Rajasthan.
                    </p>
                    <p className="pt-1 text-[#D8B66E] font-mono text-[11px] underline">
                      https://invitestudio.in/invite/siddharth-ananya?t=xyz789
                    </p>
                    <p className="text-[10px] text-[#A6B7BE] pt-1">
                      Please click the link above to view your special digital invitation and confirm your RSVP. &mdash; Host Family
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-white">नमस्ते राजेश जी,</p>
                    <p>
                      आपको <strong>अनन्या और सिद्धार्थ</strong> के शुभ विवाह समारोह में सपरिवार सादर आमंत्रित किया जाता है। दिनांक: <strong>शनिवार, 28 नवंबर 2026</strong>, स्थान: उदयपुर पैलेस, राजस्थान।
                    </p>
                    <p className="pt-1 text-[#D8B66E] font-mono text-[11px] underline">
                      https://invitestudio.in/invite/siddharth-ananya?t=xyz789
                    </p>
                    <p className="text-[10px] text-[#A6B7BE] pt-1">
                      कृपया निमंत्रण देखने और अपनी उपस्थिति (RSVP) दर्ज करने के लिए ऊपर दिए गए लिंक पर क्लिक करें। &mdash; आयोजक परिवार
                    </p>
                  </>
                )}
              </div>

              <div className="text-[11px] text-[#8696A0] flex items-center justify-between pt-1">
                <span>&bull; Direct host-to-guest WhatsApp dispatch</span>
                <span>Pre-filled &amp; ready to send</span>
              </div>
            </div>

            {/* Explanation Column */}
            <div className="lg:col-span-6 space-y-5">
              <h3 className="font-serif font-bold text-2xl text-[#34232B]">
                Personalized Messages. Individual Links. Zero Spam.
              </h3>

              <p className="text-xs sm:text-sm text-[#6E5E65] leading-relaxed">
                INVITE STUDIO uses WhatsApp&apos;s direct click-to-chat API. When you tap send from your dashboard, WhatsApp opens directly with your guest&apos;s number and their custom invitation message pre-loaded.
              </p>

              <div className="space-y-3 text-xs text-[#57464E]">
                <div className="p-3.5 rounded-2xl bg-[#F8F3EB] border border-[#E9DED1] space-y-1">
                  <strong className="text-[#34232B] block">Personalized WhatsApp Messages</strong>
                  <p className="text-[11px] text-[#6E5E65]">Each message automatically embeds the guest&apos;s personal name, event title, date, time, and venue.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F8F3EB] border border-[#E9DED1] space-y-1">
                  <strong className="text-[#34232B] block">English &amp; Hindi Message Options</strong>
                  <p className="text-[11px] text-[#6E5E65]">Native support for both English and traditional Hindi invitation messaging templates.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F8F3EB] border border-[#E9DED1] space-y-1">
                  <strong className="text-[#34232B] block">Direct Click-to-Chat Dispatch</strong>
                  <p className="text-[11px] text-[#6E5E65]">Messages are sent directly from your own WhatsApp. We do not use third-party spam bots or unauthorized bulk delivery.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. RSVP MANAGEMENT (Live Aggregate Headcounts & Privacy)
          ========================================================================= */}
      <section className="py-20 sm:py-28 bg-[#F8F3EB] border-b border-[#E9DED1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
              Catering &amp; Headcount Accuracy
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight">
              Know Who&apos;s Joining{' '}
              <span className="italic font-serif text-[#5C2032]">Your Celebration.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#6E5E65] leading-relaxed">
              Guests can open their personal invitation link and submit their attendance response without downloading an application.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Features (Left) */}
            <div className="lg:col-span-6 space-y-4 text-xs text-[#57464E]">
              <div className="p-5 rounded-3xl bg-[#FFFDFC] border border-[#E9DED1] space-y-2">
                <h3 className="font-serif font-bold text-base text-[#34232B]">Attending &amp; Declined Responses</h3>
                <p className="text-xs text-[#6E5E65] leading-relaxed">
                  Guests tap Attending or Not Attending in a single click. Their response updates your host dashboard headcounts in real time.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[#FFFDFC] border border-[#E9DED1] space-y-2">
                <h3 className="font-serif font-bold text-base text-[#34232B]">Response Deadlines</h3>
                <p className="text-xs text-[#6E5E65] leading-relaxed">
                  Set RSVP confirmation deadlines before your event date to lock in catering plates, venue seating, and travel arrangements with confidence.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[#FFFDFC] border border-[#E9DED1] space-y-2">
                <h3 className="font-serif font-bold text-base text-[#34232B]">Strict Aggregate Privacy Protection</h3>
                <p className="text-xs text-[#6E5E65] leading-relaxed">
                  In accordance with INVITE STUDIO&apos;s strict privacy architecture, hosts receive total aggregate attendance counts, protecting guest privacy without intrusive individual surveillance.
                </p>
              </div>
            </div>

            {/* Live Aggregate Headcount Dashboard Card Mockup */}
            <div className="lg:col-span-6">
              <div className="bg-[#FFFDFC] rounded-3xl p-6 sm:p-7 border border-[#E9DED1] shadow-xl space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#E9DED1]">
                  <div>
                    <span className="text-[10px] font-sans font-semibold tracking-wider text-[#887A78] uppercase">
                      Live RSVP Headcount (Sample Data)
                    </span>
                    <h4 className="font-serif font-bold text-lg text-[#34232B]">Wedding Reception</h4>
                  </div>
                  <span className="text-xs font-semibold text-[#5C2032] bg-[#FAF5F6] px-3 py-1 rounded-full border border-[#E9DED1]">
                    Total Invited: 250
                  </span>
                </div>

                {/* Metric Summary Grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Attending</span>
                    <strong className="font-serif font-black text-2xl sm:text-3xl text-emerald-700 block mt-1">
                      184
                    </strong>
                    <span className="text-[10px] text-emerald-700 mt-0.5 block">74% of invited</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">Declined</span>
                    <strong className="font-serif font-black text-2xl sm:text-3xl text-red-700 block mt-1">
                      26
                    </strong>
                    <span className="text-[10px] text-red-700 mt-0.5 block">10% of invited</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Awaiting</span>
                    <strong className="font-serif font-black text-2xl sm:text-3xl text-amber-700 block mt-1">
                      40
                    </strong>
                    <span className="text-[10px] text-amber-700 mt-0.5 block">16% of invited</span>
                  </div>
                </div>

                {/* Headcount Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-[#6E5E65]">
                    <span>Headcount Distribution</span>
                    <span className="font-mono font-semibold">210 Responses Logged</span>
                  </div>
                  <div className="w-full bg-[#EBE2D5] h-3 rounded-full overflow-hidden flex">
                    <div style={{ width: '74%' }} className="bg-emerald-600 h-full" title="Attending: 74%" />
                    <div style={{ width: '10%' }} className="bg-red-500 h-full" title="Declined: 10%" />
                    <div style={{ width: '16%' }} className="bg-amber-400 h-full" title="Awaiting: 16%" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8F3EB] text-[11px] text-[#6E5E65] flex items-center justify-between">
                  <span>RSVP Deadline: Nov 25, 2026 (3 Days Before)</span>
                  <span className="font-semibold text-[#5C2032]">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. WHY CHOOSE INVITE STUDIO? (Value Pillars)
          ========================================================================= */}
      <section className="py-20 sm:py-28 bg-[#FFFDFC] border-b border-[#E9DED1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
              The Atelier Advantage
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight">
              Everything You Need to Manage a Celebration,{' '}
              <span className="italic font-serif text-[#5C2032]">in One Place.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#6E5E65] leading-relaxed">
              We built INVITE STUDIO from the ground up for Indian hosts who cherish traditions but demand modern digital convenience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#34232B]">No Need to Print &amp; Distribute</h3>
              <p className="text-xs text-[#6E5E65] leading-relaxed">
                Save hours of stressful courier tracking, delayed envelopes, and expensive printing costs. Deliver directly to your guests&apos; hands.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#34232B]">Reusable Celebration Guestbook</h3>
              <p className="text-xs text-[#6E5E65] leading-relaxed">
                Save guest details once in your permanent celebration address book. Reuse the exact same list for every future family occasion.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#34232B]">Structured Relationship Groups</h3>
              <p className="text-xs text-[#6E5E65] leading-relaxed">
                Group guests into meaningful clusters &mdash; maternal family, paternal relatives, college friends, and office colleagues.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#34232B]">1-Click WhatsApp Dispatch</h3>
              <p className="text-xs text-[#6E5E65] leading-relaxed">
                Generate personalized WhatsApp messages in English or Hindi with unique unguessable links for every recipient.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#34232B]">Accurate Catering Headcounts</h3>
              <p className="text-xs text-[#6E5E65] leading-relaxed">
                Prevent food waste and avoid under-catering with live aggregate headcounts of attending versus declined responses.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#F8F3EB] border border-[#E9DED1] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#401526] text-[#D8B66E] flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#34232B]">Seamless Mobile &amp; Desktop</h3>
              <p className="text-xs text-[#6E5E65] leading-relaxed">
                Manage events on your laptop or directly from your phone. Zero software or apps required for guests.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          11. PRICING SECTION (Dynamic from Backend API)
          ========================================================================= */}
      <section id="pricing" className="py-20 sm:py-28 bg-[#F8F3EB] border-b border-[#E9DED1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
              Transparent Membership Tiers
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight">
              Choose the Plan That{' '}
              <span className="italic font-serif text-[#5C2032]">Fits Your Celebrations.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#6E5E65] leading-relaxed">
              Every plan includes unlimited personalized WhatsApp dispatch links, address book storage, and aggregate private RSVP headcounts.
            </p>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="pt-2 flex items-center justify-center">
              <div className="bg-[#FFFDFC] p-1.5 rounded-full border border-[#E9DED1] inline-flex items-center space-x-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPricingCycle('YEARLY')}
                  className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                    pricingCycle === 'YEARLY'
                      ? 'bg-[#401526] text-white shadow-xs'
                      : 'text-[#6E5E65] hover:text-[#34232B]'
                  }`}
                >
                  <span>Yearly Billing</span>
                  <span className="ml-1.5 text-[10px] text-[#D8B66E] font-bold uppercase">
                    Save ~30%
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPricingCycle('MONTHLY')}
                  className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                    pricingCycle === 'MONTHLY'
                      ? 'bg-[#401526] text-white shadow-xs'
                      : 'text-[#6E5E65] hover:text-[#34232B]'
                  }`}
                >
                  <span>Monthly Billing</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((p) => {
              const isMonthly = pricingCycle === 'MONTHLY';
              const hasMonthly = p.hasMonthlyBilling && (p.priceMonthly ?? 0) > 0;
              const displayPaise = isMonthly && hasMonthly ? p.priceMonthly || 0 : p.priceYearly;
              const priceLabel = isMonthly && hasMonthly ? '/month' : '/year';

              return (
                <div
                  key={p.id}
                  className={`p-8 rounded-3xl bg-[#FFFDFC] border transition-all flex flex-col justify-between ${
                    p.isPopular
                      ? 'border-[#5C2032] ring-2 ring-[#5C2032]/20 shadow-xl relative'
                      : 'border-[#E9DED1] hover:border-[#D8B66E]'
                  }`}
                >
                  <div>
                    {/* Header with Badge */}
                    <div className="flex items-center justify-between mb-4 min-h-[26px]">
                      {p.isPopular ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-white bg-[#5C2032] px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#887A78] bg-[#F8F3EB] px-3 py-1 rounded-full">
                          Tier {p.tier}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif font-bold text-2xl text-[#34232B]">{p.name}</h3>
                    <p className="text-xs text-[#6E5E65] mt-1.5 min-h-[34px]">
                      {p.description || `${p.name} celebratory membership plan`}
                    </p>

                    {/* Price Display */}
                    <div className="mt-5 flex items-baseline">
                      <span className="font-serif font-black text-4xl text-[#34232B]">
                        {displayPaise === 0 ? '₹0' : `₹${(displayPaise / 100).toLocaleString('en-IN')}`}
                      </span>
                      <span className="ml-1.5 text-xs text-[#887A78] font-medium">{priceLabel}</span>
                    </div>

                    {isMonthly && !hasMonthly && (
                      <p className="text-[11px] text-[#5C2032] bg-[#FAF5F6] rounded-xl p-2 mt-2">
                        Monthly billing not configured for {p.name}. Available on yearly plan.
                      </p>
                    )}

                    {/* Quota Limits Highlights */}
                    <div className="mt-6 p-4 rounded-2xl bg-[#F8F3EB] space-y-2 text-xs text-[#57464E]">
                      <div className="flex justify-between">
                        <span className="text-[#887A78]">Max Events:</span>
                        <strong className="text-[#34232B]">{p.maxEvents} events</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#887A78]">Guests / Event:</span>
                        <strong className="text-[#34232B]">{p.maxGuestsPerEvent} guests</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#887A78]">Saved Address Book:</span>
                        <strong className="text-[#34232B]">{p.maxPermanentGuests} contacts</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#887A78]">Custom Templates:</span>
                        <strong className={p.canUploadCustomTemplates ? 'text-[#5C2032]' : 'text-[#887A78]'}>
                          {p.canUploadCustomTemplates ? 'Studio Upload Enabled' : 'Universal Luxury'}
                        </strong>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="mt-6 space-y-2.5 text-xs text-[#57464E]">
                      {(p.features || []).map((feat, fidx) => (
                        <div key={fidx} className="flex items-start">
                          <Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-[#E9DED1]">
                    <Link href="/login" className="block w-full">
                      <button
                        type="button"
                        className={`w-full py-3 rounded-full text-xs font-semibold shadow-sm transition-all ${
                          p.isPopular
                            ? 'bg-[#401526] hover:bg-[#2D0A17] text-white shadow-md'
                            : 'bg-[#F8F3EB] hover:bg-[#EBE2D5] text-[#34232B] border border-[#E9DED1]'
                        }`}
                      >
                        {`Choose ${p.name}`}
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          12. ABOUT INVITE STUDIO (Mission & Philosophy)
          ========================================================================= */}
      <section id="about" className="py-20 sm:py-28 bg-[#FFFDFC] border-b border-[#E9DED1]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
            Our Atelier Philosophy
          </span>

          <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#34232B] tracking-tight">
            Making Every Invitation{' '}
            <span className="italic font-serif text-[#5C2032]">Simpler, Smarter and Digital.</span>
          </h2>

          <div className="space-y-4 text-sm sm:text-base text-[#6E5E65] leading-relaxed max-w-3xl mx-auto font-sans">
            <p>
              INVITE STUDIO is built to simplify how people invite, organize and connect with their guests. We believe celebrations should be about spending time with loved ones &mdash; not managing complicated guest lists, repeated messages and scattered responses.
            </p>
            <p>
              Our goal is to bring digital invitations, guest management, relationship organization and RSVP tracking into one easy-to-use platform.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center space-x-6 text-xs text-[#887A78]">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#5C2032]" />
              <span>Independent &bull; Privacy-First</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Heart className="w-4 h-4 text-[#5C2032]" />
              <span>Crafted for Indian Celebrations</span>
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          13. FAQ SECTION (Accordion)
          ========================================================================= */}
      <section id="faq" className="py-20 sm:py-28 bg-[#F8F3EB] border-b border-[#E9DED1]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#5C2032] uppercase">
              Questions &amp; Clarifications
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-[#34232B] tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#6E5E65]">
              Everything you need to know about creating invitations, guest lists, WhatsApp sharing, and headcounts.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#FFFDFC] border border-[#E9DED1] overflow-hidden transition-all shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between text-sm sm:text-base font-serif font-bold text-[#34232B] hover:text-[#5C2032] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#887A78] transition-transform duration-200 shrink-0 ml-3 ${
                        isOpen ? 'transform rotate-180 text-[#5C2032]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-[#6E5E65] leading-relaxed border-t border-[#E9DED1]/60 pt-3 animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          14. FINAL CTA (Rich Burgundy Banner)
          ========================================================================= */}
      <section className="py-20 sm:py-24 bg-gradient-to-r from-[#380C19] via-[#2A0812] to-[#380C19] text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#D8B66E]/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#401526] border border-[#D8B66E]/30 text-[#D8B66E] text-[10px] font-semibold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Celebrate With Digital Elegance</span>
          </div>

          <h2 className="font-serif font-bold text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            Your Next Celebration Deserves a{' '}
            <span className="italic font-serif text-[#D8B66E]">Digital Beginning.</span>
          </h2>

          <p className="text-sm sm:text-base text-[#E5DCD3] max-w-xl mx-auto leading-relaxed">
            Create your invitation, organize your guests and bring everyone together &mdash; all from one place.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-[#D8B66E] hover:bg-[#E5C378] text-[#2E0B17] font-semibold text-sm px-8 py-3.5 rounded-full shadow-lg shadow-[#D8B66E]/20 transition-all hover:scale-[1.02]"
              >
                <span>Create Your Invitation</span>
                <ArrowRight className="w-4 h-4 text-[#2E0B17]" />
              </button>
            </Link>

            <a href="#features" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-[#2E0B17] hover:bg-[#401526] text-white border border-[#D8B66E]/30 font-semibold text-sm px-7 py-3.5 rounded-full transition-colors"
              >
                <span>Explore Features</span>
              </button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
