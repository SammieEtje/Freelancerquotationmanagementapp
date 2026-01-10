// Gecentraliseerde API client voor Supabase Edge Functions

import { projectId } from '../../utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/server`;

interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  endpoint: string,
  accessToken: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { headers = {}, ...restOptions } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Specifieke API functies
export const api = {
  // Quotations
  getQuotations: (accessToken: string) =>
    apiRequest<{ quotations: any[] }>('/quotations', accessToken),

  getQuotation: (accessToken: string, id: string) =>
    apiRequest<{ quotation: any }>(`/quotations/${id}`, accessToken),

  createQuotation: (accessToken: string, data: any) =>
    apiRequest<{ quotation: any }>('/quotations', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateQuotation: (accessToken: string, id: string, data: any) =>
    apiRequest<{ quotation: any }>(`/quotations/${id}`, accessToken, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteQuotation: (accessToken: string, id: string) =>
    apiRequest<{ success: boolean }>(`/quotations/${id}`, accessToken, {
      method: 'DELETE',
    }),

  // Profile
  getProfile: (accessToken: string) =>
    apiRequest<{ profile: any }>('/profile', accessToken),

  updateProfile: (accessToken: string, data: any) =>
    apiRequest<{ profile: any }>('/profile', accessToken, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Invoices
  getInvoices: (accessToken: string) =>
    apiRequest<{ invoices: any[] }>('/invoices', accessToken),

  getInvoice: (accessToken: string, id: string) =>
    apiRequest<{ invoice: any }>(`/invoices/${id}`, accessToken),

  createInvoice: (accessToken: string, data: any) =>
    apiRequest<{ invoice: any }>('/invoices', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateInvoice: (accessToken: string, id: string, data: any) =>
    apiRequest<{ invoice: any }>(`/invoices/${id}`, accessToken, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteInvoice: (accessToken: string, id: string) =>
    apiRequest<{ success: boolean }>(`/invoices/${id}`, accessToken, {
      method: 'DELETE',
    }),

  convertQuotationToInvoice: (accessToken: string, quotationId: string) =>
    apiRequest<{ invoice: any }>(`/quotations/${quotationId}/convert-to-invoice`, accessToken, {
      method: 'POST',
    }),
};
