'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Sparkles, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user && (user.isProfileComplete === false || !user.name || !user.email)) {
        router.replace('/complete-profile');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // Loading skeleton while session hydrates
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-ivory">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 animate-pulse">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-xs text-charcoal-500 font-medium">Loading host session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-ivory flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-charcoal-900/50 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 md:hidden transform transition-transform duration-200 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-surface-border bg-surface-card/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl text-charcoal-600 hover:text-charcoal-900 hover:bg-surface-warm"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-display font-bold text-sm text-charcoal-900">
              INVITE STUDIO
            </span>
          </div>

          <button
            onClick={() => logout()}
            className="p-2 rounded-xl text-charcoal-500 hover:text-red-600 hover:bg-red-50"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 bg-surface-ivory">
          {children}
        </main>
      </div>
    </div>
  );
}
