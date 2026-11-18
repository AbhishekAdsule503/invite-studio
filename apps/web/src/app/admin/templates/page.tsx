'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminService, AdminSystemTemplate } from '@/services/admin.service';

const OCCASIONS = [
  'WEDDING',
  'BIRTHDAY',
  'ANNIVERSARY',
  'ENGAGEMENT',
  'HOUSEWARMING',
  'FAMILY_GATHERING',
  'OTHER'
];

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<AdminSystemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOccasion, setSelectedOccasion] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AdminSystemTemplate | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('WEDDING');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [defaultMessage, setDefaultMessage] = useState('');

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await adminService.listTemplates();
      setTemplates(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load system templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTitle('');
    setEventType('WEDDING');
    setPreviewImageUrl('');
    setDefaultMessage(
      'Namaste {{guestName}},\nYou are cordially invited to celebrate {{eventName}} with us!\nDate: {{eventDate}}\nVenue: {{venue}}\nRSVP: {{invitationUrl}}'
    );
    setModalOpen(true);
  };

  const openEditModal = (t: AdminSystemTemplate) => {
    setEditingTemplate(t);
    setTitle(t.title);
    setEventType(t.eventType || 'WEDDING');
    setPreviewImageUrl(t.previewImageUrl || '');
    setDefaultMessage(t.defaultMessage);
    setModalOpen(true);
  };

  const handleToggleTemplate = async (t: AdminSystemTemplate) => {
    try {
      await adminService.toggleTemplate(t.id);
      loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle template');
    }
  };

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      const payload = {
        title: title.trim(),
        eventType,
        previewImageUrl: previewImageUrl.trim() || null,
        defaultMessage: defaultMessage.trim()
      };

      if (editingTemplate) {
        await adminService.updateTemplate(editingTemplate.id, payload);
      } else {
        await adminService.createTemplate(payload);
      }

      setModalOpen(false);
      loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredTemplates = selectedOccasion
    ? templates.filter((t) => t.eventType === selectedOccasion)
    : templates;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-charcoal-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-500/30 text-[10px] uppercase font-bold">
              Invitation Studio
            </Badge>
            <span className="text-charcoal-600">•</span>
            <span className="text-xs text-charcoal-400">Total: {templates.length} system presets</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
            System Invitation Templates
          </h1>
          <p className="mt-1 text-xs text-charcoal-400">
            Curate occasion templates available to all hosts. Categorize by Indian cultural celebrations and toggle availability.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          size="sm"
          className="bg-brand-600 hover:bg-brand-500 text-white text-xs space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add System Template</span>
        </Button>
      </div>

      {/* Occasion Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-xs">
        <button
          onClick={() => setSelectedOccasion('')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
            selectedOccasion === ''
              ? 'bg-brand-600 text-white font-semibold'
              : 'bg-charcoal-900 text-charcoal-400 hover:text-white border border-charcoal-800'
          }`}
        >
          All Occasions ({templates.length})
        </button>
        {OCCASIONS.map((occ) => {
          const count = templates.filter((t) => t.eventType === occ).length;
          return (
            <button
              key={occ}
              onClick={() => setSelectedOccasion(occ)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
                selectedOccasion === occ
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'bg-charcoal-900 text-charcoal-400 hover:text-white border border-charcoal-800'
              }`}
            >
              {occ.replace(/_/g, ' ')} ({count})
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-charcoal-500 animate-pulse">
          Loading system invitation templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-20 text-center text-xs text-charcoal-500">
          No templates found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((t) => (
            <div
              key={t.id}
              className={`rounded-3xl bg-charcoal-900/60 border flex flex-col justify-between overflow-hidden transition-all ${
                t.isSystem ? 'border-charcoal-800' : 'border-charcoal-800/40 opacity-60'
              }`}
            >
              {/* Preview Banner */}
              <div className="h-36 bg-gradient-to-tr from-charcoal-900 via-brand-950/40 to-charcoal-800 p-4 flex flex-col justify-between relative overflow-hidden border-b border-charcoal-800">
                <div className="flex items-center justify-between z-10">
                  <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-500/30 text-[9px] uppercase font-bold">
                    {t.eventType?.replace(/_/g, ' ') || 'GENERAL'}
                  </Badge>
                  <Badge variant={t.isSystem ? 'success' : 'danger'} className="text-[9px] uppercase font-bold">
                    {t.isSystem ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="z-10">
                  <h4 className="font-display font-bold text-base text-white">{t.title}</h4>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] text-charcoal-500 font-semibold uppercase tracking-wider block">
                    Default Personalized Message
                  </span>
                  <p className="text-xs text-charcoal-300 line-clamp-4 font-mono bg-charcoal-800/50 p-2.5 rounded-xl border border-charcoal-800/80 leading-relaxed whitespace-pre-wrap">
                    {t.defaultMessage}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-charcoal-800/80 text-xs">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(t)}
                    className="border-charcoal-700 text-charcoal-300 hover:text-white text-xs px-2.5 py-1 h-auto"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    <span>Edit</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleTemplate(t)}
                    className={`text-xs px-2.5 py-1 h-auto border-charcoal-700 ${
                      t.isSystem ? 'text-charcoal-400 hover:text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {t.isSystem ? 'Disable Template' : 'Enable Template'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-charcoal-900 rounded-3xl max-w-lg w-full p-6 border border-charcoal-800 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-800">
              <h3 className="font-display font-bold text-lg text-white">
                {editingTemplate ? 'Edit System Template' : 'Add System Template'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-charcoal-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block text-charcoal-400 font-semibold mb-1">Template Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Royal Vivah Invitation"
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-1">Occasion / Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-brand-500"
                >
                  {OCCASIONS.map((occ) => (
                    <option key={occ} value={occ}>
                      {occ.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-1">Preview Image URL (Optional)</label>
                <input
                  type="text"
                  value={previewImageUrl}
                  onChange={(e) => setPreviewImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 px-3 py-2 text-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-1">
                  Default WhatsApp Message Template
                </label>
                <textarea
                  required
                  rows={5}
                  value={defaultMessage}
                  onChange={(e) => setDefaultMessage(e.target.value)}
                  className="w-full rounded-xl bg-charcoal-800 border border-charcoal-700 p-2.5 text-white font-mono text-[11px] focus:outline-hidden focus:border-brand-500 leading-relaxed"
                />
                <span className="text-[10px] text-charcoal-500 mt-1 block">
                  Placeholders: {'{{guestName}}'}, {'{{eventName}}'}, {'{{eventDate}}'}, {'{{venue}}'}, {'{{invitationUrl}}'}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-charcoal-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={formSubmitting}
                  className="border-charcoal-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={formSubmitting}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-xs"
                >
                  {formSubmitting ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
