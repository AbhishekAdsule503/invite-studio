'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { guestService, Guest } from '@/services/guest.service';
import { AddGuestModal } from '@/components/guests/AddGuestModal';
import { ExcelImportModal } from '@/components/guests/ExcelImportModal';

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [relationFilter, setRelationFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGuests, setTotalGuests] = useState(0);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await guestService.listGuests({
        search: searchTerm,
        relation: relationFilter,
        page,
        limit: 15
      });
      setGuests(data.guests);
      setTotalPages(data.pagination.totalPages);
      setTotalGuests(data.pagination.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load guests.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, relationFilter, page]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchGuests();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchGuests]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(guests.map((g) => g.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDeleteSingle = async (guest: Guest) => {
    if (!confirm(`Are you sure you want to delete ${guest.fullName} from your address book?`)) {
      return;
    }
    try {
      await guestService.deleteGuest(guest.id);
      fetchGuests();
      selectedIds.delete(guest.id);
      setSelectedIds(new Set(selectedIds));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete guest');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!confirm(`Are you sure you want to delete ${ids.length} selected guest(s)?`)) return;

    setBulkDeleting(true);
    try {
      await guestService.bulkDeleteGuests(ids);
      setSelectedIds(new Set());
      fetchGuests();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Bulk deletion failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      await guestService.exportGuests();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Reusable Guest Directory ({totalGuests} Total)</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl text-charcoal-900 tracking-tight">
            My Guests
          </h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Manage your permanent address book once, and invite guests across multiple celebrations without re-entering numbers.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setIsExcelModalOpen(true)}>
            <Upload className="w-4 h-4 mr-1.5" />
            <span>Import Excel</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport} disabled={totalGuests === 0}>
            <Download className="w-4 h-4 mr-1.5" />
            <span>Export</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingGuest(null);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add Guest</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search, Relation Filter, and Bulk Actions Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, WhatsApp, email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Relation Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { label: 'All', value: '' },
              { label: 'Family', value: 'Family' },
              { label: 'Friend', value: 'Friend' },
              { label: 'Colleague', value: 'Colleague' },
              { label: 'Relative', value: 'Relative' },
              { label: 'VIP', value: 'VIP' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setRelationFilter(tab.value);
                  setPage(1);
                }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
                  relationFilter === tab.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-warm text-charcoal-600 hover:bg-surface-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bulk Selection Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-2 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-brand-800">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 py-1 px-2.5 text-xs h-7"
                onClick={handleBulkDelete}
                isLoading={bulkDeleting}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Delete Selected</span>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Guests Table */}
      <Card className="overflow-hidden p-0 shadow-sm border-surface-border">
        {loading ? (
          <div className="p-12 text-center text-sm text-charcoal-400">
            <Users className="w-8 h-8 animate-pulse text-brand-500 mx-auto mb-2" />
            <p>Loading guest directory...</p>
          </div>
        ) : guests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-charcoal-900">
              No guests found
            </h3>
            <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
              {searchTerm || relationFilter
                ? 'Try clearing your search term or relation filters to see all guests.'
                : 'Start building your permanent address book by adding your first guest or importing an Excel spreadsheet.'}
            </p>
            {!searchTerm && !relationFilter && (
              <div className="flex items-center justify-center space-x-3 pt-2">
                <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Add First Guest</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsExcelModalOpen(true)}>
                  <Upload className="w-4 h-4 mr-1.5" />
                  <span>Import Excel</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-warm border-b border-surface-border text-xs uppercase text-charcoal-500 font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === guests.length && guests.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-surface-border text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th className="px-6 py-3.5">Guest Name</th>
                  <th className="px-6 py-3.5">WhatsApp</th>
                  <th className="px-6 py-3.5">Relation</th>
                  <th className="px-6 py-3.5">Address</th>
                  <th className="px-6 py-3.5 text-center">Events</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-white">
                {guests.map((guest) => {
                  const isSelected = selectedIds.has(guest.id);
                  return (
                    <tr
                      key={guest.id}
                      className={`hover:bg-surface-warm/40 transition-colors ${
                        isSelected ? 'bg-brand-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(guest.id)}
                          className="rounded border-surface-border text-brand-600 focus:ring-brand-500"
                        />
                      </td>

                      <td className="px-6 py-3.5 font-medium text-charcoal-900">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {guest.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{guest.fullName}</p>
                            {guest.email && (
                              <p className="text-xs text-charcoal-400 font-normal">{guest.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-charcoal-700 font-mono text-xs">
                        <a
                          href={`https://wa.me/${guest.whatsappNumber.replace('+', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 hover:text-emerald-600 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{guest.whatsappNumber}</span>
                        </a>
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge variant="default" className="text-xs">
                          {guest.relation || 'Guest'}
                        </Badge>
                      </td>

                      <td className="px-6 py-3.5 text-charcoal-500 text-xs truncate max-w-xs">
                        {guest.address || '—'}
                      </td>

                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-warm text-charcoal-600">
                          {guest._count?.eventGuests || 0}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingGuest(guest);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-charcoal-400 hover:text-brand-600 hover:bg-surface-warm transition-colors"
                            title="Edit Guest"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(guest)}
                            className="p-1.5 rounded-lg text-charcoal-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Guest"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 bg-surface-warm border-t border-surface-border flex items-center justify-between text-xs text-charcoal-500">
            <span>
              Showing page {page} of {totalPages} ({totalGuests} guests)
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Guest Modal */}
      <AddGuestModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingGuest(null);
        }}
        initialData={editingGuest}
        onSuccess={() => fetchGuests()}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={() => fetchGuests()}
      />
    </div>
  );
}
