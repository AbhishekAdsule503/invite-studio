import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Database } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
              Data Protection &amp; Confidentiality
            </span>
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#34232B] mt-2">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#887A78] mt-1">
            Last updated: November 2026 &bull; INVITE STUDIO Atelier of Celebrations
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-[#E9DED1] shadow-xs space-y-6 text-sm text-[#57464E] leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">1. Our Core Privacy Philosophy</h2>
            <p>
              At INVITE STUDIO, we believe that celebratory invitations should bring people together without compromising the privacy of hosts or their guests. We do not sell guest data, run third-party advertising trackers, or expose cross-guest RSVP lists.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">2. Strict Aggregate RSVP Protection</h2>
            <p>
              By default, INVITE STUDIO strictly enforces aggregate attendance reporting. Individual guest RSVP responses (Attending vs. Not Attending) are aggregated into overall counts for the host, ensuring guests can respond honestly without fear of social scrutiny or public tracking.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">3. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Host Account Information:</strong> Mobile phone number, full name, email address, and authentication credentials via one-time passwords (OTP).</li>
              <li><strong>Guest List Information:</strong> Names, WhatsApp phone numbers, and optional relations/addresses uploaded or entered by the host to generate personal invitation links.</li>
              <li><strong>Event Information:</strong> Event titles, occasion types, dates, times, and venue locations provided by the host.</li>
              <li><strong>Payment Information:</strong> Transaction identifiers and payment status processed securely through RBI-compliant Indian payment gateways (Razorpay). We never store raw credit/debit card details or banking passwords.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">4. How Information is Used</h2>
            <p>
              Guest phone numbers and names are used solely to allow hosts to generate personalized digital invitation links and dispatch messages via WhatsApp click-to-chat. We do not send unsolicited promotional messages to your guests.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">5. Data Isolation &amp; Security</h2>
            <p>
              All host datasets are isolated by tenant identifier within PostgreSQL with row-level segregation. Cryptographic hashes protect access tokens and invitation links are non-sequential and mathematically unguessable.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">6. Contact Privacy Team</h2>
            <p>
              For inquiries regarding data erasure, account deletion, or privacy governance, please submit a support ticket from your host dashboard or contact <span className="font-mono text-[#401526]">support@invitestudio.in</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
