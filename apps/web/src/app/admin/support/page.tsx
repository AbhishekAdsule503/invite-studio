'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  RefreshCw,
  X,
  User as UserIcon,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminService } from '@/services/admin.service';
import { SupportTicketItem } from '@/services/subscription.service';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Detail / Action modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadTickets = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await adminService.listTickets({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        page,
        limit: 20
      });
      setTickets(res.tickets);
      setPagination(res.pagination);
    } catch (err: any) {
      alert(err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    loadTickets(1);
  }, [loadTickets]);

  const openTicketModal = (t: any) => {
    setSelectedTicket(t);
    setNewStatus(t.status);
    setNewPriority(t.priority);
    setAdminNotes(t.adminNotes || '');
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setUpdating(true);
      await adminService.updateTicket(selectedTicket.id, {
        status: newStatus,
        priority: newPriority,
        adminNotes: adminNotes.trim() || undefined
      });
      setSelectedTicket(null);
      loadTickets(pagination.page);
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-charcoal-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="brand" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase font-bold">
              Host Assistance
            </Badge>
            <span className="text-charcoal-600">•</span>
            <span className="text-xs text-charcoal-400">Total: {pagination.total} tickets</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
            Support Ticketing Desk
          </h1>
          <p className="mt-1 text-xs text-charcoal-400">
            View user inquiries, answer billing questions, assign priorities, and log resolution notes.
          </p>
        </div>

        <Button
          onClick={() => loadTickets(pagination.page)}
          variant="outline"
          size="sm"
          className="border-charcoal-800 text-charcoal-300 hover:text-white hover:bg-charcoal-800 text-xs space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl bg-charcoal-900 border border-charcoal-800 px-3 py-2 text-charcoal-300 focus:outline-hidden focus:border-purple-500 text-xs"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl bg-charcoal-900 border border-charcoal-800 px-3 py-2 text-charcoal-300 focus:outline-hidden focus:border-purple-500 text-xs"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl bg-charcoal-900 border border-charcoal-800 px-3 py-2 text-charcoal-300 focus:outline-hidden focus:border-purple-500 text-xs"
        >
          <option value="">All Categories</option>
          <option value="BILLING">Billing &amp; Payments</option>
          <option value="TECHNICAL">Technical Issue</option>
          <option value="FEATURE">Feature Request</option>
          <option value="GENERAL">General Inquiry</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="rounded-3xl bg-charcoal-900/60 border border-charcoal-800/80 overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-20 text-center text-xs text-charcoal-500 animate-pulse">
            Loading support inquiries...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-20 text-center text-xs text-charcoal-500">
            No support tickets match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-charcoal-800 bg-charcoal-900 text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Ticket Subject</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-800/80 text-xs text-charcoal-300">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-charcoal-800/30 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-white max-w-xs truncate">{t.subject}</div>
                      <div className="text-[11px] text-charcoal-400 line-clamp-1 mt-0.5 max-w-sm">
                        {t.message}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-charcoal-300">
                      <div>{t.user?.mobile}</div>
                      {t.user?.name && <div className="text-[10px] text-charcoal-500">{t.user.name}</div>}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="default" className="border-charcoal-700 bg-charcoal-900 text-charcoal-300 text-[10px]">
                        {t.category}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          t.priority === 'URGENT'
                            ? 'danger'
                            : t.priority === 'HIGH'
                            ? 'brand'
                            : 'default'
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {t.priority}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          t.status === 'RESOLVED' || t.status === 'CLOSED'
                            ? 'success'
                            : t.status === 'IN_PROGRESS'
                            ? 'brand'
                            : 'default'
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {t.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-charcoal-400 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTicketModal(t)}
                        className="border-charcoal-700 text-purple-300 hover:text-white text-xs px-2.5 py-1 h-auto"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        <span>Manage</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Management Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-charcoal-900 rounded-3xl max-w-lg w-full p-6 border border-charcoal-800 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-800">
              <div className="min-w-0 pr-4">
                <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">
                  {selectedTicket.category} • {selectedTicket.priority}
                </span>
                <h3 className="font-display font-bold text-base text-white truncate">
                  {selectedTicket.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-charcoal-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Original User Message */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-charcoal-400 uppercase font-semibold">User Message:</span>
              <p className="p-3 rounded-2xl bg-charcoal-800/60 border border-charcoal-800 text-xs text-charcoal-200 leading-relaxed whitespace-pre-wrap">
                {selectedTicket.message}
              </p>
              <div className="text-[10px] text-charcoal-500 font-mono">
                From: {selectedTicket.user?.mobile} • Submitted {new Date(selectedTicket.createdAt).toLocaleString()}
              </div>
            </div>

            <form onSubmit={handleUpdateTicket} className="space-y-4 text-xs pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal-400 font-semibold mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-charcoal-400 font-semibold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-1">
                  Resolution Notes / Reply (Logged to AuditLog)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record explanation, resolution details, or guidance provided to host..."
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 p-2.5 text-white focus:outline-hidden focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-charcoal-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTicket(null)}
                  disabled={updating}
                  className="border-charcoal-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updating}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                >
                  {updating ? 'Saving...' : 'Update Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
