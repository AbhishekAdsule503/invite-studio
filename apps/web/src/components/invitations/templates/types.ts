import { PublicInvitationData } from '@/services/invitation.service';

export interface InvitationTemplateProps {
  invitation: PublicInvitationData;
  token: string;
  rsvpStatus: 'IN' | 'OUT' | null;
  submitted: boolean;
  submittingRsvp: boolean;
  rsvpFeedback: string;
  rsvpError: string;
  companionCount: number;
  setCompanionCount: (count: number) => void;
  onRsvp: (choice: 'IN' | 'OUT', count?: number) => Promise<void>;
  onChangeResponse: () => void;
}
