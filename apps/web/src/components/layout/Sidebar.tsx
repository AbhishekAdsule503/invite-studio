'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Users,
  Calendar,
  Mail,
  Crown,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { Badge } from '@/components/ui/Badge';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Sparkles },
    { href: '/guests', label: 'My Guests', icon: Users },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/invitations', label: 'Invitations', icon: Mail },
    { href: '/subscription', label: 'Subscription', icon: Crown },
  ];

  return (
    <aside className="w-64 bg-surface-card border-r border-surface-border flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-surface-border">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-sm shadow-brand-700/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-brand-accent" />
          </div>
          <div>
            <span className="font-display font-extrabold text-base tracking-tight text-charcoal-900 block leading-tight">
              INVITE STUDIO
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-brand-600 block leading-tight">
              Host Workspace
            </span>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-surface-warm"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                'flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                isActive
                  ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-surface-warm'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 transition-transform group-hover:scale-110',
                  isActive ? 'text-brand-600' : 'text-charcoal-400 group-hover:text-charcoal-600'
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {user?.role === 'SUPER_ADMIN' && (
          <div className="pt-3 border-t border-surface-border/60">
            <Link
              href="/admin/dashboard"
              onClick={onCloseMobile}
              className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 transition-all border border-brand-200/80"
            >
              <ShieldAlert className="w-4 h-4 text-brand-600 shrink-0" />
              <span>Super Admin Panel</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Host Profile & Logout Footer */}
      <div className="p-3 border-t border-surface-border bg-surface-card/50">
        <div className="p-3 rounded-2xl bg-surface-warm/70 border border-surface-border/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-charcoal-900 truncate">
                {user?.name || user?.mobile || 'Host'}
              </p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Badge variant="success" className="text-[10px] px-1.5 py-0 uppercase">
                  {user?.subscription?.status || 'TRIAL'}
                </Badge>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Log Out"
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
export default Sidebar;
