import { Server, Socket } from 'socket.io';
import prisma from '../prisma/prisma';

export interface ActiveSession {
  taskTitle: string;
  mode: string;
  startedAt: Date;
  remainingSeconds: number;
  status: 'running' | 'paused';
}

export const activeSessions = new Map<string, ActiveSession>();

export function setupFocusSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Automatically join room if userId is in connection auth handshake
    const handshakeUserId = socket.handshake.auth?.userId;
    if (handshakeUserId) {
      socket.join(`focus:${handshakeUserId}`);
      console.log(`User ${handshakeUserId} automatically joined focus:${handshakeUserId} room`);
      const session = activeSessions.get(handshakeUserId);
      if (session) {
        socket.emit('focus:synced', {
          remainingSeconds: session.remainingSeconds,
          status: session.status,
          taskTitle: session.taskTitle,
          mode: session.mode,
        });
      }
    }

    // Join user's private room explicitly
    socket.on('focus:join', (userId: string) => {
      if (!userId) return;
      socket.join(`focus:${userId}`);
      console.log(`User ${userId} joined room focus:${userId}`);
      
      const session = activeSessions.get(userId);
      if (session) {
        socket.emit('focus:synced', {
          remainingSeconds: session.remainingSeconds,
          status: session.status,
          taskTitle: session.taskTitle,
          mode: session.mode,
        });
      }
    });

    socket.on('focus:start', (data: { userId: string; taskTitle: string; mode: string; durationMinutes: number }) => {
      const { userId, taskTitle, mode, durationMinutes } = data;
      if (!userId) return;

      const remainingSeconds = durationMinutes * 60;
      activeSessions.set(userId, {
        taskTitle,
        mode,
        startedAt: new Date(),
        remainingSeconds,
        status: 'running',
      });

      io.to(`focus:${userId}`).emit('focus:synced', {
        remainingSeconds,
        status: 'running',
        taskTitle,
        mode,
      });
    });

    socket.on('focus:pause', (data: { userId: string; remainingSeconds: number }) => {
      const { userId, remainingSeconds } = data;
      if (!userId) return;

      const session = activeSessions.get(userId);
      if (session) {
        session.remainingSeconds = remainingSeconds;
        session.status = 'paused';
        activeSessions.set(userId, session);
      }

      io.to(`focus:${userId}`).emit('focus:synced', {
        remainingSeconds,
        status: 'paused',
      });
    });

    socket.on('focus:resume', (data: { userId: string }) => {
      const { userId } = data;
      if (!userId) return;

      const session = activeSessions.get(userId);
      if (session) {
        session.status = 'running';
        activeSessions.set(userId, session);

        io.to(`focus:${userId}`).emit('focus:synced', {
          remainingSeconds: session.remainingSeconds,
          status: 'running',
        });
      }
    });

    socket.on('focus:tick', (data: { userId: string; remainingSeconds: number }) => {
      const { userId, remainingSeconds } = data;
      if (!userId) return;

      const session = activeSessions.get(userId);
      if (session) {
        session.remainingSeconds = remainingSeconds;
        activeSessions.set(userId, session);
      }

      io.to(`focus:${userId}`).emit('focus:synced', {
        remainingSeconds,
        status: session?.status || 'running',
      });
    });

    socket.on('focus:end', async (data: { userId: string; actualMinutes: number; taskTitle: string; mode: string }) => {
      const { userId, actualMinutes, taskTitle, mode } = data;
      if (!userId) return;

      activeSessions.delete(userId);

      try {
        const session = await prisma.focusSession.create({
          data: {
            userId,
            taskTitle: taskTitle || null,
            duration: Math.max(1, Math.round(actualMinutes)),
            mode: mode || 'custom',
          },
        });

        io.to(`focus:${userId}`).emit('focus:ended', {
          sessionId: session.id,
          totalMinutes: session.duration,
        });

        io.to(`focus:${userId}`).emit('focus:synced', {
          remainingSeconds: 0,
          status: 'ended',
        });
      } catch (e) {
        console.error('Error saving socket focus session:', e);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
