import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-06f58416`;

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken || publicAnonKey}`,
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Auth API
export async function signup(name: string, email: string, password: string) {
  return fetchAPI('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function getProfile() {
  return fetchAPI('/auth/profile');
}

export async function updateProfile(name: string, photo?: string) {
  return fetchAPI('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ name, photo }),
  });
}

// Data API
export async function getData(dataType: string) {
  return fetchAPI(`/data/${dataType}`);
}

export async function saveData(dataType: string, data: any) {
  return fetchAPI(`/data/${dataType}`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}
