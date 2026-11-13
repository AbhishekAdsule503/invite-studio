'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();

  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/guests') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/invitations') ||
    pathname.startsWith('/subscription');

  if (isDashboardRoute) {
    return null;
  }

  return (
    <footer className="border-t border-surface-border bg-surface-card py-8 text-center text-xs text-charcoal-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
        <p className="font-medium text-charcoal-700">INVITE STUDIO &mdash; Create. Invite. Celebrate.</p>
        <p>&copy; {new Date().getFullYear()} INVITE STUDIO. Multi-tenant SaaS with strict RSVP privacy and WhatsApp sharing.</p>
      </div>
    </footer>
  );
}
