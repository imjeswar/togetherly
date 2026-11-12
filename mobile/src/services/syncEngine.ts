import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { offlineStorage } from './offlineStorage';
import { secureStorage } from './secureStore';
import { ENV } from '../config/env';
import { SyncOperation } from '../types';

type NetworkChangeListener = (isConnected: boolean, isInternetReachable: boolean) => void;
type QueueChangeListener = (pendingCount: number) => void;

class SyncEngine {
  private isConnected: boolean = true;
  private isSyncing: boolean = false;
  private networkListeners: Set<NetworkChangeListener> = new Set();
  private queueListeners: Set<QueueChangeListener> = new Set();
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Listen to network state changes
    NetInfo.addEventListener((state: NetInfoState) => {
      const connected = Boolean(state.isConnected && (state.isInternetReachable ?? true));
      const wasConnected = this.isConnected;
      this.isConnected = connected;

      this.networkListeners.forEach((listener) => {
        listener(Boolean(state.isConnected), Boolean(state.isInternetReachable));
      });

      // When network returns, automatically trigger synchronization queue replay
      if (!wasConnected && connected) {
        this.triggerSync();
      }
    });

    // Initial state check
    NetInfo.fetch().then((state) => {
      this.isConnected = Boolean(state.isConnected && (state.isInternetReachable ?? true));
    });
  }

  public subscribeNetwork(listener: NetworkChangeListener): () => void {
    this.networkListeners.add(listener);
    listener(this.isConnected, this.isConnected);
    return () => this.networkListeners.delete(listener);
  }

  public subscribeQueue(listener: QueueChangeListener): () => void {
    this.queueListeners.add(listener);
    this.notifyQueueChanged();
    return () => this.queueListeners.delete(listener);
  }

  private async notifyQueueChanged() {
    const count = await offlineStorage.getQueueCount();
    this.queueListeners.forEach((listener) => listener(count));
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Enqueue an operation when offline or for guaranteed execution
   */
  public async queueOperation(
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data?: any,
    customIdempotencyKey?: string
  ): Promise<SyncOperation> {
    const opId = Crypto.randomUUID();
    const idempotencyKey = customIdempotencyKey || `op_${Date.now()}_${opId.substring(0, 8)}`;

    const op = await offlineStorage.enqueueOperation({
      id: opId,
      endpoint,
      method,
      data,
      idempotencyKey,
      createdAt: Date.now(),
    });

    await this.notifyQueueChanged();

    // If online, immediately try to sync
    if (this.isConnected) {
      this.triggerSync();
    }

    return op;
  }

  /**
   * Triggers the sync loop to replay pending operations
   */
  public triggerSync() {
    if (this.isSyncing || !this.isConnected) return;

    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.processQueue();
    }, 500);
  }

  private async processQueue() {
    if (this.isSyncing || !this.isConnected) return;
    this.isSyncing = true;

    try {
      const pendingOps = await offlineStorage.getPendingOperations();
      if (pendingOps.length === 0) {
        this.isSyncing = false;
        await this.notifyQueueChanged();
        return;
      }

      const token = await secureStorage.getAuthToken();
      const sessionId = await secureStorage.getDeviceSessionId();

      for (const op of pendingOps) {
        if (!this.isConnected) break; // Network dropped mid-sync

        // Max retries safety
        if (op.retryCount >= ENV.SYNC.MAX_RETRIES) {
          await offlineStorage.updateOperationStatus(
            op.id,
            'FAILED',
            'Max retry limit reached. Please check connectivity.'
          );
          continue;
        }

        await offlineStorage.updateOperationStatus(op.id, 'SYNCING');

        try {
          const url = op.endpoint.startsWith('http')
            ? op.endpoint
            : `${ENV.API_BASE_URL}${op.endpoint.startsWith('/') ? '' : '/'}${op.endpoint}`;

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-idempotency-key': op.idempotencyKey,
          };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          if (sessionId) headers['x-session-id'] = sessionId;

          const response = await fetch(url, {
            method: op.method,
            headers,
            body: op.data ? JSON.stringify(op.data) : undefined,
          });

          if (response.ok || response.status === 409) {
            // 200 OK or 409 Conflict (already synced via idempotency)
            await offlineStorage.updateOperationStatus(op.id, 'SYNCED');
          } else if (response.status >= 400 && response.status < 500 && response.status !== 408) {
            // Client error: don't loop endlessly, mark failed but never discard
            const errBody = await response.text();
            await offlineStorage.updateOperationStatus(op.id, 'FAILED', `Client error: ${errBody}`, true);
          } else {
            // Server error / network error: retry later
            await offlineStorage.updateOperationStatus(
              op.id,
              'FAILED',
              `Server status: ${response.status}`,
              true
            );
          }
        } catch (fetchErr: any) {
          // Network connection died or server unreachable
          await offlineStorage.updateOperationStatus(
            op.id,
            'FAILED',
            fetchErr?.message || 'Network request failed',
            true
          );
        }
      }
    } finally {
      this.isSyncing = false;
      await this.notifyQueueChanged();
    }
  }
}

export const syncEngine = new SyncEngine();

