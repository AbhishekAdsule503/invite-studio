import apiClient from '@/lib/api';

export interface InvitationTemplate {
  id: string;
  title: string;
  eventType?: string | null;
  previewImageUrl?: string | null;
  contentHtml?: string | null;
  defaultMessage: string;
  isSystem: boolean;
  userId?: string | null;
}

export interface InvitationItem {
  id: string;
  eventId: string;
  eventGuestId: string;
  templateId?: string | null;
  token: string;
  coverImageUrl?: string | null;
  personalizedMessage?: string | null;
  whatsappStatus: 'PENDING' | 'SENT';
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  invitationUrl: string;
  formattedMessage: string;
  whatsAppUrl: string;
  hostName?: string | null;
  eventName?: string;
  eventVenue?: string;
  eventDate?: string;
  eventTime?: string | null;
  eventType?: string | null;
  eventGuest: {
    id: string;
    name: string;
    whatsappNumber: string;
    email?: string | null;
    relation?: string | null;
  };
  template?: {
    id: string;
    title: string;
    previewImageUrl?: string | null;
  } | null;
  rsvpResponse?: {
    status: 'IN' | 'OUT';
    companionCount: number;
    respondedAt: string;
  } | null;
}

export interface PublicInvitationData {
  success: boolean;
  token?: string;
  guestName: string;
  eventName: string;
  eventType: string;
  hostName?: string | null;
  invitationUrl?: string;
  eventDate: string;
  eventTime?: string | null;
  venue: string;
  description?: string | null;
  coverImageUrl?: string | null;
  effectiveDeadline: string;
  isDeadlinePassed: boolean;
  personalizedMessage?: string | null;
  template?: {
    id?: string;
    title: string;
    eventType?: string | null;
    previewImageUrl?: string | null;
    contentHtml?: string | null;
  } | null;
  designKey?: 'WEDDING' | 'ANNIVERSARY' | 'OTHER' | string;
  rsvpStatus?: 'IN' | 'OUT' | null;
  companionCount: number;
}

export const invitationService = {
  async listTemplates(eventType?: string): Promise<InvitationTemplate[]> {
    const res = await apiClient.get<{ success: boolean; templates: InvitationTemplate[] }>('/templates', {
      params: eventType ? { eventType } : {}
    });
    return res.data.templates;
  },

  async getTemplate(id: string): Promise<InvitationTemplate> {
    const res = await apiClient.get<{ success: boolean; template: InvitationTemplate }>(`/templates/${id}`);
    return res.data.template;
  },

  async uploadTemplateImage(file: File): Promise<{
    imageUrl: string;
    previewImageUrl: string;
  }> {
    const formData = new FormData();
    formData.append('image', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('invite_token') : null;

    const res = await apiClient.post<{
      success: boolean;
      imageUrl: string;
      previewImageUrl?: string;
    }>('/templates/upload', formData, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const url = res.data.imageUrl || res.data.previewImageUrl || '';
    return {
      imageUrl: url,
      previewImageUrl: url
    };
  },

  async createCustomTemplate(data: {
    title: string;
    eventType?: string;
    previewImageUrl?: string;
    defaultMessage: string;
  }): Promise<InvitationTemplate> {
    const res = await apiClient.post<{ success: boolean; template: InvitationTemplate }>('/templates', data);
    return res.data.template;
  },

  async generateInvitations(data: {
    eventId: string;
    templateId?: string | null;
    coverImageUrl?: string | null;
    eventGuestIds?: string[];
    customMessage?: string;
    regenerate?: boolean;
  }): Promise<{ success: boolean; generatedCount: number; existingCount: number; message: string }> {
    const res = await apiClient.post<{
      success: boolean;
      generatedCount: number;
      existingCount: number;
      message: string;
    }>('/invitations', data);
    return res.data;
  },

  async listInvitations(params: {
    eventId: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    eventId: string;
    eventName: string;
    total: number;
    invitations: InvitationItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await apiClient.get('/invitations', { params });
    return res.data;
  },

  async getInvitation(id: string): Promise<InvitationItem> {
    const res = await apiClient.get<{ success: boolean; invitation: InvitationItem }>(`/invitations/${id}`);
    return res.data.invitation;
  },

  async updateInvitation(
    id: string,
    data: { templateId?: string | null; personalizedMessage?: string }
  ): Promise<InvitationItem> {
    const res = await apiClient.put<{ success: boolean; invitation: InvitationItem }>(`/invitations/${id}`, data);
    return res.data.invitation;
  },

  async markInvitationSent(id: string): Promise<{ success: boolean; invitation: InvitationItem }> {
    const res = await apiClient.post<{ success: boolean; invitation: InvitationItem }>(`/invitations/${id}/mark-sent`);
    return res.data;
  },

  async deleteInvitation(id: string): Promise<void> {
    await apiClient.delete(`/invitations/${id}`);
  },

  // Public unauthenticated invitee API
  async getPublicInvitation(token: string): Promise<PublicInvitationData> {
    const res = await apiClient.get<PublicInvitationData>(`/invitations/public/${token}`);
    return res.data;
  },

  async submitPublicRsvp(
    token: string,
    data: { status: 'IN' | 'OUT'; companionCount?: number }
  ): Promise<{ success: boolean; status: 'IN' | 'OUT'; message: string }> {
    const res = await apiClient.post<{ success: boolean; status: 'IN' | 'OUT'; message: string }>(
      `/invitations/public/${token}/rsvp`,
      data
    );
    return res.data;
  }
};

