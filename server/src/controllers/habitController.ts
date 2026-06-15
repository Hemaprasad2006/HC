import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma/prisma';
import { startOfDay, subDays, isSameDay } from 'date-fns';
import { sendPushToUser } from './pushController';

// Helper to parse habit model customDays from string to array
const formatHabit = (habit: any) => {
  return {
    ...habit,
    customDays: habit.customDays ? JSON.parse(habit.customDays) : [],
  };
};

export const getHabits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const habits = await prisma.habit.findMany({
      where: { userId, isArchived: false },
      include: {
        checkIns: {
          orderBy: { date: 'desc' },
        },
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { remainingFreezes: true },
    });

    const formattedHabits = habits.map(formatHabit);

    return res.status(200).json({
      habits: formattedHabits,
      remainingFreezes: user?.remainingFreezes || 0,
    });
  } catch (error: any) {
    console.error('Get habits error:', error);
    return res.status(500).json({ error: 'Server error retrieving habits' });
  }
};

export const createHabit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, emoji, color, category, frequency, customDays, reminderTime } = req.body;

    if (!name || !emoji || !color || !category || !frequency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const customDaysStr = JSON.stringify(customDays || []);

    const newHabit = await prisma.habit.create({
      data: {
        userId,
        name,
        emoji,
        color,
        category,
        frequency,
        customDays: customDaysStr,
        reminderTime,
        streak: 0,
        longestStreak: 0,
      },
    });

    return res.status(201).json(formatHabit(newHabit));
  } catch (error: any) {
    console.error('Create habit error:', error);
    return res.status(500).json({ error: 'Server error creating habit' });
  }
};

export const updateHabit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { name, emoji, color, category, frequency, customDays, reminderTime, isArchived } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const habit = await prisma.habit.findFirst({ where: { id, userId } });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (color !== undefined) updateData.color = color;
    if (category !== undefined) updateData.category = category;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (customDays !== undefined) updateData.customDays = JSON.stringify(customDays);
    if (reminderTime !== undefined) updateData.reminderTime = reminderTime;
    if (isArchived !== undefined) updateData.isArchived = isArchived;

    const updated = await prisma.habit.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json(formatHabit(updated));
  } catch (error: any) {
    console.error('Update habit error:', error);
    return res.status(500).json({ error: 'Server error updating habit' });
  }
};

export const deleteHabit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const habit = await prisma.habit.findFirst({ where: { id, userId } });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    await prisma.habit.delete({ where: { id } });

    return res.status(200).json({ message: 'Habit deleted successfully' });
  } catch (error: any) {
    console.error('Delete habit error:', error);
    return res.status(500).json({ error: 'Server error deleting habit' });
  }
};

// Recalculates streaks for a habit based on check-ins and freeze logs
const recalculateHabitStreaks = async (habitId: string, userId: string) => {
  const checkIns = await prisma.habitCheckIn.findMany({
    where: { habitId },
    orderBy: { date: 'desc' },
  });

  const freezeLogs = await prisma.streakFreezeLog.findMany({
    where: { habitId, userId },
    orderBy: { date: 'desc' },
  });

  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!habit) return { streak: 0, longestStreak: 0 };

  const parsedCustomDays: number[] = habit.customDays ? JSON.parse(habit.customDays) : [];
  const completedDates = checkIns.map(c => startOfDay(new Date(c.date)));
  const frozenDates = freezeLogs.map(f => startOfDay(new Date(f.date)));

  let currentStreak = 0;
  let maxStreak = habit.longestStreak;
  let checkDate = startOfDay(new Date());

  // Determine if streak is still active.
  // A streak can remain active if the check-in is done today, yesterday, or a freeze is applied.
  // Also, if a habit is not scheduled for today, we check yesterday.
  const isScheduled = (date: Date) => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') return true; // Weekly checks are handled differently, but we can treat as daily check
    if (habit.frequency === 'custom') {
      const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon...
      return parsedCustomDays.includes(dayOfWeek);
    }
    return true;
  };

  // Find the start date for streak validation
  let dayOffset = 0;

  // Let's count back to see if the streak is active.
  // If no check-in today and no check-in yesterday, and no freeze on both, and they were scheduled days, then streak is 0.
  let daysValidated = 0;
  
  // Backwards loop
  while (daysValidated < 365) { // max 1 year search
    const isToday = dayOffset === 0;
    const scheduled = isScheduled(checkDate);

    const hasCheckedIn = completedDates.some(d => isSameDay(d, checkDate));
    const hasFrozen = frozenDates.some(d => isSameDay(d, checkDate));

    if (scheduled) {
      if (hasCheckedIn || hasFrozen) {
        currentStreak++;
      } else {
        // If it's today and not checked in yet, the streak is NOT broken yet (user still has time).
        // If it's before today, the streak is broken.
        if (!isToday) {
          break;
        }
      }
    } else {
      // If not scheduled, it doesn't break the streak, but we do not increment the counter
    }

    dayOffset++;
    checkDate = subDays(startOfDay(new Date()), dayOffset);
    daysValidated++;
  }

  // Calculate the maximum streak in the full history
  let calculatedMaxStreak = 0;
  let tempStreak = 0;
  let searchDate = startOfDay(new Date());
  
  for (let i = 0; i < 365; i++) {
    const sDate = subDays(searchDate, i);
    const scheduled = isScheduled(sDate);
    const hasCheckedIn = completedDates.some(d => isSameDay(d, sDate));
    const hasFrozen = frozenDates.some(d => isSameDay(d, sDate));

    if (scheduled) {
      if (hasCheckedIn || hasFrozen) {
        tempStreak++;
        if (tempStreak > calculatedMaxStreak) {
          calculatedMaxStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }
  }

  if (calculatedMaxStreak > maxStreak) {
    maxStreak = calculatedMaxStreak;
  }

  // Update habit records
  await prisma.habit.update({
    where: { id: habitId },
    data: {
      streak: currentStreak,
      longestStreak: maxStreak,
    },
  });

  return { streak: currentStreak, longestStreak: maxStreak };
};

export const checkInHabit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { date, note } = req.body; // date in format YYYY-MM-DD

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const habit = await prisma.habit.findFirst({ where: { id, userId } });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const checkInDate = startOfDay(date ? new Date(date) : new Date());

    // Check if check-in already exists for this day
    const existingCheckIn = await prisma.habitCheckIn.findFirst({
      where: {
        habitId: id,
        date: {
          gte: checkInDate,
          lt: new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingCheckIn) {
      // Toggle off check-in if clicked again (standard UI check-in undo)
      await prisma.habitCheckIn.delete({ where: { id: existingCheckIn.id } });
      const stats = await recalculateHabitStreaks(id, userId);
      return res.status(200).json({ checkedIn: false, ...stats });
    }

    // Add check-in
    await prisma.habitCheckIn.create({
      data: {
        habitId: id,
        date: checkInDate,
        note,
      },
    });

    const stats = await recalculateHabitStreaks(id, userId);

    // Check if a streak milestone was achieved: 7, 14, 30, 100
    let milestoneAchieved = null;
    if ([7, 14, 30, 100].includes(stats.streak)) {
      milestoneAchieved = stats.streak;

      // Save notification in database
      await prisma.notification.create({
        data: {
          userId,
          title: 'Streak Milestone Achieved! 🎉',
          body: `Incredible! You hit a ${stats.streak}-day streak on ${habit.name}!`,
          type: 'milestone',
          isRead: false,
        },
      });

      // Send push notification
      await sendPushToUser(userId, {
        title: 'Streak Milestone Achieved! 🎉',
        body: `Incredible! You hit a ${stats.streak}-day streak on ${habit.name}!`,
        url: '/habits',
      }).catch(e => console.error('Error sending milestone push:', e));
    }

    return res.status(200).json({ checkedIn: true, ...stats, milestoneAchieved });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return res.status(500).json({ error: 'Server error during check-in' });
  }
};

export const freezeHabitStreak = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { date } = req.body; // Date to freeze (usually yesterday or today)

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.remainingFreezes <= 0) {
      return res.status(400).json({ error: 'No streak freezes remaining this week' });
    }

    const habit = await prisma.habit.findFirst({ where: { id, userId } });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const freezeDate = startOfDay(date ? new Date(date) : new Date());

    // Check if check-in or freeze already exists for this date
    const existingCheckIn = await prisma.habitCheckIn.findFirst({
      where: {
        habitId: id,
        date: {
          gte: freezeDate,
          lt: new Date(freezeDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingCheckIn) {
      return res.status(400).json({ error: 'Habit is already checked in for this date' });
    }

    const existingFreeze = await prisma.streakFreezeLog.findFirst({
      where: {
        habitId: id,
        userId,
        date: {
          gte: freezeDate,
          lt: new Date(freezeDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingFreeze) {
      return res.status(400).json({ error: 'Streak is already frozen for this date' });
    }

    // Deduct freeze and write freeze log
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { remainingFreezes: { decrement: 1 } },
      }),
      prisma.streakFreezeLog.create({
        data: {
          userId,
          habitId: id,
          date: freezeDate,
        },
      }),
    ]);

    const stats = await recalculateHabitStreaks(id, userId);

    return res.status(200).json({
      message: 'Streak frozen successfully',
      remainingFreezes: user.remainingFreezes - 1,
      ...stats,
    });
  } catch (error: any) {
    console.error('Freeze streak error:', error);
    return res.status(500).json({ error: 'Server error freezing streak' });
  }
};

export const getHabitHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const habit = await prisma.habit.findFirst({
      where: { id, userId },
      include: {
        checkIns: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const freezeLogs = await prisma.streakFreezeLog.findMany({
      where: { habitId: id, userId },
      orderBy: { date: 'asc' },
    });

    return res.status(200).json({
      habit: formatHabit(habit),
      checkIns: habit.checkIns,
      freezes: freezeLogs,
    });
  } catch (error: any) {
    console.error('Get habit history error:', error);
    return res.status(500).json({ error: 'Server error retrieving history' });
  }
};
