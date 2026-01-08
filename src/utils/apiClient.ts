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
};
