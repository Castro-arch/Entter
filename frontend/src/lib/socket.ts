import { io, type Socket } from 'socket.io-client';
import type { DaySummary } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Connects to the attendance gateway and joins the given event's room.
 * Auth reuses the same httpOnly `access_token` cookie as the REST API (see
 * `AttendanceGateway.handleConnection`) — `withCredentials` is required for
 * the cookie to be sent on the handshake since the socket is cross-origin.
 */
export function subscribeToAttendance(
  eventId: string,
  onUpdate: (summary: DaySummary) => void,
): () => void {
  const socket: Socket = io(API_URL, { withCredentials: true });

  socket.on('connect', () => socket.emit('join', { eventId }));
  socket.on('attendance:update', onUpdate);

  return () => {
    socket.disconnect();
  };
}
