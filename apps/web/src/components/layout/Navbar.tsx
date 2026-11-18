'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, ArrowRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/verify-otp');

  const navLinks = [
    { href: '/#hero', label: 'Home' },
    { href: '/#features', label: 'Features' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#occasions', label: 'Occasions' },
    { href: '/#guest-management', label: 'Guest Management' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/#about', label: 'About Us' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FFFDFC]/95 backdrop-blur-md border-b border-[#E9DED1] shadow-xs transition-all">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 h-20 sm:h-24 flex items-center justify-between gap-4 lg:gap-6">
        {/* Brand Logo & Atelier Tagline */}
        <Link href="/" className="flex items-center space-x-3 sm:space-x-3.5 group shrink-0">
          <div className="w-11 h-11 sm:w-13 sm:h-13 w-[46px] h-[46px] sm:w-[52px] sm:h-[52px] rounded-2xl bg-[#380C19] border border-[#D8B66E]/40 flex items-center justify-center text-[#D8B66E] shadow-sm shadow-[#380C19]/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#D8B66E]" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-serif font-bold text-xl sm:text-2xl tracking-tight text-[#380C19] leading-tight group-hover:text-[#5C2032] transition-colors whitespace-nowrap">
              Invite Studio
            </span>
            <span className="text-[9px] sm:text-[10px] font-sans font-semibold tracking-[0.24em] text-[#887A78] uppercase mt-0.5 whitespace-nowrap">
              Atelier of Celebrations
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links (Single line, no wrapping, responsive padding) */}
        {!isAuthRoute && (
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-2.5 xl:px-3.5 py-2 rounded-xl text-xs xl:text-sm font-medium text-[#4D3A44] hover:text-[#380C19] hover:bg-[#F8F3EB] transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right Actions */}
        <div className="hidden sm:flex items-center space-x-3 xl:space-x-5 shrink-0">
          {isAuthRoute ? (
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-xs xl:text-sm font-semibold text-[#4D3A44] whitespace-nowrap">
                Back to Home
              </Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs xl:text-sm font-semibold text-[#4D3A44] hover:text-[#380C19] transition-colors px-2 py-1.5 whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link href="/login" className="shrink-0">
                <button
                  type="button"
                  className="inline-flex items-center space-x-2 bg-[#401526] hover:bg-[#2D0A17] text-white text-xs xl:text-sm font-semibold px-5 py-2.5 sm:px-6 sm:py-3 rounded-full shadow-md shadow-[#401526]/20 hover:shadow-lg transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  <span>Create Invitation</span>
                  <ArrowRight className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-[#D8B66E] shrink-0" />
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        {!isAuthRoute && (
          <div className="flex lg:hidden items-center space-x-2.5">
            <Link href="/login" className="sm:hidden">
              <button
                type="button"
                className="bg-[#401526] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-sm"
              >
                Create
              </button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="p-2.5 rounded-xl text-[#380C19] hover:bg-[#F8F3EB] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu Sliding Drawer */}
      {mobileMenuOpen && !isAuthRoute && (
        <div className="lg:hidden border-t border-[#E9DED1] bg-[#FFFDFC] px-5 pt-4 pb-7 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-[#44323A] hover:bg-[#F8F3EB] hover:text-[#380C19] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-[#E9DED1] flex flex-col space-y-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 text-sm font-semibold text-[#44323A] rounded-xl hover:bg-[#F8F3EB]"
            >
              Sign In to Your Account
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3.5 bg-[#401526] text-white text-sm font-semibold rounded-full shadow-md flex items-center justify-center space-x-2"
            >
              <span>Create Invitation</span>
              <ArrowRight className="w-4 h-4 text-[#D8B66E]" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
