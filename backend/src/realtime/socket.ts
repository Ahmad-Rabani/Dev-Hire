import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';
import type { PublicNotification } from '../modules/notifications/notification.types';
import { logger } from '../utils/logger';
import { verifyAccessToken } from '../utils/tokens';

let io: Server | null = null;

export function getIo(): Server | null {
  return io;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Attach Socket.IO to the existing HTTP server.
 * Auth: access token in handshake.auth.token (never in query string).
 */
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    },
    // Avoid stuffing tokens into the URL.
    allowRequest: (_req, callback) => {
      callback(null, true);
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : null;
      if (!token) {
        next(new Error('Authentication required'));
        return;
      }

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select('role status email');
      if (!user) {
        next(new Error('User no longer exists'));
        return;
      }
      if (user.status === 'suspended') {
        next(new Error('Account suspended'));
        return;
      }

      socket.data.userId = user._id.toString();
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error('Invalid or expired access token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    // Only the verified identity joins this room — clients cannot pick another userId.
    void socket.join(userRoom(userId));
    logger.info('Socket connected', { userId, socketId: socket.id });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { userId, socketId: socket.id });
    });
  });

  return io;
}

export function emitNotificationToUser(userId: string, notification: PublicNotification): void {
  if (!io) return;
  io.to(userRoom(userId)).emit('notification:new', { notification });
}
