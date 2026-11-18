import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsConditionsPage() {
  return (
    <div className="bg-[#F8F3EB] min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-[#5C2032] hover:text-[#401526] mb-4 space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#D8B66E] bg-[#401526] px-2.5 py-1 rounded-full">
              Platform Terms of Service
            </span>
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#34232B] mt-2">
            Terms &amp; Conditions
          </h1>
          <p className="text-xs text-[#887A78] mt-1">
            Last updated: November 2026 &bull; INVITE STUDIO
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-[#E9DED1] shadow-xs space-y-6 text-sm text-[#57464E] leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">1. Acceptance of Terms</h2>
            <p>
              By signing up for or using INVITE STUDIO, you agree to comply with and be bound by these Terms and Conditions. These terms govern your use of our digital invitation creation, guest management, and RSVP services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">2. Account Registration &amp; Security</h2>
            <p>
              You agree to provide accurate mobile or email details when logging in via one-time verification. You are responsible for safeguarding your session tokens and ensuring that unauthorized individuals do not access your host dashboard.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">3. Responsible Use of Guest Data &amp; WhatsApp Sharing</h2>
            <p>
              Hosts are solely responsible for ensuring they possess legitimate consent to contact the guest numbers uploaded to the platform. INVITE STUDIO provides click-to-chat utility links for direct host-to-guest messaging; we do not spam or perform illegal robocalling.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">4. Subscription Tiers &amp; Quota Entitlements</h2>
            <p>
              Paid subscription memberships provide specific quota allocations for events created, guests per event, and address book size according to the active plan selected. Quotas are server-enforced and renew in accordance with the chosen monthly or annual billing cycle.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">5. Intellectual Property</h2>
            <p>
              The INVITE STUDIO brand, layout, design assets, and invitation typography systems are proprietary. User-uploaded event photos, logos, and custom invitation graphics remain the property of the host.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
