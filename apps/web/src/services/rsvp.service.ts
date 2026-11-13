import apiClient from '@/lib/api';

export interface EventRsvpSummary {
  success: boolean;
  eventId: string;
  eventName: string;
  totalInvited: number;
  totalIn: number;
  totalOut: number;
  totalNotResponded: number;
}

export interface OverallRsvpSummary {
  success: boolean;
  totalEvents: number;
  totalMyGuests: number;
  totalInvited: number;
  totalIn: number;
  totalOut: number;
  totalNotResponded: number;
}

export interface PublicRsvpResult {
  success: boolean;
  status: 'IN' | 'OUT';
  companionCount: number;
  respondedAt: string;
  message: string;
}

export const rsvpService = {
  /**
   * Submit or update a public invitee's RSVP response (zero auth required)
   */
  async submitPublicRsvp(
    token: string,
    data: { status: 'IN' | 'OUT'; companionCount?: number }
  ): Promise<PublicRsvpResult> {
    const res = await apiClient.post<PublicRsvpResult>(`/invitations/public/${token}/rsvp`, data);
    return res.data;
  },

  /**
   * Fetch aggregate RSVP summary for a specific event (tenant protected, strictly aggregate counts)
   */
  async getEventRsvpSummary(eventId: string): Promise<EventRsvpSummary> {
    const res = await apiClient.get<EventRsvpSummary>(`/events/${eventId}/rsvp-summary`);
    return res.data;
  },

  /**
   * Fetch workspace overall aggregate RSVP statistics for the host dashboard
   */
  async getOverallRsvpSummary(): Promise<OverallRsvpSummary> {
    const res = await apiClient.get<OverallRsvpSummary>('/events/rsvp-summary/overview');
    return res.data;
  }
};

export default rsvpService;
