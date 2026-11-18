'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Search, Check, AlertCircle, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { guestService, Guest } from '@/services/guest.service';
import { eventService, EventGuest } from '@/services/event.service';

interface AddEventGuestsModalProps {
  isOpen: boolean;
  eventId: string;
  eventName: string;
  currentEventGuests: EventGuest[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEventGuestsModal({
  isOpen,
  eventId,
  eventName,
  currentEventGuests,
  onClose,
  onSuccess
}: AddEventGuestsModalProps) {
  const [activeTab, setActiveTab] = useState<'SELECT_EXISTING' | 'ADD_NEW'>('SELECT_EXISTING');

  // Existing guests state
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [searchGuest, setSearchGuest] = useState('');
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());

  // New guest state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newRelation, setNewRelation] = useState('Family');
  const [saveToMyGuests, setSaveToMyGuests] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Already assigned guest IDs
  const assignedGuestIds = new Set(
    currentEventGuests.map((eg) => eg.guestId).filter(Boolean) as string[]
  );
  const assignedPhones = new Set(currentEventGuests.map((eg) => eg.whatsappNumber));

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSelectedGuestIds(new Set());
      setLoadingGuests(true);
      guestService
        .listGuests({ limit: 100 })
        .then((res) => setAllGuests(res.guests))
        .catch(() => setError('Failed to load guest directory'))
        .finally(() => setLoadingGuests(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredExistingGuests = allGuests.filter((g) => {
    const term = searchGuest.toLowerCase();
    return (
      g.fullName.toLowerCase().includes(term) ||
      g.whatsappNumber.includes(term) ||
      (g.relation && g.relation.toLowerCase().includes(term))
    );
  });

  const handleToggleGuestSelect = (guestId: string) => {
    if (assignedGuestIds.has(guestId)) return;
    const next = new Set(selectedGuestIds);
    if (next.has(guestId)) next.delete(guestId);
    else next.add(guestId);
    setSelectedGuestIds(next);
  };

  const handleAddExistingSubmit = async () => {
    const ids = Array.from(selectedGuestIds);
    if (ids.length === 0) {
      setError('Please select at least one guest to add.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await eventService.addExistingGuests(eventId, ids);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add guests to event.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('Guest full name is required.');
      return;
    }
    if (!newPhone.trim()) {
      setError('WhatsApp number is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await eventService.addNewGuest(eventId, {
        name: newName,
        whatsappNumber: newPhone,
        email: newEmail,
        address: newAddress,
        relation: newRelation,
        saveToMyGuests
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add guest.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-surface-card rounded-2xl shadow-xl border border-surface-border overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Add Guests to {eventName}
              </h3>
              <p className="text-xs text-charcoal-500">
                Choose from your reusable directory or add a new guest for this celebration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-surface-warm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-surface-border flex space-x-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('SELECT_EXISTING');
              setError('');
            }}
            className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors ${
              activeTab === 'SELECT_EXISTING'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            Select from My Guests
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ADD_NEW');
              setError('');
            }}
            className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors ${
              activeTab === 'ADD_NEW'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            Add New Guest
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'SELECT_EXISTING' ? (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search existing guests..."
                  value={searchGuest}
                  onChange={(e) => setSearchGuest(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-border bg-surface-card text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Guest list checklist */}
              <div className="border border-surface-border rounded-xl divide-y divide-surface-border max-h-72 overflow-y-auto">
                {loadingGuests ? (
                  <div className="p-8 text-center text-xs text-charcoal-400">Loading guests...</div>
                ) : filteredExistingGuests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-charcoal-400">
                    No matching guests found.
                  </div>
                ) : (
                  filteredExistingGuests.map((guest) => {
                    const isAlreadyAssigned =
                      assignedGuestIds.has(guest.id) || assignedPhones.has(guest.whatsappNumber);
                    const isSelected = selectedGuestIds.has(guest.id);

                    return (
                      <div
                        key={guest.id}
                        onClick={() => !isAlreadyAssigned && handleToggleGuestSelect(guest.id)}
                        className={`p-3 flex items-center justify-between transition-colors ${
                          isAlreadyAssigned
                            ? 'bg-surface-warm/60 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-brand-50/50 cursor-pointer'
                            : 'hover:bg-surface-warm/40 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isAlreadyAssigned}
                            onChange={() => handleToggleGuestSelect(guest.id)}
                            className="rounded border-surface-border text-brand-600 focus:ring-brand-500"
                          />
                          <div>
                            <p className="text-sm font-semibold text-charcoal-900">{guest.fullName}</p>
                            <p className="text-xs text-charcoal-500 font-mono">{guest.whatsappNumber}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge variant="default" className="text-xs">
                            {guest.relation || 'Guest'}
                          </Badge>
                          {isAlreadyAssigned && (
                            <Badge variant="brand" className="text-[10px]">
                              Already Added
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* ADD NEW GUEST FORM */
            <form onSubmit={handleAddNewSubmit} id="add-new-guest-form" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Guest Full Name *"
                  placeholder="e.g. Ramesh Patel"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
                <Input
                  label="WhatsApp Number *"
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email (Optional)"
                  type="email"
                  placeholder="ramesh@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
                    Relation
                  </label>
                  <select
                    value={newRelation}
                    onChange={(e) => setNewRelation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Family">Family</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Relative">Relative</option>
                    <option value="VIP">VIP</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <Input
                label="Address / City (Optional)"
                placeholder="e.g. Surat, Gujarat"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />

              {/* Workflow Toggle: Save to My Guests vs Only This Event */}
              <div className="p-3.5 rounded-xl bg-surface-warm border border-surface-border flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="saveToMyGuestsCheck"
                  checked={saveToMyGuests}
                  onChange={(e) => setSaveToMyGuests(e.target.checked)}
                  className="mt-1 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="saveToMyGuestsCheck" className="text-xs text-charcoal-700 cursor-pointer">
                  <span className="font-semibold text-charcoal-900 block">
                    Save to My Guests address book
                  </span>
                  <span>
                    When enabled, this guest is preserved in your permanent directory for future celebrations.
                  </span>
                </label>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between bg-surface-card">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          {activeTab === 'SELECT_EXISTING' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddExistingSubmit}
              disabled={selectedGuestIds.size === 0 || submitting}
              isLoading={submitting}
            >
              <Check className="w-4 h-4 mr-1.5" />
              <span>Add {selectedGuestIds.size} Selected Guest(s)</span>
            </Button>
          ) : (
            <Button
              type="submit"
              form="add-new-guest-form"
              variant="primary"
              size="sm"
              isLoading={submitting}
            >
              <Check className="w-4 h-4 mr-1.5" />
              <span>Add Guest to Event</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
