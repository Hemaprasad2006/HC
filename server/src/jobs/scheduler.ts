import cron from 'node-cron';
import prisma from '../prisma/prisma';
import { runDailyDigest } from './dailyDigest';
import { sendPushToUser } from '../controllers/pushController';
import { startOfDay, endOfDay } from 'date-fns';

// Helper to get local time HH:MM format given user timezone
function getLocalTimeStr(timezone: string): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const formatter = new Intl.DateTimeFormat([], options);
    return formatter.format(new Date()); // e.g. "08:15"
  } catch (e) {
    // fallback
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
}

export function startScheduler() {
  console.log('[Scheduler] Initializing Life Director cron jobs...');

  // 1. Daily Digest at 8:00 AM server time
  cron.schedule('0 8 * * *', async () => {
    try {
      await runDailyDigest();
    } catch (e) {
      console.error('[Scheduler] Error running daily digest cron:', e);
    }
  });

  // 2. Water Reminders every 2 hours between 8:00 AM and 10:00 PM server time
  cron.schedule('0 8-22/2 * * *', async () => {
    try {
      console.log('[Scheduler] Dispatching water intake reminders...');
      const users = await prisma.user.findMany();
      for (const user of users) {
        await sendPushToUser(user.id, {
          title: 'Stay Hydrated! 💧',
          body: 'Remember to drink a glass of water to meet your daily target!',
          url: '/health',
        });
      }
    } catch (e) {
      console.error('[Scheduler] Error running water reminder cron:', e);
    }
  });

  // 3. Streak at risk warning check at 11:00 PM server time
  cron.schedule('0 23 * * *', async () => {
    try {
      console.log('[Scheduler] Running streak at risk checks...');
      const users = await prisma.user.findMany();
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const dayOfWeek = new Date().getDay();

      for (const user of users) {
        const habits = await prisma.habit.findMany({
          where: { userId: user.id, isArchived: false },
          include: {
            checkIns: {
              where: { date: { gte: todayStart, lte: todayEnd } },
            },
            // check if they used a freeze today
            user: {
              select: {
                streakFreezeLogs: {
                  where: { date: { gte: todayStart, lte: todayEnd } },
                },
              },
            },
          },
        });

        // Habits active today which are NOT checked in and NOT frozen today
        const uncheckedHabits = habits.filter(h => {
          if (h.checkIns.length > 0) return false;
          // check if frozen
          const isFrozen = h.user.streakFreezeLogs.some(f => f.habitId === h.id);
          if (isFrozen) return false;

          if (h.frequency === 'daily') return true;
          if (h.frequency === 'weekly') return true;
          if (h.frequency === 'custom') {
            const days: number[] = h.customDays || [];
            return days.includes(dayOfWeek);
          }
          return true;
        });

        if (uncheckedHabits.length > 0) {
          await sendPushToUser(user.id, {
            title: 'Streak at Risk! 🔥⚠️',
            body: `You have ${uncheckedHabits.length} habits unchecked today. Check them in now or use a Streak Freeze to preserve your streak!`,
            url: '/habits',
          });
        }
      }
    } catch (e) {
      console.error('[Scheduler] Error running streak warning cron:', e);
    }
  });

  // 4. Habit reminder time checks running every minute
  cron.schedule('* * * * *', async () => {
    try {
      const habits = await prisma.habit.findMany({
        where: {
          isArchived: false,
          reminderTime: { not: null },
        },
        include: { user: true },
      });

      for (const habit of habits) {
        if (!habit.reminderTime) continue;
        const userTime = getLocalTimeStr(habit.user.timezone); // e.g. "14:30"
        
        // Exact match check
        if (userTime === habit.reminderTime) {
          await sendPushToUser(habit.userId, {
            title: `🧘 Habit Reminder: ${habit.name}`,
            body: `It's time for your scheduled habit: ${habit.emoji} ${habit.name}!`,
            url: '/habits',
          });
        }
      }
    } catch (e) {
      console.error('[Scheduler] Error running habit reminder checks:', e);
    }
  });
}
