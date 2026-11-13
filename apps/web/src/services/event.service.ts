import apiClient from '@/lib/api';

export interface EventGuest {
  id: string;
  eventId: string;
  guestId?: string | null;
  name: string;
  whatsappNumber: string;
  email?: string | null;
  address?: string | null;
  relation?: string | null;
  createdAt: string;
  guest?: {
    id: string;
    isPermanent: boolean;
  } | null;
}

export interface EventItem {
  id: string;
  userId: string;
  name: string;
  eventType: string;
  eventDate: string;
  eventTime?: string | null;
  venue: string;
  description?: string | null;
  coverImageUrl?: string | null;
  rsvpDeadlineType: 'EXACT_DATE' | 'DAYS_BEFORE';
  rsvpDeadlineDate?: string | null;
  rsvpDeadlineDaysBefore?: number | null;
  effectiveDeadline: string;
  guestCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventListResponse {
  success: boolean;
  events: EventItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface EventGuestListResponse {
  success: boolean;
  eventId: string;
  eventName: string;
  guests: EventGuest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const eventService = {
  async listEvents(params: {
    search?: string;
    eventType?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<EventListResponse> {
    const res = await apiClient.get<EventListResponse>('/events', { params });
    return res.data;
  },

  async getEvent(id: string): Promise<EventItem> {
    const res = await apiClient.get<{ success: boolean; event: EventItem }>(`/events/${id}`);
    return res.data.event;
  },

  async createEvent(data: {
    name: string;
    eventType: string;
    eventDate: string;
    eventTime?: string;
    venue: string;
    description?: string;
    coverImageUrl?: string | null;
    rsvpDeadlineType: 'EXACT_DATE' | 'DAYS_BEFORE';
    rsvpDeadlineDate?: string | null;
    rsvpDeadlineDaysBefore?: number;
  }): Promise<EventItem> {
    const res = await apiClient.post<{ success: boolean; event: EventItem }>('/events', data);
    return res.data.event;
  },

  async updateEvent(
    id: string,
    data: {
      name?: string;
      eventType?: string;
      eventDate?: string;
      eventTime?: string;
      venue?: string;
      description?: string;
      coverImageUrl?: string | null;
      rsvpDeadlineType?: 'EXACT_DATE' | 'DAYS_BEFORE';
      rsvpDeadlineDate?: string | null;
      rsvpDeadlineDaysBefore?: number;
    }
  ): Promise<EventItem> {
    const res = await apiClient.put<{ success: boolean; event: EventItem }>(`/events/${id}`, data);
    return res.data.event;
  },

  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(`/events/${id}`);
  },

  async listEventGuests(
    eventId: string,
    params: { search?: string; page?: number; limit?: number } = {}
  ): Promise<EventGuestListResponse> {
    const res = await apiClient.get<EventGuestListResponse>(`/events/${eventId}/guests`, { params });
    return res.data;
  },

  async addExistingGuests(
    eventId: string,
    guestIds: string[]
  ): Promise<{ success: boolean; addedCount: number; skippedCount: number; message: string }> {
    const res = await apiClient.post<{
      success: boolean;
      addedCount: number;
      skippedCount: number;
      message: string;
    }>(`/events/${eventId}/guests`, { guestIds });
    return res.data;
  },

  async addNewGuest(
    eventId: string,
    data: {
      name: string;
      whatsappNumber: string;
      email?: string;
      address?: string;
      relation?: string;
      saveToMyGuests: boolean;
    }
  ): Promise<EventGuest> {
    const res = await apiClient.post<{
      success: boolean;
      eventGuest: EventGuest;
      message: string;
    }>(`/events/${eventId}/guests/new`, data);
    return res.data.eventGuest;
  },

  async removeEventGuest(eventId: string, eventGuestId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}/guests/${eventGuestId}`);
  }
};
