'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Download,
  Image as ImageIcon,
  Languages,
  RotateCcw,
  Sparkles,
  Share2,
  Upload,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { invitationService, InvitationItem } from '@/services/invitation.service';
import {
  generateInvitationCardDataUrl,
  generateInvitationCardFile
} from '@/lib/invitationCardGenerator';
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  formatWhatsAppInvitationMessage
} from '@smart-invitation/shared';

interface WhatsAppDispatchStepperModalProps {
  isOpen: boolean;
  invitations: InvitationItem[];
  startIndex?: number;
  eventName?: string;
  eventType?: string | null;
  eventDate?: string | Date;
  eventTime?: string | null;
  venue?: string;
  hostName?: string | null;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export function WhatsAppDispatchStepperModal({
  isOpen,
  invitations,
  startIndex = 0,
  eventName: propEventName,
  eventType: propEventType,
  eventDate: propEventDate,
  eventTime: propEventTime,
  venue: propVenue,
  hostName: propHostName,
  onClose,
  onStatusUpdated
}: WhatsAppDispatchStepperModalProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN');
  const [attachCard, setAttachCard] = useState<boolean>(true);
  const [cardMode, setCardMode] = useState<'AUTO' | 'CUSTOM'>('AUTO');
  const [customCardFile, setCustomCardFile] = useState<File | null>(null);
  const [customCardPreviewUrl, setCustomCardPreviewUrl] = useState<string | null>(null);
  const [customCardFileName, setCustomCardFileName] = useState<string>('');
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  // Sync index if startIndex changes
  useEffect(() => {
    if (startIndex >= 0 && startIndex < invitations.length) {
      setCurrentIndex(startIndex);
    }
  }, [startIndex, invitations.length]);

  const currentInv = invitations[currentIndex] || invitations[0];
  const isLast = currentIndex === invitations.length - 1;
  const isFirst = currentIndex === 0;

  const sentCount = invitations.filter((inv) => inv.whatsappStatus === 'SENT').length;
  const pendingCount = invitations.length - sentCount;
  const percentComplete = invitations.length > 0 ? Math.round((sentCount / invitations.length) * 100) : 0;

  // Resolve active event details
  const activeEventName = currentInv?.eventName || propEventName || 'Celebration Event';
  const activeEventType = currentInv?.eventType || propEventType || 'WEDDING';
  const activeEventDate = currentInv?.eventDate || propEventDate || new Date().toISOString();
  const activeEventTime = currentInv?.eventTime || propEventTime || '';
  const activeVenue = currentInv?.eventVenue || propVenue || 'Venue Details';
  const activeHostName = currentInv?.hostName || propHostName || 'Your Host';
  const cleanPhone = currentInv?.eventGuest?.whatsappNumber
    ? currentInv.eventGuest.whatsappNumber.replace(/[^\d]/g, '')
    : '';

  // Formatted date string for message
  const formattedEventDate = useMemo(() => {
    try {
      const d = new Date(activeEventDate);
      return isNaN(d.getTime())
        ? String(activeEventDate)
        : d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
    } catch {
      return String(activeEventDate);
    }
  }, [activeEventDate]);

  // Compute default personalized message for current guest & language
  const defaultMessage = useMemo(() => {
    if (!currentInv) return '';
    return formatWhatsAppInvitationMessage({
      guestName: currentInv.eventGuest.name,
      eventName: activeEventName,
      eventDate: formattedEventDate,
      eventTime: activeEventTime,
      venue: activeVenue,
      invitationUrl: currentInv.invitationUrl,
      hostName: activeHostName,
      language
    });
  }, [
    currentInv,
    activeEventName,
    formattedEventDate,
    activeEventTime,
    activeVenue,
    activeHostName,
    language
  ]);

  // Whenever guest index or language changes, sync edited message
  useEffect(() => {
    setEditedMessage(defaultMessage);
    setDownloadSuccessNotice(null);
  }, [defaultMessage]);

  // Generate card image preview whenever current guest changes
  const refreshCardPreview = useCallback(async () => {
    if (!currentInv) return;
    setIsGeneratingCard(true);
    try {
      const dataUrl = await generateInvitationCardDataUrl({
        eventName: activeEventName,
        eventType: activeEventType,
        guestName: currentInv.eventGuest.name,
        hostName: activeHostName,
        eventDate: activeEventDate,
        eventTime: activeEventTime,
        venue: activeVenue
      });
      setCardPreviewUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate card preview:', err);
    } finally {
      setIsGeneratingCard(false);
    }
  }, [currentInv, activeEventName, activeEventType, activeHostName, activeEventDate, activeEventTime, activeVenue]);

  useEffect(() => {
    if (isOpen && currentInv) {
      refreshCardPreview();
    }
  }, [isOpen, currentInv, refreshCardPreview]);

  // Preload custom card if current invitation has coverImageUrl
  useEffect(() => {
    if (currentInv?.coverImageUrl && !customCardFile) {
      setCustomCardPreviewUrl(currentInv.coverImageUrl);
      setCustomCardFileName('Celebration Custom Card');
    }
  }, [currentInv?.coverImageUrl, customCardFile]);

  const handleCustomCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Card image size must be less than 10MB.');
      return;
    }

    setCustomCardFile(file);
    setCustomCardFileName(file.name);
    const objectUrl = URL.createObjectURL(file);
    setCustomCardPreviewUrl(objectUrl);
    setError('');
  };

  const handleRemoveCustomCard = () => {
    setCustomCardFile(null);
    setCustomCardPreviewUrl(null);
    setCustomCardFileName('');
  };

  if (!isOpen || invitations.length === 0 || !currentInv) return null;

  // Insert tag into edited message
  const insertTag = (tag: string) => {
    setEditedMessage((prev) => prev + ` ${tag}`);
  };

  // Reset message to current language default
  const handleResetMessage = () => {
    setEditedMessage(defaultMessage);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentInv.invitationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(editedMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Download Card Image (Supports both custom uploaded card & dynamic luxury card)
  const handleDownloadCard = async () => {
    try {
      if (cardMode === 'CUSTOM' && customCardFile) {
        const url = URL.createObjectURL(customCardFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = customCardFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloadSuccessNotice(`Custom card image downloaded as ${customCardFile.name}!`);
        return;
      }

      if (cardMode === 'CUSTOM' && customCardPreviewUrl && !customCardFile) {
        try {
          const res = await fetch(customCardPreviewUrl);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = customCardFileName || 'custom-invitation-card.jpg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setDownloadSuccessNotice('Custom card image downloaded!');
          return;
        } catch {
          // fallback if CORS prevents direct fetch
        }
      }

      // Default: generate dynamic studio luxury card
      const file = await generateInvitationCardFile({
        eventName: activeEventName,
        eventType: activeEventType,
        guestName: currentInv.eventGuest.name,
        hostName: activeHostName,
        eventDate: activeEventDate,
        eventTime: activeEventTime,
        venue: activeVenue
      });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccessNotice(`Invitation card downloaded as ${file.name}!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to download card.');
    }
  };

  // Primary WhatsApp Dispatch Action
  const handleShareWhatsApp = async () => {
    setError('');
    setDownloadSuccessNotice(null);

    const messageText = editedMessage.trim() || defaultMessage;
    const whatsAppChatUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    if (!attachCard) {
      // Text-only mode: open WhatsApp directly
      window.open(whatsAppChatUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Attachment mode: check if Web Share API supports file sharing
    try {
      let cardFile: File | null = null;

      if (cardMode === 'CUSTOM' && customCardFile) {
        cardFile = customCardFile;
      } else if (cardMode === 'CUSTOM' && customCardPreviewUrl && !customCardFile) {
        try {
          const res = await fetch(customCardPreviewUrl);
          const blob = await res.blob();
          cardFile = new File([blob], customCardFileName || 'custom-card.jpg', {
            type: blob.type || 'image/jpeg'
          });
        } catch {
          // ignore
        }
      }

      if (!cardFile) {
        cardFile = await generateInvitationCardFile({
          eventName: activeEventName,
          eventType: activeEventType,
          guestName: currentInv.eventGuest.name,
          hostName: activeHostName,
          eventDate: activeEventDate,
          eventTime: activeEventTime,
          venue: activeVenue
        });
      }

      const canShareFiles =
        typeof navigator !== 'undefined' &&
        !!navigator.canShare &&
        navigator.canShare({ files: [cardFile] });

      if (canShareFiles && navigator.share) {
        // Native mobile share with attached image file & personalized message
        await navigator.share({
          files: [cardFile],
          title: activeEventName,
          text: messageText
        });
        return;
      }
    } catch {
      // User cancelled share sheet or file share error: continue to fallback
    }

    // Fallback for Desktop & browsers without direct file Web Share:
    // 1. Download card file locally so host has the high-res card
    await handleDownloadCard();

    // 2. Open WhatsApp Web with prefilled message & link
    window.open(whatsAppChatUrl, '_blank', 'noopener,noreferrer');

    // 3. Clear instruction banner
    setDownloadSuccessNotice(
      `${cardMode === 'CUSTOM' ? 'Custom card' : 'Invitation card'} image downloaded! You can now paste (Ctrl+V) or attach the image in the WhatsApp chat that opened.`
    );
  };

  const handleMarkSentAndNext = async () => {
    setUpdating(true);
    setError('');
    try {
      if (currentInv.whatsappStatus !== 'SENT') {
        await invitationService.markInvitationSent(currentInv.id);
        currentInv.whatsappStatus = 'SENT';
        currentInv.sentAt = new Date().toISOString();
        onStatusUpdated();
      }

      if (!isLast) {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark as sent.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSkipNext = () => {
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-surface-card rounded-2xl shadow-2xl border border-surface-border overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-display font-bold text-lg text-charcoal-900">
                  WhatsApp Invitation Sharing
                </h3>
                <Badge variant="brand" className="text-[10px]">
                  Universal Luxury Design
                </Badge>
              </div>
              <p className="text-xs text-charcoal-500">
                Bilingual greeting messages, dynamic token links &amp; optional luxury card attachment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-surface-warm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-surface-warm/80 px-6 py-2.5 border-b border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-3 text-xs font-semibold text-charcoal-700">
            <span>
              Guest <strong className="text-charcoal-900">{currentIndex + 1}</strong> of{' '}
              <strong className="text-charcoal-900">{invitations.length}</strong>
            </span>
            <span className="text-charcoal-300">•</span>
            <span className="text-emerald-700">
              {sentCount} sent / {pendingCount} pending ({percentComplete}%)
            </span>
          </div>
          <div className="w-full sm:w-48 bg-surface-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="font-bold text-red-500 hover:text-red-700">
                ×
              </button>
            </div>
          )}

          {downloadSuccessNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-start space-x-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{downloadSuccessNotice}</span>
              </div>
              <button
                onClick={() => setDownloadSuccessNotice(null)}
                className="text-emerald-600 hover:text-emerald-800 font-bold ml-2"
              >
                ×
              </button>
            </div>
          )}

          {/* Guest Information Card */}
          <div className="p-4 rounded-xl bg-surface-warm border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">
                Target Guest
              </span>
              <h4 className="font-display font-bold text-xl text-charcoal-900 mt-0.5">
                {currentInv.eventGuest.name}
              </h4>
              <p className="font-mono text-xs text-charcoal-600 mt-0.5">
                WhatsApp: {currentInv.eventGuest.whatsappNumber}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Badge
                variant={currentInv.whatsappStatus === 'SENT' ? 'success' : 'default'}
                className="text-xs"
              >
                {currentInv.whatsappStatus === 'SENT' ? 'Sent' : 'Pending'}
              </Badge>
              {currentInv.eventGuest.relation && (
                <Badge variant="brand" className="text-xs">
                  {currentInv.eventGuest.relation}
                </Badge>
              )}
            </div>
          </div>

          {/* Controls: Language Selector & Card Attachment Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language Selector */}
            <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Languages className="w-4 h-4 text-brand-600" />
                <div>
                  <p className="text-xs font-semibold text-charcoal-900">Message Language</p>
                  <p className="text-[11px] text-charcoal-400">Switch bilingual greeting</p>
                </div>
              </div>

              <div className="flex items-center rounded-lg bg-surface-warm p-1 border border-surface-border text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage('EN')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${language === 'EN'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                    }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('HI')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${language === 'HI'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                    }`}
                >
                  हिंदी (Hindi)
                </button>
              </div>
            </div>

            {/* Optional Invitation Card Attachment Toggle */}
            <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ImageIcon className="w-4 h-4 text-brand-600" />
                <div>
                  <p className="text-xs font-semibold text-charcoal-900">Attach Invitation Card</p>
                  <p className="text-[11px] text-charcoal-400">
                    Send card image with WhatsApp link (auto-generated or your own custom card)
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachCard}
                  onChange={(e) => setAttachCard(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          </div>

          {/* Invitation Card Section (if attached) */}
          {attachCard && (
            <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-3.5">
              {/* Card Mode Segmented Control */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-surface-border">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                    Card Style Option
                  </span>
                </div>
                <div className="inline-flex rounded-lg bg-surface-warm p-0.5 border border-surface-border text-xs">
                  <button
                    type="button"
                    onClick={() => setCardMode('AUTO')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      cardMode === 'AUTO'
                        ? 'bg-brand-600 text-white shadow-xs font-semibold'
                        : 'text-charcoal-600 hover:text-charcoal-900'
                    }`}
                  >
                    Studio Auto Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardMode('CUSTOM')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      cardMode === 'CUSTOM'
                        ? 'bg-brand-600 text-white shadow-xs font-semibold'
                        : 'text-charcoal-600 hover:text-charcoal-900'
                    }`}
                  >
                    Upload Custom Card
                  </button>
                </div>
              </div>

              {cardMode === 'AUTO' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-charcoal-700">
                      Generated Luxury Invitation Card Preview
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadCard}
                      className="text-xs py-1 h-8"
                      title="Save high-resolution image to your computer"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>Download Card Image</span>
                    </Button>
                  </div>

                  <div className="relative aspect-[3/2] w-full max-h-72 rounded-lg overflow-hidden border border-[#D8B66E]/40 bg-[#F8F3EB] flex items-center justify-center shadow-xs">
                    {cardPreviewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cardPreviewUrl}
                        alt="Luxury Invitation Card Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 text-xs text-charcoal-400">
                        <span className="animate-pulse">Generating luxury invitation card...</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-charcoal-500 text-center">
                    ✨ Formatted for WhatsApp chat attachments (1200×800 3:2 aspect ratio). Includes event title, host name, guest name, date, time and venue.
                  </p>
                </>
              ) : (
                <>
                  {customCardPreviewUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-semibold text-charcoal-700 truncate max-w-[200px]">
                            {customCardFileName || 'Custom Invitation Card'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="cursor-pointer">
                            <span className="inline-flex items-center text-xs font-medium text-brand-600 hover:text-brand-800 px-2.5 py-1 rounded-md hover:bg-brand-50 border border-brand-200">
                              <Upload className="w-3 h-3 mr-1" />
                              Change Card
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleCustomCardUpload}
                              className="hidden"
                            />
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadCard}
                            className="text-xs py-1 h-8"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            <span>Download</span>
                          </Button>
                        </div>
                      </div>

                      <div className="relative aspect-[3/2] w-full max-h-72 rounded-lg overflow-hidden border border-[#D8B66E]/40 bg-[#F8F3EB] flex items-center justify-center shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={customCardPreviewUrl}
                          alt="Custom Invitation Card Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-charcoal-500">
                        <span>✨ Your custom card will be attached when sharing on WhatsApp.</span>
                        <button
                          type="button"
                          onClick={handleRemoveCustomCard}
                          className="text-red-500 hover:text-red-700 font-medium text-xs flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3 mr-0.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block cursor-pointer">
                        <div className="p-6 rounded-xl border-2 border-dashed border-[#D8B66E]/60 hover:border-[#D8B66E] bg-[#FAF6F0]/60 hover:bg-[#FAF6F0] transition-colors text-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-200 text-brand-600 mx-auto flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-charcoal-900">
                              Upload your own custom invitation card
                            </p>
                            <p className="text-[11px] text-charcoal-500 mt-0.5">
                              Supports JPG, PNG, WebP up to 10MB (Wedding card, flyer, custom designer card)
                            </p>
                          </div>
                          <span className="inline-flex items-center text-xs font-semibold text-brand-600 bg-white px-3.5 py-1.5 rounded-lg border border-surface-border shadow-2xs hover:bg-brand-50 transition-colors">
                            Choose Card Image
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleCustomCardUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-charcoal-400 text-center">
                        Upload your pre-designed celebration card if you do not want to use the auto-generated card.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Personalized WhatsApp Message (Editable) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Personalized Message ({language === 'HI' ? 'हिंदी' : 'English'})
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetMessage}
                  className="text-[11px] text-charcoal-500 hover:text-charcoal-800 flex items-center space-x-1"
                  title="Reset to default template"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-[11px] text-brand-600 hover:text-brand-800 font-medium flex items-center space-x-1"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Placeholder Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {['{{guestName}}', '{{eventName}}', '{{eventDate}}', '{{venue}}', '{{invitationUrl}}', '{{hostName}}'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-warm border border-surface-border text-charcoal-600 hover:text-brand-600 hover:border-brand-300"
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea
              rows={6}
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-surface-border bg-surface-card text-xs text-charcoal-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />
            <p className="text-[11px] text-charcoal-400">
              The recipient will see this personalized text along with their unique digital invitation link.
            </p>
          </div>

          {/* Unique RSVP Link Preview */}
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider block">
                Unique RSVP Link (Token-Secured)
              </span>
              <a
                href={currentInv.invitationUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-brand-600 hover:text-brand-800 underline truncate block mt-0.5"
              >
                {currentInv.invitationUrl}
              </a>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1.5 rounded-lg border border-surface-border hover:bg-surface-warm text-xs text-charcoal-700 font-medium flex items-center space-x-1"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              <a
                href={currentInv.invitationUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-warm text-charcoal-600"
                title="Preview invitation in browser"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* WhatsApp Flow Explanation */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">WhatsApp Sharing Flow:</span>
              <ol className="list-decimal list-inside mt-0.5 space-y-0.5 text-[11px] text-emerald-800">
                <li>
                  Click <strong>&quot;Share on WhatsApp&quot;</strong> below to open WhatsApp with the personalized greeting.
                </li>
                {attachCard && (
                  <li>
                    On mobile, your share sheet attaches the luxury card directly. On desktop, the card is saved to your downloads for quick paste.
                  </li>
                )}
                <li>
                  Press <strong>Send</strong> in WhatsApp and return here to click <strong>&quot;Mark Sent &amp; Next&quot;</strong>.
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-card">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={isFirst}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipNext}
              disabled={isLast}
            >
              Skip
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 shadow-xs"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              <span>Share on WhatsApp</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleMarkSentAndNext}
              isLoading={updating}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>{isLast ? 'Mark as Sent' : 'Mark Sent & Next'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
