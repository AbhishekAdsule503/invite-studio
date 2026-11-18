import React from 'react';
import { UniversalLuxuryInvitation } from './UniversalLuxuryInvitation';
import { PublicInvitationData } from '@/services/invitation.service';
import { InvitationTemplateProps } from './types';

/**
 * INVITE STUDIO - SINGLE UNIVERSAL SIGNATURE PREMIUM LUXURY INVITATION
 *
 * Provides a single, timeless, modern luxury invitation design that works
 * beautifully and adaptively for ALL celebration categories (Wedding, Birthday,
 * Anniversary, Corporate, Family Gathering, Get Together, etc.).
 */
export function resolveInvitationTemplate(
  _invitation: PublicInvitationData
): React.ComponentType<InvitationTemplateProps> {
  return UniversalLuxuryInvitation;
}
