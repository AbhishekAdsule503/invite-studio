'use client';

import React, { useState } from 'react';
import { X, UserPlus, Smartphone, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { guestService, Guest } from '@/services/guest.service';

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (guest: Guest) => void;
  initialData?: Guest | null;
}

export function AddGuestModal({ isOpen, onClose, onSuccess, initialData }: AddGuestModalProps) {
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [whatsappNumber, setWhatsappNumber] = useState(initialData?.whatsappNumber || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [relation, setRelation] = useState(initialData?.relation || 'Family');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contactPickerNotice, setContactPickerNotice] = useState('');

  // Reset or initialize on prop change
  React.useEffect(() => {
    if (initialData) {
      setFullName(initialData.fullName || '');
      setWhatsappNumber(initialData.whatsappNumber || '');
      setEmail(initialData.email || '');
      setAddress(initialData.address || '');
      setRelation(initialData.relation || 'Family');
    } else {
      setFullName('');
      setWhatsappNumber('');
      setEmail('');
      setAddress('');
      setRelation('Family');
    }
    setError('');
    setContactPickerNotice('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Browser Contact Picker API (Part C)
  const handleDeviceContactPicker = async () => {
    setError('');
    setContactPickerNotice('');

    // Feature detection for Web Contacts API
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel', 'email'];
        // @ts-expect-error - Contact Picker API standard in modern mobile browsers
        const contacts = await navigator.contacts.select(props, { multiple: false });
        if (contacts && contacts.length > 0) {
          const c = contacts[0];
          if (c.name && c.name[0]) setFullName(c.name[0]);
          if (c.tel && c.tel[0]) setWhatsappNumber(c.tel[0]);
          if (c.email && c.email[0]) setEmail(c.email[0]);
          setContactPickerNotice('Contact details imported from your device.');
        }
      } catch (err: unknown) {
        // User cancelled or browser rejected
        const msg = err instanceof Error ? err.message : 'Contact import cancelled.';
        if (!msg.toLowerCase().includes('cancel')) {
          setError('Could not access device contacts. Please enter manually.');
        }
      }
    } else {
      setContactPickerNotice(
        'The Contact Picker API is supported on mobile browsers (such as Chrome for Android). On other devices, please enter the details manually below or use Excel import.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Guest full name is required.');
      return;
    }
    if (!whatsappNumber.trim()) {
      setError('WhatsApp mobile number is required.');
      return;
    }

    setLoading(true);
    try {
      if (initialData) {
        const updated = await guestService.updateGuest(initialData.id, {
          fullName,
          whatsappNumber,
          email,
          address,
          relation
        });
        onSuccess(updated);
      } else {
        const created = await guestService.createGuest({
          fullName,
          whatsappNumber,
          email,
          address,
          relation
        });
        onSuccess(created);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save guest.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-surface-card rounded-2xl shadow-xl border border-surface-border overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                {initialData ? 'Edit Guest Details' : 'Add Permanent Guest'}
              </h3>
              <p className="text-xs text-charcoal-500">
                Saved to your reusable &quot;My Guests&quot; address book
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

        {/* Device Contact Picker Trigger */}
        {!initialData && (
          <div className="px-6 pt-4">
            <button
              type="button"
              onClick={handleDeviceContactPicker}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 hover:bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
            >
              <Smartphone className="w-4 h-4 text-brand-600" />
              <span>Import from Device Contacts (Mobile Chrome)</span>
            </button>

            {contactPickerNotice && (
              <p className="mt-2 text-[11px] text-brand-800 bg-brand-50/70 p-2 rounded-lg border border-brand-100 flex items-start space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                <span>{contactPickerNotice}</span>
              </p>
            )}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              placeholder="e.g. Priya Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="WhatsApp Number *"
              placeholder="e.g. 9876543210"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              helperText="10 digits or E.164 (+91...)"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email (Optional)"
              type="email"
              placeholder="priya@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
                Relationship
              </label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Family">Family</option>
                <option value="Friend">Friend</option>
                <option value="Colleague">Colleague</option>
                <option value="Relative">Relative</option>
                <option value="VIP">VIP</option>
                <option value="Neighbor">Neighbor</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <Input
            label="Address / City (Optional)"
            placeholder="e.g. Bandra West, Mumbai"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="pt-4 border-t border-surface-border flex items-center justify-end space-x-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading}>
              <Check className="w-4 h-4 mr-1.5" />
              <span>{initialData ? 'Update Guest' : 'Save Guest'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
