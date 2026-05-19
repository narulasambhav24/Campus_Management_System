import { getToken } from './storage';

// API client for backend communication
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Generic API call function
export const apiCall = async (endpoint, method = 'GET', data = null) => {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const options = {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (data) {
    options.body = isFormData ? data : JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
};

const apiCallBlob = async (endpoint, method = 'GET') => {
  const token = getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.blob();
};

// Auth endpoints
export const authAPI = {
  login: (email, password) =>
    apiCall('/auth/login', 'POST', { email, password }),

  signup: (name, email, password) =>
    apiCall('/auth/signup', 'POST', { name, email, password }),

  me: () =>
    apiCall('/auth/me', 'GET'),

  getAllUsers: () =>
    apiCall('/auth/users', 'GET'),
};

// Request endpoints
export const requestAPI = {
  getAdminDashboard: () =>
    apiCall('/requests/dashboard/admin', 'GET'),

  getStudentDashboard: () =>
    apiCall('/requests/dashboard/student', 'GET'),

  getAllRequests: () =>
    apiCall('/requests', 'GET'),

  getUserRequests: (studentId) =>
    apiCall(`/requests/user/${studentId}`, 'GET'),

  getRequestById: (id) =>
    apiCall(`/requests/${id}`, 'GET'),

  createRequest: (studentId, studentName, category, title, description) =>
    apiCall('/requests', 'POST', {
      studentId,
      studentName,
      category,
      title,
      description,
    }),

  uploadAttachments: (id, files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    return apiCall(`/requests/${id}/attachments`, 'POST', formData);
  },

  updateRequest: (id, updates) =>
    apiCall(`/requests/${id}`, 'PUT', updates),

  runSlaEscalationSweep: () =>
    apiCall('/requests/escalation/run', 'POST'),
};

export const eventAPI = {
  getEvents: ({ category = '', search = '', upcoming = false, status = '' } = {}) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    if (upcoming) params.set('upcoming', 'true');
    if (status) params.set('status', status);

    const query = params.toString();
    return apiCall(`/events${query ? `?${query}` : ''}`, 'GET');
  },

  createEvent: (payload) =>
    apiCall('/events', 'POST', payload),

  updateEvent: (id, payload) =>
    apiCall(`/events/${id}`, 'PUT', payload),

  deleteEvent: (id) =>
    apiCall(`/events/${id}`, 'DELETE'),

  registerForEvent: (id, payload) =>
    apiCall(`/events/${id}/register`, 'POST', payload),

  getRegistrationLogs: ({ eventId = '', status = '' } = {}) => {
    const params = new URLSearchParams();
    if (eventId) params.set('eventId', eventId);
    if (status) params.set('status', status);

    const query = params.toString();
    return apiCall(`/events/registrations/logs${query ? `?${query}` : ''}`, 'GET');
  },

  uploadEventPoster: (id, file) => {
    const formData = new FormData();
    formData.append('poster', file);
    return apiCall(`/events/${id}/poster`, 'POST', formData);
  },

  exportAttendance: async (id) =>
    apiCallBlob(`/events/${id}/attendees/export`, 'GET'),
};

export const policyAPI = {
  getPolicies: ({ category = '', search = '', activeOnly = false } = {}) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    if (activeOnly) params.set('activeOnly', 'true');

    const query = params.toString();
    return apiCall(`/policies${query ? `?${query}` : ''}`, 'GET');
  },

  getPolicyById: (id) =>
    apiCall(`/policies/${id}`, 'GET'),

  createPolicy: (payload) =>
    apiCall('/policies', 'POST', payload),

  uploadCircular: (id, file, title = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }
    return apiCall(`/policies/${id}/circulars`, 'POST', formData);
  },

  updatePolicy: (id, payload) =>
    apiCall(`/policies/${id}`, 'PUT', payload),
};
