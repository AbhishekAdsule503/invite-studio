import apiClient from '@/lib/api';

export interface Guest {
  id: string;
  userId: string;
  fullName: string;
  whatsappNumber: string;
  email?: string | null;
  address?: string | null;
  relation?: string | null;
  isPermanent: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    eventGuests: number;
  };
}

export interface GuestListResponse {
  success: boolean;
  guests: Guest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ExcelImportRow {
  rowNumber: number;
  fullName: string;
  whatsappNumber: string;
  email?: string;
  address?: string;
  relation?: string;
  status: 'VALID' | 'DUPLICATE' | 'INVALID';
  errors: string[];
}

export interface ExcelPreviewResponse {
  success: boolean;
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: ExcelImportRow[];
}

export const guestService = {
  async listGuests(params: {
    search?: string;
    relation?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<GuestListResponse> {
    const res = await apiClient.get<GuestListResponse>('/guests', { params });
    return res.data;
  },

  async getGuest(id: string): Promise<Guest> {
    const res = await apiClient.get<{ success: boolean; guest: Guest }>(`/guests/${id}`);
    return res.data.guest;
  },

  async createGuest(data: {
    fullName: string;
    whatsappNumber: string;
    email?: string;
    address?: string;
    relation?: string;
  }): Promise<Guest> {
    const res = await apiClient.post<{ success: boolean; guest: Guest }>('/guests', data);
    return res.data.guest;
  },

  async updateGuest(
    id: string,
    data: {
      fullName?: string;
      whatsappNumber?: string;
      email?: string;
      address?: string;
      relation?: string;
    }
  ): Promise<Guest> {
    const res = await apiClient.put<{ success: boolean; guest: Guest }>(`/guests/${id}`, data);
    return res.data.guest;
  },

  async deleteGuest(id: string): Promise<void> {
    await apiClient.delete(`/guests/${id}`);
  },

  async bulkDeleteGuests(guestIds: string[]): Promise<{ deletedCount: number }> {
    const res = await apiClient.post<{ success: boolean; deletedCount: number }>('/guests/bulk-delete', { guestIds });
    return res.data;
  },

  async downloadTemplate(): Promise<void> {
    const res = await apiClient.get('/guests/template', { responseType: 'blob' });
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'invite_studio_guest_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async previewExcelImport(file: File): Promise<ExcelPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ExcelPreviewResponse>('/guests/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  async confirmExcelImport(rows: Array<{
    fullName: string;
    whatsappNumber: string;
    email?: string | null;
    address?: string | null;
    relation?: string | null;
  }>): Promise<{ importedCount: number }> {
    const res = await apiClient.post<{ success: boolean; importedCount: number }>('/guests/import/confirm', { rows });
    return res.data;
  },

  async exportGuests(): Promise<void> {
    const res = await apiClient.get('/guests/export', { responseType: 'blob' });
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invite_studio_guests_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};
