'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Sparkles,
  Upload,
  Plus,
  Eye,
  Check,
  AlertCircle,
  ImageIcon,
  Heart,
  Cake,
  Flame,
  Home,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { invitationService, InvitationTemplate } from '@/services/invitation.service';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: InvitationTemplate) => void;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Designs' },
  { id: 'WEDDING', label: 'Wedding' },
  { id: 'BIRTHDAY', label: 'Birthday' },
  { id: 'ANNIVERSARY', label: 'Anniversary' },
  { id: 'ENGAGEMENT', label: 'Engagement' },
  { id: 'HOUSEWARMING', label: 'Housewarming' },
  { id: 'OTHER', label: 'Other' }
];

export function TemplateGalleryModal({
  isOpen,
  onClose,
  onSelectTemplate
}: TemplateGalleryModalProps) {
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedPreview, setSelectedPreview] = useState<InvitationTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create Custom Template Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState('WEDDING');
  const [createMessage, setCreateMessage] = useState(
    'Namaste {{guestName}}, we cordially invite you to celebrate {{eventName}} on {{eventDate}} at {{venue}}! Details: {{invitationUrl}}'
  );
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const loadTemplates = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await invitationService.listTemplates(
        activeCategory === 'ALL' ? undefined : activeCategory
      );
      setTemplates(data);
      if (data.length > 0) {
        setSelectedPreview((prev) => prev || data[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates.');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
  }, [isOpen, loadTemplates]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be under 5MB.');
        return;
      }
      setCreateImageFile(file);
      setCreateImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      setError('Title is required.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      let previewImageUrl: string | undefined = undefined;

      if (createImageFile) {
        // Prepare FormData for backend file upload
        const formData = new FormData();
        formData.append('image', createImageFile);
        formData.append('title', createTitle);
        formData.append('eventType', createCategory);
        formData.append('defaultMessage', createMessage);

        // Upload through fetch to /api/v1/templates/upload
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/templates/upload`,
          {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: formData
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Image upload failed.');
        }

        const data = await res.json();
        previewImageUrl = data.template.previewImageUrl;
      } else {
        await invitationService.createCustomTemplate({
          title: createTitle,
          eventType: createCategory,
          previewImageUrl,
          defaultMessage: createMessage
        });
      }

      setShowCreateForm(false);
      setCreateTitle('');
      setCreateImageFile(null);
      setCreateImagePreview('');
      await loadTemplates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create template.');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
      <div className="w-full max-w-5xl bg-surface-card rounded-2xl shadow-2xl border border-surface-border overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Invitation Design Gallery
              </h3>
              <p className="text-xs text-charcoal-500">
                Browse handcrafted occasion templates or upload your own personalized creative
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={showCreateForm ? 'outline' : 'primary'}
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'View Gallery' : <><Plus className="w-4 h-4 mr-1" /> Custom Template</>}
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-surface-warm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Create Custom Template Screen */}
        {showCreateForm ? (
          <form onSubmit={handleCreateTemplate} className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                    Design Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Golden Peacock Invitation"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-white text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                    Occasion Category *
                  </label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-white text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                    Default WhatsApp Invitation Text
                  </label>
                  <textarea
                    rows={4}
                    value={createMessage}
                    onChange={(e) => setCreateMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-white text-xs font-mono text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-[11px] text-charcoal-400 mt-1">
                    Supports &#123;&#123;guestName&#125;&#125;, &#123;&#123;eventName&#125;&#125;, &#123;&#123;eventDate&#125;&#125;, &#123;&#123;venue&#125;&#125;, &#123;&#123;invitationUrl&#125;&#125;
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                    Upload Card Creative Image (JPG, PNG, WebP &lt; 5MB)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-surface-border border-dashed rounded-xl hover:border-brand-400 transition-colors bg-surface-warm/40">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-8 w-8 text-charcoal-400" />
                      <div className="flex text-xs text-charcoal-600">
                        <label className="relative cursor-pointer font-medium text-brand-600 hover:text-brand-500">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-[10px] text-charcoal-400">PNG, JPG, WebP up to 5MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              <div className="bg-surface-warm/60 rounded-2xl p-6 border border-surface-border flex flex-col items-center justify-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 mb-3">
                  Live Design Preview
                </p>
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-surface-border overflow-hidden">
                  <div className="h-48 bg-gradient-to-tr from-brand-800 to-brand-600 relative flex items-center justify-center overflow-hidden">
                    {createImagePreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={createImagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-white/80 p-4">
                        <Sparkles className="w-8 h-8 mx-auto mb-1 text-amber-300" />
                        <span className="text-xs font-medium">Card Creative Art</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <Badge variant="brand" className="text-[10px]">
                      {createCategory}
                    </Badge>
                    <h4 className="font-display font-bold text-base text-charcoal-900">
                      {createTitle || 'Untitled Custom Template'}
                    </h4>
                    <p className="text-xs text-charcoal-500 font-mono line-clamp-3">
                      {createMessage}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-border flex justify-end space-x-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={creating}>
                Save Custom Template
              </Button>
            </div>
          </form>
        ) : (
          /* Gallery Screen */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left: Category list and grid */}
            <div className="flex-1 flex flex-col border-r border-surface-border overflow-hidden">
              {/* Category Filter Pills */}
              <div className="px-6 py-3 border-b border-surface-border flex items-center space-x-2 overflow-x-auto bg-surface-card">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
                      activeCategory === cat.id
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-surface-warm text-charcoal-600 hover:bg-surface-border'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Template Grid */}
              <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                {loading ? (
                  <div className="col-span-3 py-12 text-center text-sm text-charcoal-400">
                    Loading templates...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="col-span-3 py-12 text-center text-sm text-charcoal-400">
                    No templates found in this category.
                  </div>
                ) : (
                  templates.map((tmpl) => {
                    const isSelected = selectedPreview?.id === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedPreview(tmpl)}
                        className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all ${
                          isSelected
                            ? 'border-brand-600 ring-2 ring-brand-500/30 shadow-md'
                            : 'border-surface-border bg-surface-card hover:border-brand-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="h-32 bg-surface-warm relative overflow-hidden flex items-center justify-center">
                          {tmpl.previewImageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={tmpl.previewImageUrl}
                              alt={tmpl.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <Palette className="w-8 h-8 text-brand-400" />
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge variant={tmpl.isSystem ? 'default' : 'brand'} className="text-[9px]">
                              {tmpl.isSystem ? 'Built-in' : 'Custom'}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-3">
                          <p className="font-display font-bold text-xs text-charcoal-900 truncate">
                            {tmpl.title}
                          </p>
                          <p className="text-[10px] text-charcoal-500 mt-0.5">
                            {tmpl.eventType || 'General'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Detailed Preview Sidebar */}
            <div className="w-full md:w-80 bg-surface-warm/40 p-6 flex flex-col justify-between overflow-y-auto">
              {selectedPreview ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-surface-border bg-white overflow-hidden shadow-xs">
                    <div className="h-40 bg-surface-warm relative flex items-center justify-center">
                      {selectedPreview.previewImageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={selectedPreview.previewImageUrl}
                          alt={selectedPreview.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Sparkles className="w-8 h-8 text-brand-500" />
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="brand" className="text-[10px]">
                          {selectedPreview.eventType || 'All Celebrations'}
                        </Badge>
                        <span className="text-[10px] text-charcoal-400">
                          {selectedPreview.isSystem ? 'System Handcrafted' : 'User Template'}
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-base text-charcoal-900">
                        {selectedPreview.title}
                      </h4>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                      Default Message Template
                    </p>
                    <div className="p-3 rounded-xl bg-white border border-surface-border text-xs text-charcoal-600 font-mono leading-relaxed">
                      {selectedPreview.defaultMessage}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900">
                    <span className="font-semibold">Customizable: </span>
                    You can adjust this invitation text per event or leave it as default.
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-charcoal-400 py-12">
                  Select a template to view details
                </div>
              )}

              {selectedPreview && onSelectTemplate && (
                <div className="pt-4 border-t border-surface-border mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      onSelectTemplate(selectedPreview);
                      onClose();
                    }}
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Use This Template
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
