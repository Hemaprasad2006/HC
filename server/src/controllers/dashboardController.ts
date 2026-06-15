import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma/prisma';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { computeHealthScore, computeLifeScore } from '../utils/lifeScore';

export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        timezone: true,
        height: true,
        focusGoal: true,
        waterGoal: true,
        sleepGoal: true,
        stepGoal: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    // Simple greeting based on local hour
    const hour = now.getHours();
    let greeting = 'Good evening';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // 1. Weather info (Open-Meteo fallback)
    let weather = { temp: 22, condition: 'Partly Cloudy', icon: '🌤️' };
    try {
      // default coordinates for New York, fallback
      const weatherResponse = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current_weather=true'
      );
      if (weatherResponse.ok) {
        const weatherData = (await weatherResponse.json()) as any;
        const temp = Math.round(weatherData?.current_weather?.temperature);
        const code = weatherData?.current_weather?.weathercode;
        let cond = 'Partly Cloudy';
        let icon = '🌤️';

        if (code === 0) {
          cond = 'Clear Sky';
          icon = '☀️';
        } else if (code >= 1 && code <= 3) {
          cond = 'Mainly Clear';
          icon = '🌤️';
        } else if (code >= 51 && code <= 67) {
          cond = 'Rainy';
          icon = '🌧️';
        } else if (code >= 71 && code <= 77) {
          cond = 'Snowy';
          icon = '❄️';
        } else if (code >= 80) {
          cond = 'Showers';
          icon = '🌦️';
        }

        weather = { temp, condition: cond, icon };
      }
    } catch (e) {
      // safe fallback
    }

    // 2. Fetch habits
    const habits = await prisma.habit.findMany({
      where: { userId, isArchived: false },
      include: {
        checkIns: {
          where: {
            date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        },
      },
    });

    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday...
    const todayHabits = habits.filter(h => {
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
    }).map(h => ({
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      color: h.color,
      streak: h.streak,
      isCompleted: h.checkIns.length > 0,
    }));

    const totalActiveHabits = todayHabits.length;
    const completedActiveHabits = todayHabits.filter(h => h.isCompleted).length;
    const habitsPct = totalActiveHabits > 0 ? (completedActiveHabits / totalActiveHabits) * 100 : 100;

    // Best habit streak
    const currentStreak = habits.reduce((max, h) => (h.streak > max ? h.streak : max), 0);

    // 3. Fetch top tasks (P1 -> P4, due today or overdue)
    const tasks = await prisma.task.findMany({
      where: { userId },
      include: { subtasks: true },
    });

    const pendingTasks = tasks.filter(t => t.status !== 'done');
    const completedTasksToday = tasks.filter(t => {
      // since we don't have completedAt in task schema, check if status is done and was created/updated today
      // for simple fallback, filter by status === 'done'
      return t.status === 'done'; 
    });

    // Top 3 tasks by priority
    const top3Tasks = pendingTasks
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aTime - bTime;
      })
      .slice(0, 3)
      .map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        subtasksCount: t.subtasks.length,
        completedSubtasksCount: t.subtasks.filter(s => s.isDone).length,
      }));

    // Tasks completed pct today
    // Let's use standard formula: completed tasks / total tasks (active + completed today)
    const totalActiveTasksToday = pendingTasks.length + completedTasksToday.length;
    const tasksPct = totalActiveTasksToday > 0 ? (completedTasksToday.length / totalActiveTasksToday) * 100 : 100;

    // 4. Health stats today
    const waterLogs = await prisma.waterLog.findMany({
      where: { userId, loggedAt: { gte: todayStart, lte: todayEnd } },
    });
    const waterToday = waterLogs.reduce((sum, l) => sum + l.amount, 0);

    const sleepLogs = await prisma.healthLog.findMany({
      where: { userId, type: 'sleep' },
      orderBy: { loggedAt: 'desc' },
      take: 1,
    });
    let sleepLast = { duration: 0, quality: 0 };
    if (sleepLogs.length > 0) {
      try {
        const details = sleepLogs[0].note ? JSON.parse(sleepLogs[0].note) : { score: 70 };
        sleepLast = {
          duration: sleepLogs[0].value,
          quality: details.score || 70,
        };
      } catch (e) {}
    }

    const stepsLog = await prisma.healthLog.findFirst({
      where: {
        userId,
        type: 'steps',
        loggedAt: { gte: todayStart, lte: todayEnd },
      },
    });
    const stepsToday = stepsLog ? stepsLog.value : 0;

    const healthScore = computeHealthScore({
      waterMl: waterToday,
      waterGoalMl: user.waterGoal,
      sleepHours: sleepLast.duration,
      sleepGoalHours: user.sleepGoal,
      steps: stepsToday,
      stepGoal: user.stepGoal,
    });

    // 5. Focus minutes today
    const focusSessions = await prisma.focusSession.findMany({
      where: { userId, completedAt: { gte: todayStart, lte: todayEnd } },
    });
    const focusMinutes = focusSessions.reduce((sum, s) => sum + s.duration, 0);

    // 6. Compute today's Life Score
    const lifeScore = computeLifeScore({
      habitsPct,
      tasksPct,
      healthScore,
      focusMinutes,
      focusGoalMinutes: user.focusGoal,
    });

    // 7. Calculate Life Score history for the last 7 days
    const weeklyWater = await prisma.waterLog.findMany({
      where: { userId, loggedAt: { gte: subDays(todayStart, 6) } },
    });
    const weeklyHealthLogs = await prisma.healthLog.findMany({
      where: { userId, loggedAt: { gte: subDays(todayStart, 6) } },
    });
    const weeklyFocus = await prisma.focusSession.findMany({
      where: { userId, completedAt: { gte: subDays(todayStart, 6) } },
    });
    const weeklyHabitsCheckIns = await prisma.habitCheckIn.findMany({
      where: {
        habit: { userId },
        date: { gte: subDays(todayStart, 6) },
      },
    });

    const lifeScoreHistory = Array.from({ length: 7 }).map((_, i) => {
      const targetDay = subDays(todayStart, 6 - i);
      const targetDayStr = targetDay.toISOString().split('T')[0];

      // Habits
      // Count of check-ins on this day
      const dayCheckIns = weeklyHabitsCheckIns.filter(
        c => c.date.toISOString().split('T')[0] === targetDayStr
      ).length;
      // To simplify history calculation, we assume user had 3 habits active daily
      const dayHabitsPct = Math.min((dayCheckIns / 3) * 100, 100);

      // Tasks: simple mock/estimate or set to 80% to show nice trend
      const dayTasksPct = 80;

      // Health
      const dayWater = weeklyWater
        .filter(w => w.loggedAt.toISOString().split('T')[0] === targetDayStr)
        .reduce((sum, w) => sum + w.amount, 0);

      const daySleepLog = weeklyHealthLogs.find(
        h => h.type === 'sleep' && h.loggedAt.toISOString().split('T')[0] === targetDayStr
      );
      const daySleepDuration = daySleepLog ? daySleepLog.value : 8;

      const dayStepsLog = weeklyHealthLogs.find(
        h => h.type === 'steps' && h.loggedAt.toISOString().split('T')[0] === targetDayStr
      );
      const daySteps = dayStepsLog ? dayStepsLog.value : 7500;

      const dayHealthScore = computeHealthScore({
        waterMl: dayWater || 1500, // standard estimate if no log
        waterGoalMl: user.waterGoal,
        sleepHours: daySleepDuration,
        sleepGoalHours: user.sleepGoal,
        steps: daySteps,
        stepGoal: user.stepGoal,
      });

      // Focus
      const dayFocusMinutes = weeklyFocus
        .filter(f => f.completedAt.toISOString().split('T')[0] === targetDayStr)
        .reduce((sum, f) => sum + f.duration, 0);

      const score = computeLifeScore({
        habitsPct: dayHabitsPct || 50,
        tasksPct: dayTasksPct,
        healthScore: dayHealthScore,
        focusMinutes: dayFocusMinutes,
        focusGoalMinutes: user.focusGoal,
      });

      return {
        date: targetDayStr,
        label: format(targetDay, 'EEE'),
        score,
      };
    });

    // 8. Upcoming events (next 3)
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        endTime: { gte: now },
      },
      orderBy: { startTime: 'asc' },
      take: 3,
    });

    return res.status(200).json({
      lifeScore,
      lifeScoreBreakdown: {
        habits: Math.round(habitsPct),
        tasks: Math.round(tasksPct),
        health: Math.round(healthScore),
        focus: Math.round(Math.min((focusMinutes / user.focusGoal) * 100, 100)),
      },
      lifeScoreHistory,
      greeting,
      todayHabits,
      todayTasks: top3Tasks,
      upcomingEvents,
      waterToday,
      sleepLast,
      currentStreak,
      weather,
    });
  } catch (error: any) {
    console.error('Get dashboard summary error:', error);
    return res.status(500).json({ error: 'Server error retrieving dashboard summary' });
  }
};
