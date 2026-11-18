import apiClient from '@/lib/api';
import { SubscriptionPlan, SupportTicketItem } from './subscription.service';

export interface AdminPaymentTransactionItem {
  id: string;
  amount: number;
  currency: string;
  orderId: string;
  paymentId?: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paymentProvider: string;
  createdAt: string;
  plan: {
    id?: string;
    name: string;
    code: string;
    priceYearly?: number;
    currency?: string;
  };
  user?: {
    id: string;
    mobile: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  totalRevenueRupees: number;
  totalRevenuePaise: number;
  totalVerifiedTransactions: number;
  newRegistrations30d: number;
  renewalsCount: number;
  totalActivePlans: number;
  totalInactivePlans: number;
  totalActiveSubscribers: number;
}

export interface SubscriptionDistributionItem {
  planName: string;
  planCode: string;
  tier?: number;
  priceYearly?: number;
  priceMonthly?: number;
  count: number;
}

export interface AdminDashboardData {
  metrics: AdminDashboardMetrics;
  subscriptionDistribution: SubscriptionDistributionItem[];
  recentPayments: AdminPaymentTransactionItem[];
  recentUsers: Array<{
    id: string;
    mobile: string;
    name?: string | null;
    role: string;
    createdAt: string;
    subscription?: {
      status: string;
      plan: { name: string; code: string };
    };
  }>;
  gatewayStatus: {
    provider: string;
    configured: boolean;
    mode: string;
    keyId: string | null;
    notes: string;
  };
}

export interface AdminUserListItem {
  id: string;
  mobile: string;
  name?: string | null;
  email?: string | null;
  role: 'HOST' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  _count: {
    events: number;
    guests: number;
  };
  subscription?: {
    id: string;
    status: string;
    startsAt: string;
    expiresAt: string;
    plan: {
      id: string;
      name: string;
      code: string;
      priceYearly: number;
    };
  };
}

export interface AdminSystemTemplate {
  id: string;
  title: string;
  eventType?: string | null;
  previewImageUrl?: string | null;
  contentHtml?: string | null;
  defaultMessage: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettingItem {
  key: string;
  value: string;
  description?: string | null;
  updatedAt?: string;
}

export const adminService = {
  async getDashboard(): Promise<AdminDashboardData> {
    const res = await apiClient.get<{ success: boolean } & AdminDashboardData>('/admin/dashboard');
    return res.data;
  },

  async listUsers(params: {
    search?: string;
    role?: string;
    status?: boolean | string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    users: AdminUserListItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await apiClient.get('/admin/users', { params });
    return res.data;
  },

  async getUserDetails(id: string): Promise<{
    user: AdminUserListItem & {
      subscriptionHistory: any[];
      paymentTransactions: AdminPaymentTransactionItem[];
    };
  }> {
    const res = await apiClient.get(`/admin/users/${id}`);
    return res.data;
  },

  async updateUserStatus(id: string, isActive: boolean, reason?: string): Promise<void> {
    await apiClient.patch(`/admin/users/${id}/status`, { isActive, reason });
  },

  async listPlans(includeLegacy: boolean = false): Promise<SubscriptionPlan[]> {
    const res = await apiClient.get<{ success: boolean; plans: SubscriptionPlan[] }>('/admin/plans', {
      params: includeLegacy ? { includeLegacy: true } : {}
    });
    return res.data.plans;
  },

  async createPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const res = await apiClient.post<{ success: boolean; plan: SubscriptionPlan }>('/admin/plans', data);
    return res.data.plan;
  },

  async updatePlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const res = await apiClient.put<{ success: boolean; plan: SubscriptionPlan }>(`/admin/plans/${id}`, data);
    return res.data.plan;
  },

  async togglePlan(id: string): Promise<SubscriptionPlan> {
    const res = await apiClient.patch<{ success: boolean; plan: SubscriptionPlan }>(`/admin/plans/${id}/toggle`);
    return res.data.plan;
  },

  async deletePlan(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/admin/plans/${id}`);
    return res.data;
  },

  async listSubscriptions(params: {
    search?: string;
    status?: string;
    planId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    subscriptions: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await apiClient.get('/admin/subscriptions', { params });
    return res.data;
  },

  async adjustSubscription(
    id: string,
    data: { planId?: string; status?: string; expiresAt?: string; reason: string; notes?: string }
  ): Promise<any> {
    const res = await apiClient.post(`/admin/subscriptions/${id}/adjust`, data);
    return res.data.subscription;
  },

  async listPayments(params: { page?: number; limit?: number; status?: string } = {}): Promise<{
    payments: AdminPaymentTransactionItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await apiClient.get('/admin/payments', { params });
    return res.data;
  },

  async listTemplates(): Promise<AdminSystemTemplate[]> {
    const res = await apiClient.get<{ success: boolean; templates: AdminSystemTemplate[] }>('/admin/templates');
    return res.data.templates;
  },

  async createTemplate(data: Partial<AdminSystemTemplate>): Promise<AdminSystemTemplate> {
    const res = await apiClient.post<{ success: boolean; template: AdminSystemTemplate }>('/admin/templates', data);
    return res.data.template;
  },

  async updateTemplate(id: string, data: Partial<AdminSystemTemplate>): Promise<AdminSystemTemplate> {
    const res = await apiClient.put<{ success: boolean; template: AdminSystemTemplate }>(`/admin/templates/${id}`, data);
    return res.data.template;
  },

  async toggleTemplate(id: string): Promise<AdminSystemTemplate> {
    const res = await apiClient.patch<{ success: boolean; template: AdminSystemTemplate }>(`/admin/templates/${id}/toggle`);
    return res.data.template;
  },

  async listTickets(params: {
    status?: string;
    priority?: string;
    category?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    tickets: SupportTicketItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await apiClient.get('/admin/support/tickets', { params });
    return res.data;
  },

  async updateTicket(
    id: string,
    data: { status?: string; priority?: string; adminNotes?: string; assignedToId?: string | null }
  ): Promise<SupportTicketItem> {
    const res = await apiClient.patch<{ success: boolean; ticket: SupportTicketItem }>(`/admin/support/tickets/${id}`, data);
    return res.data.ticket;
  },

  async getSettings(): Promise<{ settings: SystemSettingItem[]; settingsMap: Record<string, string> }> {
    const res = await apiClient.get<{ success: boolean; settings: SystemSettingItem[]; settingsMap: Record<string, string> }>('/admin/settings');
    return res.data;
  },

  async updateSettings(settings: Array<{ key: string; value: string }>): Promise<SystemSettingItem[]> {
    const res = await apiClient.put<{ success: boolean; settings: SystemSettingItem[] }>('/admin/settings', { settings });
    return res.data.settings;
  },

  async listAuditLogs(params: { page?: number; limit?: number; action?: string } = {}): Promise<{
    logs: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await apiClient.get('/admin/audit-logs', { params });
    return res.data;
  }
};

export default adminService;
