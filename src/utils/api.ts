// src/utils/api.ts
// API configuratie voor Supabase Edge Functions

import { projectId } from '../../utils/supabase/info';

// BELANGRIJKE NOTITIE:
// Supabase Edge Functions hebben de structuur:
// https://{project}.supabase.co/functions/v1/{function_name}
// 
// De routes IN de Edge Function (zoals /health, /profile) worden
// automatisch toegevoegd ACHTER deze base URL.
//
// Figma Make gebruikt een unieke functienaam: make-server-82bafaab

export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab`;

console.log('🌐 API_BASE_URL configured as:', API_BASE_URL);

// Helper functie om API calls te maken met betere error handling
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log('📡 API Request:', {
    url,
    method: options.method || 'GET',
    hasAuth: !!accessToken,
    endpoint
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('📥 API Response:', {
      url,
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('❌ API Request failed:', {
      url,
      error: error.message,
      type: error.name
    });
    throw error;
  }
}