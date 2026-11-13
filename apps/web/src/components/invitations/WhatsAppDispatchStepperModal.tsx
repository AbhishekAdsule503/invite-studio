'use client';

import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { invitationService, InvitationItem } from '@/services/invitation.service';

interface WhatsAppDispatchStepperModalProps {
  isOpen: boolean;
  invitations: InvitationItem[];
  startIndex?: number;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export function WhatsAppDispatchStepperModal({
  isOpen,
  invitations,
  startIndex = 0,
  onClose,
  onStatusUpdated
}: WhatsAppDispatchStepperModalProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || invitations.length === 0) return null;

  const currentInv = invitations[currentIndex] || invitations[0];
  const isLast = currentIndex === invitations.length - 1;
  const isFirst = currentIndex === 0;

  const sentCount = invitations.filter((inv) => inv.whatsappStatus === 'SENT').length;
  const pendingCount = invitations.length - sentCount;
  const percentComplete = Math.round((sentCount / invitations.length) * 100);

  const handleOpenWhatsApp = () => {
    if (currentInv.whatsAppUrl) {
      window.open(currentInv.whatsAppUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentInv.invitationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(currentInv.formattedMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-surface-card rounded-2xl shadow-2xl border border-surface-border overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                WhatsApp Click-to-Chat Stepper
              </h3>
              <p className="text-xs text-charcoal-500">
                Send personalized invitations one-by-one with 1-click WhatsApp opening
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

        {/* Progress bar */}
        <div className="bg-surface-warm/80 px-6 py-3 border-b border-surface-border">
          <div className="flex items-center justify-between text-xs font-semibold text-charcoal-700 mb-1.5">
            <span>
              Guest {currentIndex + 1} of {invitations.length}
            </span>
            <span>
              {sentCount} sent / {pendingCount} pending ({percentComplete}%)
            </span>
          </div>
          <div className="w-full bg-surface-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Invitee Card */}
          <div className="p-5 rounded-2xl bg-white border border-surface-border shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider">
                  Current Recipient
                </span>
                <h4 className="font-display font-bold text-xl text-charcoal-900 mt-0.5">
                  {currentInv.eventGuest.name}
                </h4>
                <p className="font-mono text-xs text-charcoal-600 mt-0.5">
                  {currentInv.eventGuest.whatsappNumber}
                </p>
              </div>

              <div className="flex flex-col items-end space-y-1.5">
                <Badge
                  variant={currentInv.whatsappStatus === 'SENT' ? 'success' : 'default'}
                  className="text-xs"
                >
                  {currentInv.whatsappStatus === 'SENT' ? 'Sent' : 'Pending Dispatch'}
                </Badge>
                {currentInv.eventGuest.relation && (
                  <Badge variant="brand" className="text-[10px]">
                    {currentInv.eventGuest.relation}
                  </Badge>
                )}
              </div>
            </div>

            {/* Personalized Message Preview */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                  Formatted WhatsApp Message
                </span>
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

              <div className="p-3.5 rounded-xl bg-surface-warm border border-surface-border text-xs text-charcoal-800 font-mono whitespace-pre-wrap leading-relaxed">
                {currentInv.formattedMessage}
              </div>
            </div>

            {/* RSVP Link */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                  Unique Secure RSVP Link
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-[11px] text-brand-600 hover:text-brand-800 font-medium flex items-center space-x-1"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="px-3 py-2 rounded-xl bg-white border border-surface-border font-mono text-xs text-brand-600 flex items-center justify-between">
                <span className="truncate">{currentInv.invitationUrl}</span>
                <a
                  href={currentInv.invitationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-charcoal-400 hover:text-brand-600 ml-2 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* WhatsApp Flow Explanation */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Step-by-Step Flow:</span>
              <ol className="list-decimal list-inside mt-0.5 space-y-0.5 text-[11px] text-emerald-800">
                <li>Click <strong>&quot;Open WhatsApp Chat&quot;</strong> below to open WhatsApp with prefilled message.</li>
                <li>Press <strong>Send</strong> in WhatsApp to deliver the invitation to your guest.</li>
                <li>Click <strong>&quot;Mark Sent &amp; Next Guest&quot;</strong> here to advance to the next contact.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between bg-surface-card">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={isFirst}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipNext}
              disabled={isLast}
            >
              Skip
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenWhatsApp}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <ExternalLink className="w-4 h-4 mr-1.5" />
              Open WhatsApp Chat
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
