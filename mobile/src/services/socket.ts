import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import { secureStorage } from './secureStore';
import { api } from './api';

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private statusListeners: Set<(status: SocketStatus) => void> = new Set();
  private currentStatus: SocketStatus = 'disconnected';
  private currentRelationshipId: string | null = null;

  getStatus(): SocketStatus {
    return this.currentStatus;
  }

  private setStatus(status: SocketStatus) {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.statusListeners.forEach((cb) => {
        try {
          cb(status);
        } catch {}
      });
    }
  }

  onStatusChange(callback: (status: SocketStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  async connect(relationshipId?: string): Promise<Socket | null> {
    const token = await secureStorage.getAuthToken();
    if (!token) {
      this.setStatus('disconnected');
      return null;
    }

    if (relationshipId) {
      this.currentRelationshipId = relationshipId;
    }

    if (this.socket) {
      if (this.socket.connected) {
        this.setStatus('connected');
        if (this.currentRelationshipId) {
          this.socket.emit('join_relationship', { relationshipId: this.currentRelationshipId });
          this.socket.emit('couple:join', { relationshipId: this.currentRelationshipId });
        }
        return this.socket;
      }
      this.socket.disconnect();
    }

    this.setStatus('connecting');

    try {
      const activeApi = await api.getBaseUrl();
      const socketHost = activeApi.replace(/\/api\/?$/, '');

      this.socket = io(socketHost || ENV.SOCKET_URL, {
        auth: { token },
        extraHeaders: {
          'Bypass-Tunnel-Reminder': 'true',
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        this.setStatus('connected');
        if (this.currentRelationshipId) {
          this.socket?.emit('join_relationship', { relationshipId: this.currentRelationshipId });
          this.socket?.emit('couple:join', { relationshipId: this.currentRelationshipId });
        }
      });

      this.socket.on('disconnect', (reason) => {
        this.setStatus(reason === 'io client disconnect' ? 'disconnected' : 'error');
      });

      this.socket.on('connect_error', () => {
        this.setStatus('error');
      });

      this.socket.on('reconnect_attempt', () => {
        this.setStatus('connecting');
      });

      // Unified Partner Pairing Events Bridge
      this.socket.on('partner_paired', (data) => {
        this.dispatch('partner_paired', data);
        this.dispatch('partner:joined', data);
      });

      this.socket.on('partner:joined', (data) => {
        this.dispatch('partner_paired', data);
        this.dispatch('partner:joined', data);
      });

      // Reattach all registered custom listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((cb) => {
          this.socket?.on(event, cb as any);
        });
      });

      return this.socket;
    } catch (err) {
      this.setStatus('error');
      return null;
    }
  }

  private dispatch(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(...args);
        } catch {}
      });
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    this.socket?.on(event, callback);

    return () => this.off(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setStatus('disconnected');
    this.listeners.clear();
  }
}

export const socketService = new SocketService();
