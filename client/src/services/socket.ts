import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
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
