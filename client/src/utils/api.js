/**
 * PostMaster API Client
 */

const BASE_URL = '/api';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || (typeof data === 'string' ? data : 'API Request Failed');
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  getAuthStatus: () => fetchJson('/auth/status'),
  getGoogleAuthUrl: (clientId, clientSecret) => fetchJson(`/auth/google/url?clientId=${encodeURIComponent(clientId || '')}&clientSecret=${encodeURIComponent(clientSecret || '')}`),
  saveGoogleConfig: (clientId, clientSecret) => fetchJson('/auth/google/config', {
    method: 'POST',
    body: JSON.stringify({ clientId, clientSecret })
  }),
  saveAppPassword: (email, password, name) => fetchJson('/auth/app-password', {
    method: 'POST',
    body: JSON.stringify({ email, password, name })
  }),
  testConnection: () => fetchJson('/auth/test-connection', { method: 'POST' }),
  disconnectAuth: () => fetchJson('/auth/disconnect', { method: 'POST' }),

  // File Uploads & Parsers
  uploadAttachment: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${BASE_URL}/upload/attachment`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return response.json();
  },

  deleteAttachment: (filename) => fetchJson(`/upload/attachment/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
  }),

  uploadRecipientsFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${BASE_URL}/upload/recipients-file`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'File parsing failed' }));
      throw new Error(err.error || 'Failed to parse recipients file');
    }
    return response.json();
  },

  // Templates
  getTemplates: () => fetchJson('/templates'),
  createTemplate: (template) => fetchJson('/templates', {
    method: 'POST',
    body: JSON.stringify(template)
  }),
  updateTemplate: (id, template) => fetchJson(`/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(template)
  }),
  deleteTemplate: (id) => fetchJson(`/templates/${id}`, {
    method: 'DELETE'
  }),

  // Dispatch & Queue
  getDispatchStatus: () => fetchJson('/send/status'),
  renderPreview: (subject, body, recipient, senderName) => fetchJson('/send/preview', {
    method: 'POST',
    body: JSON.stringify({ subject, body, recipient, senderName })
  }),
  sendTestEmail: (payload) => fetchJson('/send/test', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  startCampaign: (payload) => fetchJson('/send/campaign', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  pauseCampaign: () => fetchJson('/send/pause', { method: 'POST' }),
  resumeCampaign: () => fetchJson('/send/resume', { method: 'POST' }),
  stopCampaign: () => fetchJson('/send/stop', { method: 'POST' }),

  // Campaigns History
  getCampaigns: () => fetchJson('/campaigns'),
  getCampaignDetails: (id) => fetchJson(`/campaigns/${id}`),
  deleteCampaign: (id) => fetchJson(`/campaigns/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => fetchJson('/settings'),
  updateSettings: (settings) => fetchJson('/settings', {
    method: 'POST',
    body: JSON.stringify(settings)
  })
};
