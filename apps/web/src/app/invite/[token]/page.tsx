'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { MailWarning } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { invitationService, PublicInvitationData } from '@/services/invitation.service';
import { resolveInvitationTemplate } from '@/components/invitations/templates/resolveInvitationTemplate';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function InviteeRsvpPage({ params }: PageProps) {
  const { token } = use(params);

  const [invitation, setInvitation] = useState<PublicInvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rsvpStatus, setRsvpStatus] = useState<'IN' | 'OUT' | null>(null);
  const [companionCount, setCompanionCount] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [rsvpFeedback, setRsvpFeedback] = useState<string>('');
  const [rsvpError, setRsvpError] = useState<string>('');

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    invitationService
      .getPublicInvitation(token)
      .then((data) => {
        setInvitation(data);
        if (data.rsvpStatus) {
          setRsvpStatus(data.rsvpStatus);
          setSubmitted(true);
        }
        if (typeof data.companionCount === 'number') {
          setCompanionCount(data.companionCount);
        }
      })
      .catch((err: unknown) => {
        const anyErr = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
        const msg =
          (err instanceof Error ? err.message : '') ||
          anyErr?.response?.data?.error ||
          anyErr?.response?.data?.message ||
          anyErr?.message ||
          'This invitation link is invalid or has expired. Please verify with your host.';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleRsvp = async (choice: 'IN' | 'OUT', count?: number) => {
    setSubmittingRsvp(true);
    setRsvpError('');
    try {
      const finalCount = count !== undefined ? count : companionCount;
      const res = await invitationService.submitPublicRsvp(token, {
        status: choice,
        companionCount: choice === 'IN' ? finalCount : 0
      });
      setRsvpStatus(choice);
      if (choice === 'IN') {
        setCompanionCount(finalCount);
      }
      setSubmitted(true);
      setRsvpFeedback(res.message);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      const msg =
        (err instanceof Error ? err.message : '') ||
        anyErr?.response?.data?.error ||
        anyErr?.response?.data?.message ||
        anyErr?.message ||
        'Failed to submit RSVP. Please try again.';
      setRsvpError(msg);
    } finally {
      setSubmittingRsvp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 my-auto min-h-screen bg-[#f8f3eb]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#401526] border-t-[#d8b66e] rounded-full animate-spin mx-auto shadow-md" />
          <p className="font-serif italic text-base text-[#401526] font-medium">
            Loading your private celebration invitation...
          </p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto min-h-screen bg-[#f8f3eb]">
        <Card className="w-full max-w-md p-8 text-center shadow-xl border-[#e9ded1] bg-[#fffdfc] space-y-5 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-[#f8f3eb] border border-[#e9ded1] text-[#401526] mx-auto flex items-center justify-center shadow-xs">
            <MailWarning className="w-8 h-8 text-[#401526]" />
          </div>
          <h2 className="font-serif text-2xl text-[#34232b]">
            This Invitation Has Expired
          </h2>
          <p className="text-xs sm:text-sm text-[#887a78] leading-relaxed max-w-sm mx-auto">
            {error || 'This link is no longer valid or has passed its event date. Please contact the host for an updated invitation.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/" className="inline-block">
              <Button variant="outline" size="sm" className="w-full text-xs border-[#e9ded1] text-[#401526]">
                Go to INVITE STUDIO
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Resolve template component based on eventType and title metadata
  const TemplateComponent = resolveInvitationTemplate(invitation);

  return (
    <TemplateComponent
      invitation={invitation}
      token={token}
      rsvpStatus={rsvpStatus}
      submitted={submitted}
      submittingRsvp={submittingRsvp}
      rsvpFeedback={rsvpFeedback}
      rsvpError={rsvpError}
      companionCount={companionCount}
      setCompanionCount={setCompanionCount}
      onRsvp={handleRsvp}
      onChangeResponse={() => setSubmitted(false)}
    />
  );
}
