import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export function setupSocketIO(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Join private couple room
    socket.on('join_relationship', ({ relationshipId, userId }) => {
      if (relationshipId) {
        socket.join(`rel_${relationshipId}`);
        socket.to(`rel_${relationshipId}`).emit('partner_online', { userId });
      }
    });

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
    });

    socket.on('disconnect', () => {
      // Disconnect cleanly
    });
  });

  return io;
}
