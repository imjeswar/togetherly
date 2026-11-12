import { Platform } from 'react-native';
import { ENV } from '../config/env';
import { secureStorage } from './secureStore';
import { syncEngine } from './syncEngine';

class ApiService {
  private activeBaseUrl: string | null = null;

  async getBaseUrl(): Promise<string> {
    if (this.activeBaseUrl) return this.activeBaseUrl;
    const custom = await secureStorage.getCustomApiUrl();
    const resolvedUrl: string = (custom as string) || ENV.API_BASE_URL || 'http://localhost:5000/api';
    this.activeBaseUrl = resolvedUrl;
    return resolvedUrl;
  }

  setBaseUrl(url: string) {
    this.activeBaseUrl = url;
  }

  private async getHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
    const token = await secureStorage.getAuthToken();
    const sessionId = await secureStorage.getDeviceSessionId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-platform': Platform.OS,
      'x-app-version': '1.0.0',
      'Bypass-Tunnel-Reminder': 'true',
      ...extraHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }

    return headers;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit & { allowOfflineQueue?: boolean } = {}
  ): Promise<T> {
    const isOnline = syncEngine.getIsConnected();
    const method = options.method || 'GET';
    const isAuthEndpoint =
      endpoint.includes('/auth/register') ||
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/me') ||
      endpoint.includes('/security/2fa');
    const allowOffline = options.allowOfflineQueue !== false && !isAuthEndpoint;

    // If offline and request is an eligible mutation, queue it
    if (!isOnline && method !== 'GET' && allowOffline) {
      const data = options.body ? JSON.parse(options.body as string) : undefined;
      await syncEngine.queueOperation(endpoint, method as any, data);
      return { success: true, queued: true } as any;
    }

    const headers = await this.getHeaders((options.headers as Record<string, string>) || {});
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    let targetUrl: string;
    let fallbackUrl: string | null = null;

    if (endpoint.startsWith('http')) {
      targetUrl = endpoint;
    } else {
      const baseUrl = await this.getBaseUrl();
      targetUrl = `${baseUrl}/${cleanEndpoint}`;
      if (ENV.FALLBACK_API_BASE_URL && ENV.FALLBACK_API_BASE_URL !== baseUrl) {
        fallbackUrl = `${ENV.FALLBACK_API_BASE_URL}/${cleanEndpoint}`;
      }
    }

    const executeFetch = async (fetchUrl: string): Promise<Response> => {
      // 6-second timeout per attempt to allow rapid failover
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const res = await fetch(fetchUrl, {
          ...options,
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    let response: Response;
    const isProxyError = (status: number) => [408, 502, 503, 504, 520, 521, 522, 523, 524].includes(status);

    try {
      response = await executeFetch(targetUrl);
      if (isProxyError(response.status) && fallbackUrl) {
        try {
          const fallbackRes = await executeFetch(fallbackUrl);
          if (!isProxyError(fallbackRes.status)) {
            response = fallbackRes;
            this.activeBaseUrl = ENV.FALLBACK_API_BASE_URL;
          }
        } catch {
          // Keep primary response
        }
      }
    } catch (primaryErr: any) {
      if (fallbackUrl) {
        try {
          response = await executeFetch(fallbackUrl);
          // Fallback succeeded, remember this working baseUrl
          this.activeBaseUrl = ENV.FALLBACK_API_BASE_URL;
        } catch (fallbackErr: any) {
          if (method !== 'GET' && allowOffline) {
            const data = options.body ? JSON.parse(options.body as string) : undefined;
            await syncEngine.queueOperation(endpoint, method as any, data);
            return { success: true, queued: true } as any;
          }
          throw new Error(
            `Unable to reach Togetherly server.\nPrimary: ${targetUrl}\nFallback: ${fallbackUrl}\nPlease check that your device has network access and the backend server is running.`
          );
        }
      } else {
        if (method !== 'GET' && allowOffline) {
          const data = options.body ? JSON.parse(options.body as string) : undefined;
          await syncEngine.queueOperation(endpoint, method as any, data);
          return { success: true, queued: true } as any;
        }
        throw new Error(
          `Unable to connect to Togetherly server at ${targetUrl}. ${primaryErr.message || ''}`
        );
      }
    }

    if (response.status === 401) {
      await secureStorage.clearAuthToken();
      throw new Error('Session expired or unauthorized. Please log in again.');
    }

    if (!response.ok) {
      let errMsg = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errMsg = errorData.error || errorData.message || errMsg;
      } catch {
        const text = await response.text().catch(() => '');
        if (text && text.length < 250) errMsg = text;
      }
      throw new Error(errMsg);
    }

    return (await response.json()) as T;
  }

  // --- AUTH & ACCOUNT ---
  login = (credentials: { email: string; password?: string; token?: string }) =>
    this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      allowOfflineQueue: false,
    });

  register = (userData: any) =>
    this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      allowOfflineQueue: false,
    });

  getMe = () => this.request('/auth/me', { allowOfflineQueue: false });

  updateProfile = (profileData: any) =>
    this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) });

  deleteAccount = () =>
    this.request('/auth/account', { method: 'DELETE', allowOfflineQueue: false });

  exportData = () =>
    this.request('/auth/export', { method: 'GET', allowOfflineQueue: false });

  // --- SECURITY & 2FA ---
  setup2FA = () =>
    this.request('/security/2fa/setup', { method: 'POST', allowOfflineQueue: false });

  enable2FA = (token: string) =>
    this.request('/security/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ token }),
      allowOfflineQueue: false,
    });

  disable2FA = (token: string) =>
    this.request('/security/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ token }),
      allowOfflineQueue: false,
    });

  verify2FALogin = (tempToken: string, code: string) =>
    this.request('/security/2fa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
      allowOfflineQueue: false,
    });

  getSessions = () => this.request('/security/sessions', { allowOfflineQueue: false });

  revokeSession = (sessionId: string) =>
    this.request(`/security/sessions/${sessionId}`, { method: 'DELETE', allowOfflineQueue: false });

  pingSession = () =>
    this.request('/security/sessions/ping', { method: 'POST', allowOfflineQueue: false });

  uploadE2EEPublicKey = (publicKey: string) =>
    this.request('/security/e2ee/keys', {
      method: 'POST',
      body: JSON.stringify({ publicKey }),
      allowOfflineQueue: false,
    });

  getPartnerE2EEPublicKey = () =>
    this.request('/security/e2ee/partner-key', { allowOfflineQueue: false });
  getPartnerPublicKey = () => this.getPartnerE2EEPublicKey();

  // --- REDESIGNED ANONYMOUS DEVICE SPACE ---
  createAnonymousSpace = (payload: { deviceId: string; nickname?: string; platform?: string }) =>
    this.request('/space/create', { method: 'POST', body: JSON.stringify(payload), allowOfflineQueue: false });
  joinAnonymousSpace = (payload: { code: string; deviceId: string; nickname?: string; platform?: string }) =>
    this.request('/space/join', { method: 'POST', body: JSON.stringify(payload), allowOfflineQueue: false });
  getSpaceStatus = () => this.request('/space/status', { allowOfflineQueue: false });
  updateSpaceProfile = (payload: { nickname?: string; avatarUrl?: string }) =>
    this.request('/space/profile', { method: 'PUT', body: JSON.stringify(payload) });
  unpairSpace = () => this.request('/space/unpair', { method: 'POST', allowOfflineQueue: false });

  // --- DRAWING ---
  sendQuickDraw = (payload: { eventId?: string; canvasData: any; previewData?: string; title?: string }) =>
    this.request('/drawing/send', { method: 'POST', body: JSON.stringify(payload) });
  getDrawingsGallery = () => this.request('/drawing/gallery');
  getSharedCanvasState = () => this.request('/drawing/shared/state');
  saveSharedCanvasState = (payload: { canvasData: any; previewData?: string; title?: string }) =>
    this.request('/drawing/shared/save', { method: 'POST', body: JSON.stringify(payload) });

  // --- PHOTOS ---
  sendInstantPhoto = (payload: { photoData: string; caption?: string; eventId?: string }) =>
    this.request('/photo/send', { method: 'POST', body: JSON.stringify(payload) });
  getPhotosGallery = () => this.request('/photo/gallery');
  markPhotoSeen = (photoId: string) =>
    this.request(`/photo/${photoId}/seen`, { method: 'POST' });

  // --- DELIVERIES ---
  getPendingDeliveries = () => this.request('/delivery/pending', { allowOfflineQueue: false });
  ackDeliveries = (eventIds: string[]) =>
    this.request('/delivery/ack', { method: 'POST', body: JSON.stringify({ eventIds }), allowOfflineQueue: false });
  seenDeliveries = (eventIds: string[]) =>
    this.request('/delivery/seen', { method: 'POST', body: JSON.stringify({ eventIds }), allowOfflineQueue: false });

  // --- PAIRING ---
  getInviteCode = () => this.request('/pairing/code', { allowOfflineQueue: false });
  getPairingCode = () => this.getInviteCode();
  createSpace = (body: any = {}) =>
    this.request('/pairing/create-space', {
      method: 'POST',
      body: JSON.stringify(body),
      allowOfflineQueue: false,
    });
  joinSpace = (code: string) =>
    this.request('/pairing/join-space', {
      method: 'POST',
      body: JSON.stringify({ code }),
      allowOfflineQueue: false,
    });
  joinWithCode = (code: string) => this.joinSpace(code);
  getPairingStatus = () => this.request('/pairing/status', { allowOfflineQueue: false });
  unpair = (confirmUnpair = true) =>
    this.request('/pairing/unpair', {
      method: 'POST',
      body: JSON.stringify({ confirmUnpair }),
      allowOfflineQueue: false,
    });

  // --- DASHBOARD & ACTIVITIES ---
  getDashboard = () => this.request('/dashboard');
  getDailyQuestion = () => this.request('/questions/daily');
  answerDailyQuestion = (answer: string) =>
    this.request('/questions/answer', { method: 'POST', body: JSON.stringify({ answer }) });
  answerQuestion = (questionId: string, answer: string) =>
    this.request('/questions/answer', { method: 'POST', body: JSON.stringify({ questionId, answer }) });
  getMemories = () => this.request('/memories');
  getDateIdeas = () => this.request('/date-ideas');
  likeDateIdea = (ideaId: string) =>
    this.request(`/date-ideas/${ideaId}/like`, { method: 'POST' });
  swipeDateIdea = (ideaId: string, directionOrLiked: 'like' | 'pass' | boolean) => {
    const direction = typeof directionOrLiked === 'boolean' ? (directionOrLiked ? 'like' : 'pass') : directionOrLiked;
    return this.request(`/date-ideas/${ideaId}/swipe`, { method: 'POST', body: JSON.stringify({ direction }) });
  };
  getGames = () => this.request('/games');

  // --- PHOTOS ---
  getPhotos = () => this.request('/photos');
  getPhotoChallenge = () => this.request('/photos/challenge');
  uploadPhoto = (photoData: { uri?: string; photoUrl?: string; caption?: string; prompt?: string; idempotencyKey?: string; [key: string]: any }) =>
    this.request('/photos/upload', { method: 'POST', body: JSON.stringify(photoData) });

  // --- DRAWING CANVAS ---
  getDrawings = () => this.request('/canvas/latest');
  saveDrawing = (drawingData: { paths?: any[]; canvasData?: any; title?: string; thumbnail?: string; idempotencyKey?: string; [key: string]: any }) =>
    this.request('/canvas/save', { method: 'POST', body: JSON.stringify(drawingData) });

  // --- CHAT & NOTES ---
  getMessages = () => this.request('/chat/messages');
  sendMessage = (content: string, type = 'text', encrypted = false) =>
    this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ content, type, encrypted }),
    });
  getLoveNotes = () => this.request('/chat/love-notes');
  sendLoveNote = (note: { content: string; title?: string; encrypted?: boolean; unlockCondition?: any; [key: string]: any }) =>
    this.request('/chat/love-notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });

  // --- NOTIFICATIONS ---
  getNotifications = () => this.request('/notifications');
  updateNotificationSettings = (settings: any) =>
    this.request('/notifications/settings', { method: 'PUT', body: JSON.stringify(settings) });
}

export const api = new ApiService();
