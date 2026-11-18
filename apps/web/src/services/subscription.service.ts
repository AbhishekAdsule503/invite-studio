import apiClient from '@/lib/api';

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  priceYearly: number; // in paise
  priceMonthly?: number; // in paise
  currency: string;
  hasMonthlyBilling?: boolean;
  hasYearlyBilling?: boolean;
  maxEvents: number;
  maxGuestsPerEvent: number;
  maxPermanentGuests: number;
  canUploadCustomTemplates: boolean;
  canCustomInviteUpload: boolean;
  tier: number;
  displayOrder?: number;
  isPopular: boolean;
  description?: string | null;
  features: string[];
  isActive?: boolean;
  isLegacy?: boolean;
  _count?: {
    subscriptions: number;
    paymentTransactions?: number;
  };
}

export interface QuotaUsage {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}

export interface CurrentSubscriptionResponse {
  success: boolean;
  id: string;
  userId: string;
  status: string;
  effectiveStatus: string;
  billingCycle?: 'MONTHLY' | 'YEARLY';
  isExpired: boolean;
  inGracePeriod: boolean;
  graceDaysRemaining: number;
  daysRemaining: number;
  startsAt: string;
  expiresAt: string;
  cancelledAt?: string | null;
  plan: SubscriptionPlan;
  usage: {
    events: QuotaUsage;
    permanentGuests: QuotaUsage;
    maxGuestsPerEvent: number;
  };
}

export interface PaymentTransactionItem {
  id: string;
  amount: number;
  currency: string;
  orderId: string;
  paymentId?: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paymentProvider: string;
  billingCycle?: string;
  createdAt: string;
  plan: {
    id: string;
    name: string;
    code: string;
    priceYearly: number;
    priceMonthly?: number;
    currency: string;
  };
}

export interface SubscriptionHistoryItem {
  id: string;
  planId: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  reason: string;
  notes?: string | null;
  performedBy?: string | null;
  createdAt: string;
  plan: SubscriptionPlan;
}

export interface SupportTicketItem {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const subscriptionService = {
  async getCurrent(): Promise<CurrentSubscriptionResponse> {
    const res = await apiClient.get<CurrentSubscriptionResponse>('/subscriptions/current');
    return res.data;
  },

  async getPlans(): Promise<{
    plans: SubscriptionPlan[];
    gateway: { configured: boolean; mode: string; keyId: string | null };
  }> {
    const res = await apiClient.get<{
      success: boolean;
      plans: SubscriptionPlan[];
      gateway: { configured: boolean; mode: string; keyId: string | null };
    }>('/subscriptions/plans');
    return { plans: res.data.plans, gateway: res.data.gateway };
  },

  async getHistory(): Promise<{
    history: SubscriptionHistoryItem[];
    payments: PaymentTransactionItem[];
  }> {
    const res = await apiClient.get<{
      success: boolean;
      history: SubscriptionHistoryItem[];
      payments: PaymentTransactionItem[];
    }>('/subscriptions/history');
    return { history: res.data.history, payments: res.data.payments };
  },

  async createOrder(planId: string, billingCycle: 'MONTHLY' | 'YEARLY' = 'YEARLY'): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    transactionId: string;
    billingCycle?: string;
    plan: { id: string; name: string; code: string; priceYearly: number; priceMonthly?: number; currency: string };
    isSandbox: boolean;
  }> {
    const res = await apiClient.post('/subscriptions/create-order', { planId, billingCycle });
    return res.data;
  },

  async verifyPayment(payload: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<{ success: boolean; message: string; alreadyProcessed?: boolean }> {
    const res = await apiClient.post('/subscriptions/verify-payment', payload);
    return res.data;
  },

  async recordFailure(payload: {
    orderId: string;
    paymentId?: string;
    reason?: string;
    description?: string;
  }): Promise<{ success: boolean; status?: string }> {
    const res = await apiClient.post('/subscriptions/record-failure', payload);
    return res.data;
  },

  async cancel(): Promise<void> {
    await apiClient.post('/subscriptions/cancel');
  },

  async createSupportTicket(data: {
    subject: string;
    message: string;
    category?: string;
    priority?: string;
  }): Promise<SupportTicketItem> {
    const res = await apiClient.post<{ success: boolean; ticket: SupportTicketItem }>('/support/tickets', data);
    return res.data.ticket;
  },

  async getUserTickets(): Promise<SupportTicketItem[]> {
    const res = await apiClient.get<{ success: boolean; tickets: SupportTicketItem[] }>('/support/tickets');
    return res.data.tickets;
  }
};

export default subscriptionService;
