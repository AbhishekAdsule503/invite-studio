import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicyPage() {
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
              Billing Governance
            </span>
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#34232B] mt-2">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-xs text-[#887A78] mt-1">
            Last updated: November 2026 &bull; INVITE STUDIO
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-[#E9DED1] shadow-xs space-y-6 text-sm text-[#57464E] leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">1. Digital Membership Nature</h2>
            <p>
              INVITE STUDIO provides immediate access to digital tools, quota increases, and invitation generation upon confirmed payment through our integrated payment gateway.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">2. Subscription Cancellation</h2>
            <p>
              Hosts can cancel their recurring monthly or yearly subscription at any time directly through the Subscription settings tab in their host dashboard. Once cancelled, active paid benefits continue until the end of the paid billing period.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">3. Refund Eligibility Window</h2>
            <p>
              If you experience technical defects that prevent the creation or delivery of your event invitations and our engineering support is unable to resolve the issue within 48 hours, you are entitled to a full refund if requested within <strong>7 days</strong> of purchase.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#34232B]">4. How to Request a Refund</h2>
            <p>
              To initiate a refund request, please open a Support Ticket from your host dashboard or email <span className="font-mono text-[#401526]">support@invitestudio.in</span> with your Order ID, registered mobile number, and reason for the request. Approved refunds are credited to the original payment source within 5 to 7 banking days.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
