import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

let ioInstance: SocketIOServer | null = null;
const JWT_SECRET = process.env.JWT_SECRET || 'togetherly-secret-key-couples-platform-2026-super-secure';

export function setupSocketIO(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    let currentDeviceId: string | null = null;
    let currentSpaceId: string | null = null;
    let legacyUserId: string | null = null;

    // Authenticate handshake if token provided
    const authHeader = socket.handshake.headers['authorization'];
    const rawToken =
      socket.handshake.auth?.token ||
      (typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : null);

    if (rawToken) {
      try {
        const decoded = jwt.verify(rawToken, JWT_SECRET) as any;
        if (decoded.deviceId && decoded.spaceId) {
          currentDeviceId = decoded.deviceId;
          currentSpaceId = decoded.spaceId;
          socket.join(`space_${currentSpaceId}`);
          socket.join(`device_${currentDeviceId}`);
          socket.to(`space_${currentSpaceId}`).emit('partner_online', { deviceId: currentDeviceId });
          socket.emit('auth_success', { deviceId: currentDeviceId, spaceId: currentSpaceId });
        } else if (decoded.userId) {
          legacyUserId = decoded.userId;
          socket.join(`user_${legacyUserId}`);
        }
      } catch (err) {
        // Continue connection
      }
    }

    // 1. ANONYMOUS DEVICE SPACE JOIN
    socket.on('join_space', ({ spaceId, deviceId }: { spaceId?: string; deviceId?: string }) => {
      const resolvedSpaceId = spaceId || currentSpaceId;
      const resolvedDeviceId = deviceId || currentDeviceId;

      if (resolvedSpaceId) {
        currentSpaceId = resolvedSpaceId;
        socket.join(`space_${resolvedSpaceId}`);
        socket.to(`space_${resolvedSpaceId}`).emit('partner_online', { deviceId: resolvedDeviceId });
      }

      if (resolvedDeviceId) {
        currentDeviceId = resolvedDeviceId;
        socket.join(`device_${resolvedDeviceId}`);
      }
    });

    // 2. REAL-TIME SHARED CANVAS STROKE SYNCHRONIZATION
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

    // 3. DRAWING & PHOTO NOTIFICATIONS
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

    // 4. DELIVERY STATUS & SEEN CONFIRMATION
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

    // --- LEGACY CHANNELS (Safe compatibility during transition) ---
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

    socket.on('disconnect', () => {
      if (currentSpaceId && currentDeviceId) {
        socket.to(`space_${currentSpaceId}`).emit('partner_offline', { deviceId: currentDeviceId });
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
