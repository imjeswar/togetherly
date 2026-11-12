export const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('togetherly_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = typeof data === 'object' && data?.error ? data.error : 'An unexpected error occurred';
    throw new Error(errorMessage);
  }

  return data as T;
}

export const api = {
  // Redesigned Anonymous Space & Two-Person Delivery
  space: {
    create: (body: { deviceId: string; nickname?: string; platform?: string }) =>
      request<any>('/space/create', { method: 'POST', body: JSON.stringify(body) }),
    join: (body: { code: string; deviceId: string; nickname?: string; platform?: string }) =>
      request<any>('/space/join', { method: 'POST', body: JSON.stringify(body) }),
    getStatus: () => request<any>('/space/status'),
    updateProfile: (body: { nickname?: string; avatarUrl?: string }) =>
      request<any>('/space/profile', { method: 'PUT', body: JSON.stringify(body) }),
    unpair: () => request<any>('/space/unpair', { method: 'POST' }),
  },

  drawing: {
    sendQuickDraw: (body: { eventId?: string; canvasData: any; previewData?: string; title?: string }) =>
      request<any>('/drawing/send', { method: 'POST', body: JSON.stringify(body) }),
    getGallery: () => request<any>('/drawing/gallery'),
    getSharedState: () => request<any>('/drawing/shared/state'),
    saveSharedState: (body: { canvasData: any; previewData?: string; title?: string }) =>
      request<any>('/drawing/shared/save', { method: 'POST', body: JSON.stringify(body) }),
  },

  photo: {
    send: (body: { photoData: string; caption?: string; eventId?: string }) =>
      request<any>('/photo/send', { method: 'POST', body: JSON.stringify(body) }),
    getGallery: () => request<any>('/photo/gallery'),
    markSeen: (photoId: string) => request<any>(`/photo/${photoId}/seen`, { method: 'POST' }),
  },

  delivery: {
    getPending: () => request<any>('/delivery/pending'),
    ack: (eventIds: string[]) =>
      request<any>('/delivery/ack', { method: 'POST', body: JSON.stringify({ eventIds }) }),
    seen: (eventIds: string[]) =>
      request<any>('/delivery/seen', { method: 'POST', body: JSON.stringify({ eventIds }) }),
  },

  auth: {
    register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request<any>('/auth/logout', { method: 'POST' }),
    getMe: () => request<any>('/auth/me'),
    updateProfile: (body: any) => request<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
    forgotPassword: (email: string) => request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (body: any) => request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  },

  pairing: {
    getCode: () => request<any>('/pairing/code'),
    createSpace: (body: any = {}) => request<any>('/pairing/create-space', { method: 'POST', body: JSON.stringify(body) }),
    preview: (code: string) => request<any>('/pairing/preview', { method: 'POST', body: JSON.stringify({ code }) }),
    joinSpace: (code: string) => request<any>('/pairing/join-space', { method: 'POST', body: JSON.stringify({ code }) }),
    getStatus: () => request<any>('/pairing/status'),
    unpair: () => request<any>('/pairing/unpair', { method: 'POST', body: JSON.stringify({ confirmUnpair: true }) }),
  },

  dashboard: {
    get: () => request<any>('/dashboard'),
  },

  questions: {
    getCategories: () => request<any>('/questions/categories'),
    getByCategory: (categoryId: string) => request<any>(`/questions/category/${categoryId}`),
    getDaily: () => request<any>('/questions/daily'),
    answer: (questionId: string, answer: string) =>
      request<any>(`/questions/${questionId}/answer`, { method: 'POST', body: JSON.stringify({ answer }) }),
    react: (responseId: string, reaction?: string, comment?: string) =>
      request<any>(`/questions/response/${responseId}/reaction`, { method: 'POST', body: JSON.stringify({ reaction, comment }) }),
    getHistory: () => request<any>('/questions/history'),
  },

  photos: {
    getDaily: () => request<any>('/photos/daily'),
    upload: (body: FormData | { prompt?: string; caption?: string; photoUrl: string }) => {
      const isFormData = body instanceof FormData;
      return request<any>('/photos/upload', {
        method: 'POST',
        body: isFormData ? body : JSON.stringify(body),
      });
    },
    getFeed: () => request<any>('/photos/feed'),
  },

  games: {
    getAll: () => request<any>('/games'),
    start: (code: string) => request<any>(`/games/${code}/start`, { method: 'POST' }),
    getSession: (sessionId: string) => request<any>(`/games/session/${sessionId}`),
    respond: (sessionId: string, roundNumber: number, answer: string | number) =>
      request<any>(`/games/session/${sessionId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ roundNumber, answer }),
      }),
  },

  canvas: {
    get: () => request<any>('/canvas'),
    save: (body: { title?: string; canvasData: string; previewUrl?: string; stickyNotes?: any[] }) =>
      request<any>('/canvas/save', { method: 'POST', body: JSON.stringify(body) }),
  },

  chat: {
    getMessages: () => request<any>('/chat/messages'),
    sendMessage: (text: string, mediaUrl?: string) =>
      request<any>('/chat/messages', { method: 'POST', body: JSON.stringify({ text, mediaUrl }) }),
    reactMessage: (messageId: string, emoji: string) =>
      request<any>(`/chat/messages/${messageId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }),
    getLoveNotes: () => request<any>('/chat/love-notes'),
    createLoveNote: (body: any) => request<any>('/chat/love-notes', { method: 'POST', body: JSON.stringify(body) }),
    openLoveNote: (id: string) => request<any>(`/chat/love-notes/${id}/open`, { method: 'POST' }),
  },

  memories: {
    getAll: (type?: string) => request<any>(`/memories${type ? `?type=${type}` : ''}`),
    createMilestone: (body: any) => request<any>('/memories', { method: 'POST', body: JSON.stringify(body) }),
    getCalendar: (year?: number, month?: number) =>
      request<any>(`/memories/calendar?year=${year || ''}&month=${month || ''}`),
  },

  dateIdeas: {
    getAll: (category?: string) => request<any>(`/date-ideas${category ? `?category=${category}` : ''}`),
    swipe: (id: string, action: 'LIKE' | 'PASS') =>
      request<any>(`/date-ideas/${id}/swipe`, { method: 'POST', body: JSON.stringify({ action }) }),
    getMatches: () => request<any>('/date-ideas/matches'),
    schedule: (id: string, scheduledFor: string, notes?: string) =>
      request<any>(`/date-ideas/${id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledFor, notes }) }),
    complete: (id: string) => request<any>(`/date-ideas/${id}/complete`, { method: 'POST' }),
  },

  ai: {
    generateQuestion: (body: any) => request<any>('/ai/question', { method: 'POST', body: JSON.stringify(body) }),
    generateDate: (body: any) => request<any>('/ai/date', { method: 'POST', body: JSON.stringify(body) }),
    generateAnniversary: (body: any) => request<any>('/ai/anniversary', { method: 'POST', body: JSON.stringify(body) }),
  },

  notifications: {
    getAll: () => request<any>('/notifications'),
    markRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => request<any>('/notifications/read-all', { method: 'POST' }),
  },

  settings: {
    get: () => request<any>('/settings'),
    update: (body: any) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },

  achievements: {
    getAll: () => request<any>('/achievements'),
  },
};

