import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/authRoutes';
import habitRoutes from './routes/habitRoutes';
import taskRoutes from './routes/taskRoutes';
import calendarRoutes from './routes/calendarRoutes';
import healthRoutes from './routes/healthRoutes';
import focusRoutes from './routes/focusRoutes';
import userRoutes from './routes/userRoutes';
import reportRoutes from './routes/reportRoutes';
import notificationRoutes from './routes/notificationRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import pushRoutes from './routes/pushRoutes';
import { setupFocusSocket } from './socket/focusSocket';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Routes API Mapping
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', calendarRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/user', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/push', pushRoutes);

// Base Route
app.get('/', (_req: Request, res: Response) => {
  res.send('Life Director API is running.');
});

// Socket.io Real-Time Focus Session Synchronization
setupFocusSocket(io);

import { startScheduler } from './jobs/scheduler';
import { runDailyDigest } from './jobs/dailyDigest';

// Dev test endpoint — POST /api/admin/trigger-digest (no auth, dev only)
app.post('/api/admin/trigger-digest', async (_req: Request, res: Response) => {
  try {
    await runDailyDigest();
    return res.status(200).json({ message: 'Daily digest compilation triggered successfully.' });
  } catch (error: any) {
    console.error('Trigger digest error:', error);
    return res.status(500).json({ error: 'Failed triggering digest engine' });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startScheduler();
});

export default app;
