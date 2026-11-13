import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { secureStorage } from '../services/secureStore';
import { offlineStorage } from '../services/offlineStorage';
import { api } from '../services/api';
import { socketService, SocketStatus } from '../services/socket';
import { widgetBridge } from '../services/widgetBridge';
import { ENV } from '../config/env';

export interface PairedPartner {
  id: string;
  deviceId: string;
  nickname: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastActiveAt?: string;
}

export interface SanctuarySpace {
  spaceId: string;
  name?: string;
  status: string;
  daysTogether: number;
  createdAt: string;
}

interface AuthContextType {
  deviceId: string | null;
  spaceId: string | null;
  space: SanctuarySpace | null;
  partner: PairedPartner | null;
  isPaired: boolean;
  isLoading: boolean;
  socketStatus: SocketStatus;
  partnerOnline: boolean;
  invitationCode: string | null;
  inviteUrl: string | null;
  userNickname: string;
  // Core actions
  createSpace: (nickname?: string) => Promise<any>;
  joinSpace: (code: string, nickname?: string) => Promise<any>;
  unpair: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  updateNickname: (name: string) => Promise<void>;
  // Legacy aliases for backward compatibility with existing child components
  user: any;
  token: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [space, setSpace] = useState<SanctuarySpace | null>(null);
  const [partner, setPartner] = useState<PairedPartner | null>(null);
  const [isPaired, setIsPaired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [partnerOnline, setPartnerOnline] = useState<boolean>(false);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [userNickname, setUserNickname] = useState<string>('My Love');

  // Initialize Anonymous Device ID and Session
  const init = useCallback(async () => {
    try {
      setIsLoading(true);
      const persistentDeviceId = await secureStorage.getOrCreateDeviceId();
      setDeviceId(persistentDeviceId);

      const savedToken = await secureStorage.getAuthToken();
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      setToken(savedToken);

      // Verify and fetch space status from cloud backend
      const res = await api.getSpaceStatus();
      if (res && res.spaceId && res.status === 'ACTIVE') {
        setSpaceId(res.spaceId);
        await secureStorage.setSpaceId(res.spaceId);
        setSpace({
          spaceId: res.spaceId,
          name: res.name,
          status: res.status,
          daysTogether: res.daysTogether || 1,
          createdAt: res.createdAt,
        });

        if (res.device?.nickname) {
          setUserNickname(res.device.nickname);
        }

        if (res.isPaired && res.partner) {
          setIsPaired(true);
          setPartner(res.partner);
          if (typeof res.partner.isOnline === 'boolean') {
            setPartnerOnline(res.partner.isOnline);
          }
        } else {
          setIsPaired(false);
          setPartner(null);
          setPartnerOnline(false);
          if (res.invitation?.code) {
            setInvitationCode(res.invitation.code);
            setInviteUrl(res.invitation.inviteUrl);
          }
        }

        // Connect real-time socket
        socketService.connectSpace(res.spaceId, persistentDeviceId);

        // Sync native credentials for background FCM processing & widgets
        widgetBridge.setSessionCredentials(savedToken, persistentDeviceId, res.spaceId, ENV.API_BASE_URL);

        // Register FCM Push Token for background delivery
        widgetBridge.getPushToken().then((pushToken) => {
          if (pushToken) {
            api.registerPushToken(pushToken, Platform.OS).catch(() => {});
          }
        });
      } else {
        // Space uncoupled or deleted
        await secureStorage.clearAll();
        setToken(null);
        setSpaceId(null);
        setSpace(null);
        setPartner(null);
        setIsPaired(false);
      }
    } catch (err) {
      // If network fails on launch, try to retain offline local space if token exists
      const offlineSpaceId = await secureStorage.getSpaceId();
      if (offlineSpaceId) {
        setSpaceId(offlineSpaceId);
        setIsPaired(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  // Real-time socket status and partner presence listeners
  useEffect(() => {
    // Pull any queued offline deliveries whenever connected
    const syncPendingDeliveries = async () => {
      try {
        const res = await api.getPendingDeliveries();
        if (res?.events && res.events.length > 0) {
          const ackIds: string[] = [];
          for (const evt of res.events) {
            ackIds.push(evt.id);
            if (evt.eventType === 'DRAWING' && evt.data?.canvasData) {
              await offlineStorage.saveDrawingDraft(
                evt.data.drawingId || evt.id,
                evt.data.title || 'Partner Drawing',
                evt.data.canvasData
              );
              await widgetBridge.updateDrawingWidget(
                evt.data.title || 'Our Latest Doodle',
                evt.data.canvasData
              );
            } else if (evt.eventType === 'PHOTO' && (evt.data?.photoUrl || evt.mediaUrl)) {
              const rawUrl = evt.data?.photoUrl || evt.mediaUrl;
              const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:')
                ? rawUrl
                : `${ENV.API_BASE_URL.replace(/\/api\/?$/, '')}${rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl}`;
              await widgetBridge.updatePhotoWidget(fullUrl, evt.data?.caption);
            }
          }
          if (ackIds.length > 0) {
            await api.ackDeliveries(ackIds);
          }
        }
      } catch {}
    };

    const unsubStatus = socketService.onStatusChange((status) => {
      setSocketStatus(status);
      if (status === 'connected') {
        socketService.queryPresence();
        syncPendingDeliveries();
      }
    });

    const unsubPresenceSync = socketService.on('presence_sync', (data: any) => {
      if (typeof data?.partnerOnline === 'boolean') {
        setPartnerOnline(data.partnerOnline);
        if (data.partnerOnline) {
          syncPendingDeliveries();
        }
      }
    });

    const unsubPartnerOnline = socketService.on('partner_online', () => {
      setPartnerOnline(true);
      syncPendingDeliveries();
    });

    const unsubPartnerOffline = socketService.on('partner_offline', () => {
      setPartnerOnline(false);
    });

    const unsubPartnerJoined = socketService.on('partner_joined', async (data: any) => {
      setIsPaired(true);
      if (data.partner) {
        setPartner(data.partner);
      }
      setPartnerOnline(true);
      await refreshStatus();
    });

    const unsubSpaceUnpaired = socketService.on('space_unpaired', async () => {
      await secureStorage.clearAll();
      setToken(null);
      setSpaceId(null);
      setSpace(null);
      setPartner(null);
      setIsPaired(false);
    });

    // Handle AppState (background/foreground) transitions
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        socketService.sendHeartbeat();
        socketService.queryPresence();
        syncPendingDeliveries();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // Active foreground presence heartbeat (every 12 seconds)
    const heartbeatTimer = setInterval(() => {
      socketService.sendHeartbeat();
    }, 12000);

    return () => {
      clearInterval(heartbeatTimer);
      unsubStatus?.();
      unsubPresenceSync?.();
      unsubPartnerOnline?.();
      unsubPartnerOffline?.();
      unsubPartnerJoined?.();
      unsubSpaceUnpaired?.();
      appStateSub.remove();
    };
  }, []);

  // 1. CREATE YOUR SPACE
  const createSpace = async (nickname = 'My Love') => {
    const activeDeviceId = deviceId || (await secureStorage.getOrCreateDeviceId());
    const res = await api.createAnonymousSpace({
      deviceId: activeDeviceId,
      nickname,
      platform: 'android',
    });

    if (res.token) {
      await secureStorage.setAuthToken(res.token);
      setToken(res.token);
    }

    if (res.spaceId) {
      await secureStorage.setSpaceId(res.spaceId);
      setSpaceId(res.spaceId);
      socketService.connectSpace(res.spaceId, activeDeviceId);
      if (res.token) {
        widgetBridge.setSessionCredentials(res.token, activeDeviceId, res.spaceId, ENV.API_BASE_URL);
        widgetBridge.getPushToken().then((pushToken) => {
          if (pushToken) api.registerPushToken(pushToken, Platform.OS).catch(() => {});
        });
      }
    }

    if (res.invitationCode) {
      setInvitationCode(res.invitationCode);
      setInviteUrl(res.inviteUrl);
    }

    setIsPaired(Boolean(res.isPaired));
    setUserNickname(nickname);

    return res;
  };

  // 2. JOIN YOUR PARTNER
  const joinSpace = async (code: string, nickname = 'My Darling') => {
    const activeDeviceId = deviceId || (await secureStorage.getOrCreateDeviceId());
    const res = await api.joinAnonymousSpace({
      code: code.trim().toUpperCase(),
      deviceId: activeDeviceId,
      nickname,
      platform: 'android',
    });

    if (res.token) {
      await secureStorage.setAuthToken(res.token);
      setToken(res.token);
    }

    if (res.spaceId) {
      await secureStorage.setSpaceId(res.spaceId);
      setSpaceId(res.spaceId);
      socketService.connectSpace(res.spaceId, activeDeviceId);
      if (res.token) {
        widgetBridge.setSessionCredentials(res.token, activeDeviceId, res.spaceId, ENV.API_BASE_URL);
        widgetBridge.getPushToken().then((pushToken) => {
          if (pushToken) api.registerPushToken(pushToken, Platform.OS).catch(() => {});
        });
      }
    }

    if (res.partner) {
      setPartner(res.partner);
    }

    setIsPaired(true);
    setUserNickname(nickname);

    return res;
  };

  // 3. EXPLICIT UNPAIR
  const unpair = async () => {
    try {
      await api.unpairSpace();
    } catch {}

    socketService.disconnect();
    await secureStorage.clearAll();

    setToken(null);
    setSpaceId(null);
    setSpace(null);
    setPartner(null);
    setIsPaired(false);
    setInvitationCode(null);
  };

  // 4. REFRESH STATUS
  const refreshStatus = async () => {
    try {
      const res = await api.getSpaceStatus();
      if (res && res.spaceId) {
        setSpace({
          spaceId: res.spaceId,
          name: res.name,
          status: res.status,
          daysTogether: res.daysTogether || 1,
          createdAt: res.createdAt,
        });

        if (res.device?.nickname) {
          setUserNickname(res.device.nickname);
        }

        if (res.isPaired && res.partner) {
          setIsPaired(true);
          setPartner(res.partner);
        }

        if (res.invitation?.code) {
          setInvitationCode(res.invitation.code);
          setInviteUrl(res.invitation.inviteUrl);
        }
      }
    } catch {}
  };

  // 5. UPDATE NICKNAME
  const updateNickname = async (name: string) => {
    setUserNickname(name);
    try {
      await api.updateSpaceProfile({ nickname: name });
    } catch {}
  };

  // Legacy adapter values so existing code doesn't crash
  const legacyUser = {
    id: deviceId || 'anonymous_user',
    firstName: userNickname,
    relationshipId: spaceId,
    relationship: space ? { id: space.spaceId, daysTogether: space.daysTogether } : null,
    partner: partner ? { id: partner.id, firstName: partner.nickname, avatarUrl: partner.avatarUrl } : null,
  };

  return (
    <AuthContext.Provider
      value={{
        deviceId,
        spaceId,
        space,
        partner,
        isPaired,
        isLoading,
        socketStatus,
        partnerOnline,
        invitationCode,
        inviteUrl,
        userNickname,
        createSpace,
        joinSpace,
        unpair,
        refreshStatus,
        updateNickname,
        user: legacyUser,
        token,
        refreshUser: refreshStatus,
        logout: unpair,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
