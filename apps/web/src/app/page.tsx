import React from 'react';
import Link from 'next/link';
import { Sparkles, Calendar, Users, ShieldCheck, ArrowRight, HeartHandshake, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      {/* Hero Section */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold uppercase tracking-wider mb-8">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Create. Invite. Celebrate.</span>
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-6xl text-charcoal-900 tracking-tight max-w-3xl mx-auto leading-[1.15]">
          Effortless invitations with{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-accent">
            absolute guest privacy
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-charcoal-600 max-w-2xl mx-auto leading-relaxed">
          Manage your permanent guest list, personalize beautiful digital invitations, share via WhatsApp click-to-chat, and get private RSVP headcount summaries.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto text-base">
              Get Started with Mobile OTP
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
              View Host Dashboard
            </Button>
          </Link>
        </div>

        {/* Value Prop Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-charcoal-500">
          <span className="flex items-center"><CheckCircle className="w-4 h-4 text-emerald-600 mr-1.5" /> No App Download Required</span>
          <span className="flex items-center"><CheckCircle className="w-4 h-4 text-emerald-600 mr-1.5" /> 1-Click WhatsApp Delivery</span>
          <span className="flex items-center"><CheckCircle className="w-4 h-4 text-emerald-600 mr-1.5" /> Zero Cross-Guest RSVP Visibility</span>
        </div>
      </section>

      {/* Feature Pillar Cards */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-brand-600 mb-5">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-charcoal-900 text-lg">Reusable &quot;My Guests&quot;</h3>
            <p className="mt-2 text-sm text-charcoal-500 leading-relaxed">
              Store friends, family, and colleagues once. Import from Excel, select them for upcoming events, or add event-only guests with zero duplicate chaos.
            </p>
          </Card>

          <Card className="hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-brand-700 mb-5">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-charcoal-900 text-lg">Personalized WhatsApp Flow</h3>
            <p className="mt-2 text-sm text-charcoal-500 leading-relaxed">
              Personalized invite messages and unique unguessable RSVP links sent directly from your own WhatsApp. Sequential send-and-mark stepper.
            </p>
          </Card>

          <Card className="hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-charcoal-900 text-lg">Private Aggregate Headcounts</h3>
            <p className="mt-2 text-sm text-charcoal-500 leading-relaxed">
              Hosts receive total attending (IN) and declined (OUT) counts. No invasive individual response stalking or public lists between invitees.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

