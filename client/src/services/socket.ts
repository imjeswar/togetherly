import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL || undefined, {
      autoConnect: true,
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('Connected to Togetherly real-time socket:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Togetherly socket');
    });
  }

  return socket;
}

export function joinRelationshipRoom(relationshipId: string, userId: string) {
  const s = getSocket();
  s.emit('join_relationship', { relationshipId, userId });
}

