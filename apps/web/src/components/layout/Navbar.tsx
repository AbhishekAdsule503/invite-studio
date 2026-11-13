'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Users, Calendar, Mail, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Sparkles },
    { href: '/guests', label: 'My Guests', icon: Users },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/invitations', label: 'Invitations', icon: Mail },
  ];

  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/guests') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/invitations') ||
    pathname.startsWith('/subscription');

  if (isDashboardRoute) {
    return null;
  }

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/verify-otp') || pathname.startsWith('/invite');

  return (
    <header className="border-b border-surface-border bg-surface-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-sm shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-bold text-xl tracking-tight text-charcoal-900">
              INVITE STUDIO
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        {!isAuthRoute && (
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-surface-warm'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Action */}
        <div className="flex items-center space-x-3">
          {pathname.startsWith('/login') || pathname.startsWith('/verify-otp') ? (
            <Link href="/">
              <Button variant="ghost" size="sm">
                Back to Home
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm">
                Sign In / Join
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

