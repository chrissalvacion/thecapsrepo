const API_URL = '/api';

function getHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  auth: {
    login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    me: () => request('/auth/me'),
    updateProfile: (data: { name: string; email: string; currentPassword: string }) =>
      request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    updatePassword: (data: { currentPassword: string; newPassword: string }) =>
      request('/auth/password', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  teams: {
    list: () => request('/teams'),
    get: (id: string) => request(`/teams/${id}`),
    create: (data: any) => request('/teams', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), ...data }) }),
    update: (id: string, data: any) => request(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/teams/${id}`, { method: 'DELETE' }),
  },
  projects: {
    list: (teamId?: string) => request(`/projects${teamId ? `?teamId=${teamId}` : ''}`),
    get: (id: string) => request(`/projects/${id}`),
    create: (data: any) => request('/projects', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), ...data }) }),
    update: (id: string, data: any) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),
  },
  defenses: {
    list: (teamId?: string) => request(`/defenses${teamId ? `?teamId=${teamId}` : ''}`),
    create: (data: any) => request('/defenses', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), ...data, status: 'Scheduled' }) }),
    update: (id: string, data: any) => request(`/defenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/defenses/${id}`, { method: 'DELETE' }),
  },
  panelists: {
    list: () => request('/panelists'),
    create: (data: any) => request('/panelists', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), ...data }) }),
    update: (id: string, data: any) => request(`/panelists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/panelists/${id}`, { method: 'DELETE' }),
  },
  consultations: {
    list: (teamId?: string) => request(`/consultations${teamId ? `?teamId=${teamId}` : ''}`),
    get: (id: string) => request(`/consultations/${id}`),
    update: (id: string, data: any) => request(`/consultations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    create: (data: any) => request('/consultations', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), ...data }) }),
  },
  student: {
    lookupTeamByAccessCode: (accessCode: string) => request(`/student/team/${accessCode}`),
  },
};
