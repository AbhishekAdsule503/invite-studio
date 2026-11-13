'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  Ban,
  CheckCircle,
  Eye,
  Calendar,
  Sparkles,
  AlertTriangle,
  X,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminService, AdminUserListItem } from '@/services/admin.service';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Details Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Status Modal
  const [statusModalUser, setStatusModalUser] = useState<AdminUserListItem | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await adminService.listUsers({
        search: activeSearch || undefined,
        role: roleFilter || undefined,
        status: statusFilter !== '' ? statusFilter : undefined,
        page,
        limit: 20
      });
      setUsers(res.users);
      setPagination(res.pagination);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [activeSearch, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
  };

  const handleViewDetails = async (id: string) => {
    try {
      setDetailsLoading(true);
      const res = await adminService.getUserDetails(id);
      setSelectedUser(res.user);
    } catch (err: any) {
      alert(err.message || 'Failed to load user details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusModalUser) return;

    try {
      setStatusSubmitting(true);
      const newStatus = !statusModalUser.isActive;
      await adminService.updateUserStatus(statusModalUser.id, newStatus, statusReason);
      setStatusModalUser(null);
      setStatusReason('');
      fetchUsers(pagination.page);
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    } finally {
      setStatusSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-charcoal-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="brand" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase font-bold">
              Privacy Enforced
            </Badge>
            <span className="text-charcoal-600">•</span>
            <span className="text-xs text-charcoal-400">Total: {pagination.total} registered users</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
            User Directory &amp; Accounts
          </h1>
          <p className="mt-1 text-xs text-charcoal-400">
            Search host profiles, audit subscription states, and manage platform account standing. Private guest contacts and individual RSVPs are strictly protected.
          </p>
        </div>

        <Button
          onClick={() => fetchUsers(pagination.page)}
          variant="outline"
          size="sm"
          className="border-charcoal-800 text-charcoal-300 hover:text-white hover:bg-charcoal-800 text-xs space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center space-x-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-charcoal-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by mobile or name..."
              className="w-full text-xs rounded-xl bg-charcoal-900 border border-charcoal-800 pl-9 pr-3 py-2 text-white placeholder-charcoal-500 focus:outline-hidden focus:border-purple-500"
            />
          </div>
          <Button type="submit" size="sm" className="bg-charcoal-800 text-white text-xs hover:bg-charcoal-700">
            Search
          </Button>
        </form>

        <div className="flex items-center space-x-3 text-xs">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl bg-charcoal-900 border border-charcoal-800 px-3 py-2 text-charcoal-300 focus:outline-hidden focus:border-purple-500 text-xs"
          >
            <option value="">All Roles</option>
            <option value="HOST">Host</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-charcoal-900 border border-charcoal-800 px-3 py-2 text-charcoal-300 focus:outline-hidden focus:border-purple-500 text-xs"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-charcoal-900/60 border border-charcoal-800/80 overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-20 text-center text-xs text-charcoal-500 animate-pulse">
            Loading user records from database...
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center space-y-2 text-charcoal-500">
            <Users className="w-8 h-8 mx-auto text-charcoal-600" />
            <p className="text-sm font-medium text-charcoal-400">No users match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-charcoal-800 bg-charcoal-900 text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Host Identity</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Subscription</th>
                  <th className="py-3.5 px-4 text-center">Events</th>
                  <th className="py-3.5 px-4 text-center">Saved Guests</th>
                  <th className="py-3.5 px-4">Joined</th>
                  <th className="py-3.5 px-4">Standing</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-800/80 text-xs text-charcoal-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-charcoal-800/30 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-white">{u.name || 'Personal Host'}</div>
                      <div className="font-mono text-charcoal-400 text-[11px] mt-0.5">{u.mobile}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.role === 'SUPER_ADMIN' ? (
                        <Badge variant="brand" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase font-bold">
                          Admin
                        </Badge>
                      ) : (
                        <span className="text-charcoal-400">Host</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          u.subscription?.status === 'ACTIVE'
                            ? 'success'
                            : u.subscription?.status === 'TRIAL'
                            ? 'brand'
                            : 'danger'
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {u.subscription?.plan?.name || u.subscription?.status || 'None'}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-white">
                      {u._count.events}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-white">
                      {u._count.guests}
                    </td>

                    <td className="py-3.5 px-4 text-charcoal-400 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={u.isActive ? 'success' : 'danger'}
                        className="text-[10px] uppercase font-semibold"
                      >
                        {u.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(u.id)}
                        className="border-charcoal-700 text-charcoal-300 hover:text-white text-xs px-2.5 py-1 h-auto"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>Details</span>
                      </Button>

                      {u.role !== 'SUPER_ADMIN' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatusModalUser(u)}
                          className={`text-xs px-2.5 py-1 h-auto border-charcoal-700 ${
                            u.isActive ? 'text-red-400 hover:bg-red-950/40' : 'text-emerald-400 hover:bg-emerald-950/40'
                          }`}
                        >
                          {u.isActive ? 'Suspend' : 'Reactivate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="py-3 px-5 border-t border-charcoal-800 bg-charcoal-900/80 flex items-center justify-between text-xs text-charcoal-400">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="space-x-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchUsers(pagination.page - 1)}
              className="border-charcoal-800 text-xs px-2.5 py-1 h-auto"
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchUsers(pagination.page + 1)}
              className="border-charcoal-800 text-xs px-2.5 py-1 h-auto"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* User Details Modal (Privacy-Safe) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-charcoal-900 rounded-3xl max-w-lg w-full p-6 border border-charcoal-800 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    {selectedUser.name || 'Personal Host'}
                  </h3>
                  <span className="text-xs text-charcoal-400 font-mono">{selectedUser.mobile}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-charcoal-400 hover:text-white p-1.5 rounded-xl hover:bg-charcoal-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Privacy Compliance Banner */}
            <div className="p-3 rounded-2xl bg-charcoal-800/50 border border-charcoal-700/60 text-[11px] text-charcoal-400 flex items-start space-x-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Policy Safeguard:</strong> Super Admins can only view aggregate event &amp; guest counts. Individual attendee phone numbers and RSVP responses remain encrypted and private to the host.
              </span>
            </div>

            {/* Account Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800">
                <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Events Created</span>
                <span className="font-display font-bold text-xl text-white block mt-0.5">
                  {selectedUser._count?.events || 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800">
                <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Address Book</span>
                <span className="font-display font-bold text-xl text-white block mt-0.5">
                  {selectedUser._count?.guests || 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-charcoal-800/40 border border-charcoal-800">
                <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Custom Templates</span>
                <span className="font-display font-bold text-xl text-white block mt-0.5">
                  {selectedUser._count?.customTemplates || 0}
                </span>
              </div>
            </div>

            {/* Subscription Box */}
            <div className="p-4 rounded-2xl bg-charcoal-800/60 border border-charcoal-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-charcoal-400">Current Membership:</span>
                <Badge variant="success" className="text-[10px] uppercase font-bold">
                  {selectedUser.subscription?.plan?.name || 'TRIAL'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Status:</span>
                <span className="font-semibold text-white">{selectedUser.subscription?.status}</span>
              </div>
              {selectedUser.subscription?.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Expiry Date:</span>
                  <span className="text-charcoal-300 font-mono">
                    {new Date(selectedUser.subscription.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="border-charcoal-700 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Confirmation Modal */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-charcoal-900 rounded-3xl max-w-md w-full p-6 border border-charcoal-800 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-charcoal-800">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                  statusModalUser.isActive ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {statusModalUser.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              </div>
              <h3 className="font-display font-bold text-lg text-white">
                {statusModalUser.isActive ? 'Suspend User Account' : 'Reactivate User Account'}
              </h3>
            </div>

            <p className="text-xs text-charcoal-300 leading-relaxed">
              {statusModalUser.isActive
                ? `Are you sure you want to suspend ${statusModalUser.mobile}? The user will be immediately logged out and blocked from signing in until reactivated.`
                : `Are you sure you want to reactivate ${statusModalUser.mobile}? The user will regain normal access to their account and active subscription.`}
            </p>

            <div>
              <label className="block text-xs font-semibold text-charcoal-400 mb-1">
                Reason for Audit Log (Required)
              </label>
              <textarea
                required
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Provide rationale for account status adjustment..."
                className="w-full text-xs rounded-xl bg-charcoal-800 border border-charcoal-700 p-2.5 text-white placeholder-charcoal-500 focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalUser(null)}
                disabled={statusSubmitting}
                className="border-charcoal-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={statusSubmitting || !statusReason.trim()}
                onClick={handleToggleStatus}
                className={`text-xs text-white ${
                  statusModalUser.isActive
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {statusSubmitting
                  ? 'Updating...'
                  : statusModalUser.isActive
                  ? 'Confirm Suspension'
                  : 'Confirm Reactivation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
