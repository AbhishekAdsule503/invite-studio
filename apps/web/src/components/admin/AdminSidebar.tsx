'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Crown,
  Layers,
  LifeBuoy,
  Settings,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  X,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { Badge } from '@/components/ui/Badge';

interface AdminSidebarProps {
  onCloseMobile?: () => void;
}

export function AdminSidebar({ onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'User Directory', icon: Users },
    { href: '/admin/plans', label: 'Plan Pricing & Quotas', icon: CreditCard },
    { href: '/admin/subscriptions', label: 'Subscriptions & Billing', icon: Crown },
    { href: '/admin/templates', label: 'System Templates', icon: Layers },
    { href: '/admin/support', label: 'Support Tickets', icon: LifeBuoy },
    { href: '/admin/settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-charcoal-950 border-r border-charcoal-800 text-white flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-charcoal-800">
        <Link href="/admin/dashboard" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-brand-500 flex items-center justify-center text-white shadow-sm shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <span className="font-display font-extrabold text-base tracking-tight text-white block leading-tight">
              INVITE STUDIO
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-400 block leading-tight">
              Super Admin
            </span>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-charcoal-400 hover:text-white hover:bg-charcoal-800"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Switcher Back to Host Workspace */}
      <div className="px-3 pt-3">
        <Link
          href="/dashboard"
          className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-xs font-semibold text-charcoal-300 hover:text-white border border-charcoal-800/80 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span>Exit to Host Workspace</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-charcoal-500">
          Super Admin Console
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                'flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group',
                isActive
                  ? 'bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/30'
                  : 'text-charcoal-400 hover:text-white hover:bg-charcoal-900'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 transition-transform group-hover:scale-110',
                  isActive ? 'text-purple-400' : 'text-charcoal-500 group-hover:text-charcoal-300'
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Admin Profile Footer */}
      <div className="p-3 border-t border-charcoal-800/80 bg-charcoal-900/40">
        <div className="p-2.5 rounded-2xl bg-charcoal-900 border border-charcoal-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || user?.mobile || 'Super Admin'}
              </p>
              <span className="text-[10px] text-purple-400 font-bold block uppercase tracking-wider">
                Full Privileges
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Log Out"
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
