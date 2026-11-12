import { Server as SocketIOServer } from 'socket.io';
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

  io.on('connection', (socket) => {
    // Authenticate socket handshake if token is provided
    let authenticatedUserId: string | null = null;
    const authHeader = socket.handshake.headers['authorization'];
    const rawToken =
      socket.handshake.auth?.token ||
      (typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : null);

    if (rawToken) {
      try {
        const decoded = jwt.verify(rawToken, JWT_SECRET) as { userId: string };
        authenticatedUserId = decoded.userId;
        socket.join(`user_${authenticatedUserId}`);
        socket.emit('auth_success', { userId: authenticatedUserId });
      } catch (err) {
        // Continue connection even if unauthenticated, join will occur explicitly
      }
    }

    // Join private couple room (support both 'join_relationship' and 'couple:join')
    const handleJoin = ({ relationshipId, userId }: { relationshipId?: string; userId?: string }) => {
      const resolvedUserId = userId || authenticatedUserId;
      if (relationshipId) {
        socket.join(`rel_${relationshipId}`);
        socket.to(`rel_${relationshipId}`).emit('partner_online', { userId: resolvedUserId });
      }
      if (resolvedUserId) {
        socket.join(`user_${resolvedUserId}`);
      }
    };

    socket.on('join_relationship', handleJoin);
    socket.on('couple:join', handleJoin);

    // Chat Message
    socket.on('send_chat_message', ({ relationshipId, message }) => {
      socket.to(`rel_${relationshipId}`).emit('receive_chat_message', message);
    });

    // Typing indicator
    socket.on('typing', ({ relationshipId, isTyping, userName }) => {
      socket.to(`rel_${relationshipId}`).emit('partner_typing', { isTyping, userName });
    });

    // Canvas real-time stroke synchronization
    socket.on('canvas_stroke', ({ relationshipId, stroke }) => {
      socket.to(`rel_${relationshipId}`).emit('partner_canvas_stroke', stroke);
    });

    // Canvas clear
    socket.on('canvas_clear', ({ relationshipId }) => {
      socket.to(`rel_${relationshipId}`).emit('partner_canvas_clear');
    });

    // Canvas sticky note
    socket.on('canvas_sticky_note', ({ relationshipId, note }) => {
      socket.to(`rel_${relationshipId}`).emit('partner_canvas_sticky_note', note);
    });

    // Game action
    socket.on('game_action', ({ relationshipId, sessionId, action, data }) => {
      socket.to(`rel_${relationshipId}`).emit('partner_game_action', { sessionId, action, data });
    });

    // Activity updates (e.g. Question answered, Photo uploaded)
    socket.on('activity_completed', ({ relationshipId, type, userName }) => {
      socket.to(`rel_${relationshipId}`).emit('partner_activity_completed', { type, userName });
    });

    // Partner paired alert
    socket.on('partner_joined_space', ({ relationshipId, partner }) => {
      socket.to(`rel_${relationshipId}`).emit('partner_paired', { partner });
      socket.to(`rel_${relationshipId}`).emit('partner:joined', { partner });
    });

    socket.on('disconnect', () => {
      if (authenticatedUserId) {
        io.emit('partner_offline', { userId: authenticatedUserId });
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}


