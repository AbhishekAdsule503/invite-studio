'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Menu, Sparkles, LogOut, ArrowLeft, ShieldX } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/Button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-950 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-accent animate-pulse">
            <ShieldAlert className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-xs text-charcoal-400 font-medium">Authenticating Super Admin session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Access control check: Only SUPER_ADMIN accounts can enter admin workspace
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-ivory px-4">
        <div className="max-w-md w-full bg-surface-card rounded-3xl p-8 border border-surface-border text-center shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-2xl text-charcoal-900">
            Access Denied
          </h2>
          <p className="text-xs text-charcoal-500">
            The Super Admin Panel is restricted to authorized platform administrators. Your account (<span className="font-mono text-charcoal-800">{user?.mobile}</span>) does not hold the SUPER_ADMIN role.
          </p>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button variant="primary" className="w-full">
                Return to Host Workspace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0f12] text-charcoal-100 flex flex-col md:flex-row antialiased">
      {/* Desktop Admin Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        <AdminSidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 md:hidden transform transition-transform duration-200 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AdminSidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen bg-[#0d0f12]">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-charcoal-800 bg-charcoal-950/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl text-charcoal-400 hover:text-white hover:bg-charcoal-800"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-800 to-brand-600 flex items-center justify-center text-white">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <span className="font-display font-bold text-sm text-white">
              ADMIN CONSOLE
            </span>
          </div>

          <button
            onClick={() => logout()}
            className="p-2 rounded-xl text-charcoal-400 hover:text-red-400 hover:bg-red-950/30"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Dynamic Admin Page Content */}
        <main className="flex-1 bg-[#0d0f12] text-charcoal-100">
          {children}
        </main>
      </div>
    </div>
  );
}
