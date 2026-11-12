import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

let ioInstance: SocketIOServer | null = null;
const JWT_SECRET = process.env.JWT_SECRET || 'togetherly-secret-key-couples-platform-2026-super-secure';

// In-memory presence tracker: spaceId -> (deviceId -> Set<socketId>)
const spacePresence = new Map<string, Map<string, Set<string>>>();
// Debounce timers for offline notifications (15s grace period)
const offlineTimers = new Map<string, NodeJS.Timeout>();

function addDeviceSocket(spaceId: string, deviceId: string, socketId: string) {
  cancelDeviceOffline(spaceId, deviceId);
  if (!spacePresence.has(spaceId)) {
    spacePresence.set(spaceId, new Map());
  }
  const spaceDevices = spacePresence.get(spaceId)!;
  if (!spaceDevices.has(deviceId)) {
    spaceDevices.set(deviceId, new Set());
  }
  spaceDevices.get(deviceId)!.add(socketId);
}

function removeDeviceSocket(spaceId: string, deviceId: string, socketId: string): boolean {
  const spaceDevices = spacePresence.get(spaceId);
  if (!spaceDevices) return true; // already offline

  const deviceSockets = spaceDevices.get(deviceId);
  if (deviceSockets) {
    deviceSockets.delete(socketId);
    if (deviceSockets.size === 0) {
      spaceDevices.delete(deviceId);
      if (spaceDevices.size === 0) {
        spacePresence.delete(spaceId);
      }
      return true; // device has 0 active sockets right now
    }
  }
  return false; // device still has other active sockets
}

function scheduleDeviceOffline(spaceId: string, deviceId: string) {
  const key = `${spaceId}:${deviceId}`;
  if (offlineTimers.has(key)) {
    clearTimeout(offlineTimers.get(key)!);
  }
  const timer = setTimeout(() => {
    offlineTimers.delete(key);
    // Double check if device really has 0 active sockets after grace period
    if (!isDeviceOnline(spaceId, deviceId)) {
      if (ioInstance) {
        ioInstance.to(`space_${spaceId}`).emit('partner_offline', {
          deviceId,
          spaceId,
          timestamp: new Date().toISOString(),
        });
      }
      prisma.pairedDevice
        .updateMany({
          where: { deviceId, spaceId },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});
    }
  }, 15000); // 15-second grace period
  offlineTimers.set(key, timer);
}

function cancelDeviceOffline(spaceId: string, deviceId: string) {
  const key = `${spaceId}:${deviceId}`;
  if (offlineTimers.has(key)) {
    clearTimeout(offlineTimers.get(key)!);
    offlineTimers.delete(key);
  }
}

export function isDeviceOnline(spaceId: string, deviceId: string): boolean {
  const spaceDevices = spacePresence.get(spaceId);
  if (!spaceDevices) return false;
  const sockets = spaceDevices.get(deviceId);
  return Boolean(sockets && sockets.size > 0);
}

export function isPartnerOnline(spaceId: string, selfDeviceId: string): boolean {
  const spaceDevices = spacePresence.get(spaceId);
  if (!spaceDevices) return false;
  for (const [devId, sockets] of spaceDevices.entries()) {
    if (devId !== selfDeviceId && sockets.size > 0) {
      return true;
    }
  }
  return false;
}

export function setupSocketIO(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 15000,
  });

  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    let currentDeviceId: string | null = null;
    let currentSpaceId: string | null = null;
    let legacyUserId: string | null = null;

    // Helper: join space and synchronize presence bidirectionally
    const handleJoinSpace = (spaceId: string, deviceId: string) => {
      currentSpaceId = spaceId;
      currentDeviceId = deviceId;

      socket.join(`space_${spaceId}`);
      socket.join(`device_${deviceId}`);

      // Track presence
      addDeviceSocket(spaceId, deviceId, socket.id);

      // 1. Tell OTHER devices in space that this device is ONLINE
      socket.to(`space_${spaceId}`).emit('partner_online', {
        deviceId,
        spaceId,
        timestamp: new Date().toISOString(),
      });

      // 2. Check if partner device is ALREADY online and tell THIS device immediately
      const partnerIsOnline = isPartnerOnline(spaceId, deviceId);
      socket.emit('presence_sync', {
        partnerOnline: partnerIsOnline,
        spaceId,
        deviceId,
        timestamp: new Date().toISOString(),
      });

      if (partnerIsOnline) {
        socket.emit('partner_online', {
          spaceId,
          timestamp: new Date().toISOString(),
        });
      }

      socket.emit('auth_success', { deviceId, spaceId });

      // Update lastActiveAt in database asynchronously
      prisma.pairedDevice
        .updateMany({
          where: { deviceId, spaceId },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});
    };

    // Authenticate handshake if token provided
    const authHeader = socket.handshake.headers['authorization'];
    const rawToken =
      socket.handshake.auth?.token ||
      (typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : null);

    if (rawToken) {
      try {
        const decoded = jwt.verify(rawToken, JWT_SECRET) as any;
        if (decoded.deviceId && decoded.spaceId) {
          handleJoinSpace(decoded.spaceId, decoded.deviceId);
        } else if (decoded.userId) {
          legacyUserId = decoded.userId;
          socket.join(`user_${legacyUserId}`);
        }
      } catch (err) {
        // Continue connection
      }
    }

    // 1. EXPLICIT ANONYMOUS DEVICE SPACE JOIN
    socket.on('join_space', ({ spaceId, deviceId }: { spaceId?: string; deviceId?: string }) => {
      const resolvedSpaceId = spaceId || currentSpaceId;
      const resolvedDeviceId = deviceId || currentDeviceId;

      if (resolvedSpaceId && resolvedDeviceId) {
        handleJoinSpace(resolvedSpaceId, resolvedDeviceId);
      }
    });

    // 2. EXPLICIT PRESENCE QUERY & HEARTBEAT
    const handlePresenceCheck = ({ spaceId, deviceId }: { spaceId?: string; deviceId?: string }) => {
      const targetSpace = spaceId || currentSpaceId;
      const targetDevice = deviceId || currentDeviceId;
      if (targetSpace && targetDevice) {
        cancelDeviceOffline(targetSpace, targetDevice);
        addDeviceSocket(targetSpace, targetDevice, socket.id);

        const partnerIsOnline = isPartnerOnline(targetSpace, targetDevice);
        socket.emit('presence_sync', {
          partnerOnline: partnerIsOnline,
          spaceId: targetSpace,
          deviceId: targetDevice,
          timestamp: new Date().toISOString(),
        });

        // Touch DB activity timestamp
        prisma.pairedDevice
          .updateMany({
            where: { deviceId: targetDevice, spaceId: targetSpace },
            data: { lastActiveAt: new Date() },
          })
          .catch(() => {});
      }
    };

    socket.on('query_presence', handlePresenceCheck);
    socket.on('presence_heartbeat', handlePresenceCheck);

    // 3. REAL-TIME SHARED CANVAS STROKE SYNCHRONIZATION
    socket.on('shared_canvas_stroke', ({ spaceId, stroke, deviceId }: any) => {
      const targetSpace = spaceId || currentSpaceId;
      if (targetSpace) {
        socket.to(`space_${targetSpace}`).emit('shared_canvas_stroke', {
          stroke,
          deviceId: deviceId || currentDeviceId,
        });
      }
    });

    socket.on('shared_canvas_clear', ({ spaceId, deviceId }: any) => {
      const targetSpace = spaceId || currentSpaceId;
      if (targetSpace) {
        socket.to(`space_${targetSpace}`).emit('shared_canvas_clear', {
          deviceId: deviceId || currentDeviceId,
        });
      }
    });

    // 4. DRAWING & PHOTO NOTIFICATIONS
    socket.on('drawing_sent', ({ spaceId, drawing }: any) => {
      const targetSpace = spaceId || currentSpaceId;
      if (targetSpace) {
        socket.to(`space_${targetSpace}`).emit('incoming_drawing', drawing);
      }
    });

    socket.on('photo_sent', ({ spaceId, photo }: any) => {
      const targetSpace = spaceId || currentSpaceId;
      if (targetSpace) {
        socket.to(`space_${targetSpace}`).emit('incoming_photo', photo);
      }
    });

    // 5. DELIVERY STATUS & SEEN CONFIRMATION
    socket.on('delivery_ack', ({ eventId, senderDeviceId }: any) => {
      if (senderDeviceId) {
        socket.to(`device_${senderDeviceId}`).emit('delivery_status_update', {
          eventId,
          status: 'DELIVERED',
          deliveredAt: new Date(),
        });
      }
    });

    socket.on('delivery_seen', ({ eventId, senderDeviceId }: any) => {
      if (senderDeviceId) {
        socket.to(`device_${senderDeviceId}`).emit('delivery_status_update', {
          eventId,
          status: 'SEEN',
          seenAt: new Date(),
        });
      }
    });

    // --- LEGACY CHANNELS (Safe compatibility) ---
    const handleLegacyJoin = ({ relationshipId, userId }: { relationshipId?: string; userId?: string }) => {
      if (relationshipId) {
        socket.join(`rel_${relationshipId}`);
        socket.to(`rel_${relationshipId}`).emit('partner_online', { userId });
      }
      if (userId) {
        socket.join(`user_${userId}`);
      }
    };
    socket.on('join_relationship', handleLegacyJoin);
    socket.on('couple:join', handleLegacyJoin);

    // 6. DISCONNECTION LIFECYCLE (Debounced to prevent transient network drops from showing offline)
    socket.on('disconnect', () => {
      if (currentSpaceId && currentDeviceId) {
        const fullyOffline = removeDeviceSocket(currentSpaceId, currentDeviceId, socket.id);
        if (fullyOffline) {
          scheduleDeviceOffline(currentSpaceId, currentDeviceId);
        }
      }
      if (legacyUserId) {
        io.emit('partner_offline', { userId: legacyUserId });
      }
    });
  });
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}
