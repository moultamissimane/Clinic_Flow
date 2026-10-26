import { api } from './client';

export const authApi = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => api('/auth/me'),
};

export const patientsApi = {
  list: (params) => api('/patients', { params }),
  get: (id) => api(`/patients/${id}`),
  create: (data) => api('/patients', { method: 'POST', body: data }),
  update: (id, data) => api(`/patients/${id}`, { method: 'PUT', body: data }),
  remove: (id) => api(`/patients/${id}`, { method: 'DELETE' }),
};

export const appointmentsApi = {
  list: (params) => api('/appointments', { params }),
  create: (data) => api('/appointments', { method: 'POST', body: data }),
  updateStatus: (id, status) => api(`/appointments/${id}/status`, { method: 'PATCH', body: { status } }),
};

export const dashboardApi = {
  stats: () => api('/dashboard/stats'),
};

export const usersApi = {
  list: () => api('/users'),
  create: (data) => api('/users', { method: 'POST', body: data }),
  update: (id, data) => api(`/users/${id}`, { method: 'PATCH', body: data }),
};
