import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma/prisma';
import { startOfDay, subDays, format, endOfDay } from 'date-fns';

export const logSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { taskId, taskTitle, duration, mode, rounds } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!duration || duration <= 0) {
      return res.status(400).json({ error: 'Valid focus duration is required' });
    }

    const session = await prisma.focusSession.create({
      data: {
        userId,
        taskId: taskId || null,
        taskTitle: taskTitle || null,
        duration: parseInt(duration),
        mode: mode || 'pomodoro',
        rounds: rounds ? parseInt(rounds) : 1,
      },
    });

    return res.status(201).json(session);
  } catch (error: any) {
    console.error('Log focus session error:', error);
    return res.status(500).json({ error: 'Server error logging focus session' });
  }
};

export const getSessions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const sessions = await prisma.focusSession.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.focusSession.count({ where: { userId } });

    return res.status(200).json({
      sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get focus sessions error:', error);
    return res.status(500).json({ error: 'Server error retrieving sessions' });
  }
};

export const deleteSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.focusSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Focus session not found' });
    }

    await prisma.focusSession.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Focus session deleted successfully' });
  } catch (error: any) {
    console.error('Delete focus session error:', error);
    return res.status(500).json({ error: 'Server error deleting focus session' });
  }
};

export const getFocusStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const sevenDaysAgo = subDays(todayStart, 6);

    // 1. All-time stats
    const allSessions = await prisma.focusSession.findMany({ where: { userId } });
    const totalMinutesAllTime = allSessions.reduce((sum, s) => sum + s.duration, 0);

    // Longest session ever
    let longestSessionEver = 0;
    if (allSessions.length > 0) {
      longestSessionEver = Math.max(...allSessions.map(s => s.duration));
    }

    // 2. Today's stats
    const todaySessions = allSessions.filter(
      s => s.completedAt >= todayStart && s.completedAt <= todayEnd
    );
    const totalMinutesToday = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    const sessionsCountToday = todaySessions.length;

    // 3. Weekly stats (last 7 days)
    const weeklySessions = allSessions.filter(s => s.completedAt >= sevenDaysAgo);
    const totalMinutesWeek = weeklySessions.reduce((sum, s) => sum + s.duration, 0);

    // Group weekly sessions by day
    const weeklySummary = Array.from({ length: 7 }).map((_, i) => {
      const day = subDays(todayStart, 6 - i);
      const dayStr = day.toISOString().split('T')[0];
      const minutes = weeklySessions
        .filter(s => s.completedAt.toISOString().split('T')[0] === dayStr)
        .reduce((acc, s) => acc + s.duration, 0);
      return {
        date: dayStr,
        label: format(day, 'EEE'),
        minutes,
      };
    });

    // 4. Focus Streak (consecutive days with at least 1 focus session)
    let focusStreak = 0;
    let checkDay = startOfDay(new Date());
    let streakBroken = false;
    let daysBack = 0;

    while (daysBack < 365 && !streakBroken) {
      const nextDay = new Date(checkDay.getTime() + 24 * 60 * 60 * 1000);
      const sessionCount = allSessions.filter(
        s => s.completedAt >= checkDay && s.completedAt < nextDay
      ).length;

      if (sessionCount > 0) {
        focusStreak++;
      } else {
        if (daysBack > 0) {
          // Streak broken if yesterday or older had no session
          streakBroken = true;
        }
      }
      daysBack++;
      checkDay = subDays(startOfDay(new Date()), daysBack);
    }

    // 5. Top 5 tasks focused on (by total minutes)
    const taskMap = new Map<string, number>();
    allSessions.forEach(s => {
      const title = s.taskTitle || 'Unassigned Focus';
      taskMap.set(title, (taskMap.get(title) || 0) + s.duration);
    });

    const top5Tasks = Array.from(taskMap.entries())
      .map(([taskTitle, minutes]) => ({ taskTitle, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    return res.status(200).json({
      totalMinutesToday,
      totalMinutesWeek,
      totalMinutesAllTime,
      longestSessionEver,
      sessionsCountToday,
      focusStreak,
      weeklySummary,
      top5Tasks,
    });
  } catch (error: any) {
    console.error('Get focus stats error:', error);
    return res.status(500).json({ error: 'Server error retrieving focus stats' });
  }
};
