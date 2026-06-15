import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma/prisma';
import { startOfDay, subDays, endOfDay, format } from 'date-fns';

export const getDashboardData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // 1. Pinned Focus Task (top P1 task or most recent incomplete task)
    const pinnedTask = await prisma.task.findFirst({
      where: { userId, status: { not: 'done' } },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
      include: { subtasks: true },
    });

    // 2. Habits Completion Ring %
    const habits = await prisma.habit.findMany({
      where: { userId, isArchived: false },
      include: {
        checkIns: {
          where: { date: { gte: dayStart, lte: dayEnd } },
        },
      },
    });

    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon...
    const scheduledHabits = habits.filter(h => {
      if (h.frequency === 'daily') return true;
      if (h.frequency === 'weekly') return true;
      if (h.frequency === 'custom') {
        try {
          const days: number[] = JSON.parse(h.customDays);
          return days.includes(dayOfWeek);
        } catch (e) {
          return false;
        }
      }
      return true;
    });

    const totalScheduled = scheduledHabits.length;
    const completedScheduled = scheduledHabits.filter(h => h.checkIns.length > 0).length;
    const habitsCompletionRate = totalScheduled > 0 ? (completedScheduled / totalScheduled) * 100 : 100;

    // 3. Water Intake today
    const waterLogs = await prisma.waterLog.findMany({
      where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } },
    });
    const totalWater = waterLogs.reduce((sum, l) => sum + l.amount, 0);
    const waterGoal = 2000;
    const waterRate = Math.min((totalWater / waterGoal) * 100, 100);

    // 4. Sleep today
    const sleepLog = await prisma.healthLog.findFirst({
      where: { userId, type: 'sleep', loggedAt: { gte: dayStart, lte: dayEnd } },
    });
    let sleepScore = 70; // default average sleep quality
    if (sleepLog && sleepLog.note) {
      try {
        sleepScore = JSON.parse(sleepLog.note).score || 70;
      } catch (e) {}
    }

    // 5. Tasks done today
    const tasksDoneToday = await prisma.task.count({
      where: { userId, status: 'done', dueDate: { gte: dayStart, lte: dayEnd } },
    });
    const tasksTotalToday = await prisma.task.count({
      where: { userId, dueDate: { gte: dayStart, lte: dayEnd } },
    });
    const tasksRate = tasksTotalToday > 0 ? (tasksDoneToday / tasksTotalToday) * 100 : (tasksDoneToday > 0 ? 100 : 0);

    // 6. Calculate Life Score (0-100 composite)
    // Formula: (habits% + water% + sleep% + tasksDoneRate%) / 4
    // If no tasks are due today, we exclude or weight tasks as 100% if done > 0, else 100% if none.
    const compositeLifeScore = Math.round((habitsCompletionRate + waterRate + sleepScore + (tasksTotalToday > 0 ? tasksRate : 80)) / 4);

    // 7. Calculate 7-day Weekly Trend Chart data for Life Score
    const weeklyTrend = await Promise.all(
      Array.from({ length: 7 }).map(async (_, i) => {
        const checkDay = subDays(dayStart, 6 - i);
        const checkDayEnd = endOfDay(checkDay);
        const checkDayOfWeek = checkDay.getDay();

        // Habits
        const habitsAtDay = await prisma.habit.findMany({
          where: { userId, isArchived: false },
          include: {
            checkIns: { where: { date: { gte: checkDay, lte: checkDayEnd } } },
          },
        });
        const scheduledAtDay = habitsAtDay.filter(h => {
          if (h.frequency === 'daily') return true;
          if (h.frequency === 'weekly') return true;
          if (h.frequency === 'custom') {
            try {
              return JSON.parse(h.customDays).includes(checkDayOfWeek);
            } catch (e) { return false; }
          }
          return true;
        });
        const habitsRate = scheduledAtDay.length > 0
          ? (scheduledAtDay.filter(h => h.checkIns.length > 0).length / scheduledAtDay.length) * 100
          : 100;

        // Water
        const waterAtDay = await prisma.waterLog.findMany({
          where: { userId, loggedAt: { gte: checkDay, lte: checkDayEnd } },
        });
        const waterSum = waterAtDay.reduce((sum, w) => sum + w.amount, 0);
        const waterPct = Math.min((waterSum / waterGoal) * 100, 100);

        // Sleep
        const sleepAtDay = await prisma.healthLog.findFirst({
          where: { userId, type: 'sleep', loggedAt: { gte: checkDay, lte: checkDayEnd } },
        });
        let sleepPct = 70;
        if (sleepAtDay && sleepAtDay.note) {
          try { sleepPct = JSON.parse(sleepAtDay.note).score || 70; } catch (e) {}
        }

        // Tasks
        const totalTasksAtDay = await prisma.task.count({
          where: { userId, dueDate: { gte: checkDay, lte: checkDayEnd } },
        });
        const doneTasksAtDay = await prisma.task.count({
          where: { userId, status: 'done', dueDate: { gte: checkDay, lte: checkDayEnd } },
        });
        const taskPct = totalTasksAtDay > 0 ? (doneTasksAtDay / totalTasksAtDay) * 100 : (doneTasksAtDay > 0 ? 100 : 80);

        const score = Math.round((habitsRate + waterPct + sleepPct + taskPct) / 4);

        return {
          date: format(checkDay, 'yyyy-MM-dd'),
          label: format(checkDay, 'EEE'),
          lifeScore: score,
        };
      })
    );

    // 8. Upcoming Calendar Events (next 3)
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: { userId, startTime: { gte: dayStart } },
      orderBy: { startTime: 'asc' },
      take: 3,
    });

    // 9. Active Focus Session status (recent stopwatch / pomodoro session summary)
    const activeFocusSession = await prisma.focusSession.findFirst({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    // 10. Streaks summary
    const maxHabitStreak = habits.reduce((max, h) => (h.streak > max ? h.streak : max), 0);

    // 11. Rotating motivational quotes (rotates daily based on date index)
    const quotes = [
      { text: "Your life does not get better by chance, it gets better by change.", author: "Jim Rohn" },
      { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
      { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
      { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
      { text: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon" },
    ];
    const quoteIndex = new Date().getDate() % quotes.length;
    const dailyQuote = quotes[quoteIndex];

    return res.status(200).json({
      greeting: getGreeting(user.name),
      lifeScore: compositeLifeScore,
      habitsRate: Math.round(habitsCompletionRate),
      waterRate: Math.round(waterRate),
      sleepScore,
      pinnedTask,
      weeklyTrend,
      upcomingEvents,
      activeFocusSession,
      streak: maxHabitStreak,
      quote: dailyQuote,
    });
  } catch (error: any) {
    console.error('Get dashboard details error:', error);
    return res.status(500).json({ error: 'Server error compiling dashboard' });
  }
};

const getGreeting = (name: string): string => {
  const hr = new Date().getHours();
  if (hr < 12) return `Good morning, ${name} 🌅`;
  if (hr < 18) return `Good afternoon, ${name} ☀️`;
  return `Good evening, ${name} 🌌`;
};

export const getWeeklyReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const today = new Date();
    const startOfWeekDate = subDays(startOfDay(today), 6); // past 7 days review

    // 1. Habits Completed this week
    const checkInsThisWeek = await prisma.habitCheckIn.count({
      where: {
        habit: { userId },
        date: { gte: startOfWeekDate },
      },
    });

    // 2. Streaks Summary
    const habits = await prisma.habit.findMany({
      where: { userId, isArchived: false },
    });
    const maxStreak = habits.reduce((max, h) => (h.streak > max ? h.streak : max), 0);
    const totalHabitsCount = habits.length;

    // 3. Health Trends (water, sleep, steps)
    const waterLogs = await prisma.waterLog.findMany({
      where: { userId, loggedAt: { gte: startOfWeekDate } },
    });
    const avgWater = waterLogs.length > 0
      ? Math.round(waterLogs.reduce((sum, l) => sum + l.amount, 0) / 7)
      : 0;

    const sleepLogs = await prisma.healthLog.findMany({
      where: { userId, type: 'sleep', loggedAt: { gte: startOfWeekDate } },
    });
    const avgSleep = sleepLogs.length > 0
      ? parseFloat((sleepLogs.reduce((sum, l) => sum + l.value, 0) / sleepLogs.length).toFixed(1))
      : 0;

    const stepsLogs = await prisma.healthLog.findMany({
      where: { userId, type: 'steps', loggedAt: { gte: startOfWeekDate } },
    });
    const avgSteps = stepsLogs.length > 0
      ? Math.round(stepsLogs.reduce((sum, l) => sum + l.value, 0) / 7)
      : 0;

    // 4. Focus details
    const focusSessions = await prisma.focusSession.findMany({
      where: { userId, completedAt: { gte: startOfWeekDate } },
    });
    const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + s.duration, 0);

    const focusMinutesByDay = Array.from({ length: 7 }).map((_, i) => {
      const day = subDays(startOfDay(today), 6 - i);
      const dayStr = day.toISOString().split('T')[0];
      const minutes = focusSessions
        .filter(s => s.completedAt.toISOString().split('T')[0] === dayStr)
        .reduce((sum, s) => sum + s.duration, 0);
      return {
        date: dayStr,
        label: format(day, 'EEE'),
        minutes,
      };
    });

    return res.status(200).json({
      weekStart: format(startOfWeekDate, 'MMM dd'),
      weekEnd: format(today, 'MMM dd, yyyy'),
      habitsCompleted: checkInsThisWeek,
      totalHabits: totalHabitsCount,
      bestStreak: maxStreak,
      healthAverages: {
        water: avgWater,
        sleep: avgSleep,
        steps: avgSteps,
      },
      focusMinutes: totalFocusMinutes,
      focusSessionsCount: focusSessions.length,
      focusMinutesByDay,
    });
  } catch (error: any) {
    console.error('Weekly review compile error:', error);
    return res.status(500).json({ error: 'Server error generating weekly review' });
  }
};
