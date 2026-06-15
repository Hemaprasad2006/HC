import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma/prisma';
import { startOfDay, subDays, endOfDay, format } from 'date-fns';
import { computeHealthScore } from '../utils/lifeScore';

// Helper for formatting date strings in UTC
const formatDate = (date: Date) => {
  return format(date, 'yyyy-MM-dd');
};

// GET /api/health/water -> today's water logs + total ml
export const getWater = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const logs = await prisma.waterLog.findMany({
      where: {
        userId,
        loggedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { loggedAt: 'asc' },
    });

    const total = logs.reduce((acc, log) => acc + log.amount, 0);

    return res.status(200).json({ logs, total });
  } catch (error: any) {
    console.error('Get water log error:', error);
    return res.status(500).json({ error: 'Server error retrieving water logs' });
  }
};

// POST /api/health/water -> log water
export const logWater = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { amount, date } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid water amount is required' });
    }

    const logDate = date ? new Date(date) : new Date();

    const log = await prisma.waterLog.create({
      data: {
        userId,
        amount: parseFloat(amount),
        loggedAt: logDate,
      },
    });

    return res.status(201).json(log);
  } catch (error: any) {
    console.error('Log water error:', error);
    return res.status(500).json({ error: 'Server error logging water' });
  }
};

// GET /api/health/water/history -> last 7 days daily totals
export const getWaterHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const todayStart = startOfDay(new Date());
    const startDate = subDays(todayStart, 6);

    const weeklyLogs = await prisma.waterLog.findMany({
      where: {
        userId,
        loggedAt: { gte: startDate },
      },
    });

    const history = Array.from({ length: 7 }).map((_, i) => {
      const targetDay = subDays(todayStart, 6 - i);
      const targetDayStr = formatDate(targetDay);
      const dayTotal = weeklyLogs
        .filter(l => formatDate(new Date(l.loggedAt)) === targetDayStr)
        .reduce((sum, l) => sum + l.amount, 0);

      return {
        date: targetDayStr,
        label: format(targetDay, 'EEE'),
        amount: dayTotal,
      };
    });

    return res.status(200).json(history);
  } catch (error: any) {
    console.error('Get water history error:', error);
    return res.status(500).json({ error: 'Server error retrieving water history' });
  }
};

// GET /api/health/sleep -> get last 7 sleep logs
export const getSleep = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const sleepLogs = await prisma.healthLog.findMany({
      where: {
        userId,
        type: 'sleep',
      },
      orderBy: { loggedAt: 'desc' },
      take: 7,
    });

    const formattedSleepLogs = sleepLogs.map(log => {
      let details = { bedtime: null, wakeTime: null, score: 70 };
      try {
        if (log.note) details = JSON.parse(log.note);
      } catch (e) {}
      return {
        id: log.id,
        duration: log.value,
        loggedAt: log.loggedAt,
        ...details,
      };
    });

    return res.status(200).json(formattedSleepLogs);
  } catch (error: any) {
    console.error('Get sleep error:', error);
    return res.status(500).json({ error: 'Server error retrieving sleep logs' });
  }
};

// POST /api/health/sleep -> log sleep
export const logSleep = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { bedtime, wakeTime, date } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!bedtime || !wakeTime) {
      return res.status(400).json({ error: 'Bedtime and Wake time are required' });
    }

    const bed = new Date(bedtime);
    const wake = new Date(wakeTime);
    const durationMs = wake.getTime() - bed.getTime();
    const durationHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

    if (durationHours <= 0 || durationHours > 24) {
      return res.status(400).json({ error: 'Invalid sleep duration' });
    }

    // Auto-calculate sleep quality score (1-100)
    let score = 50;
    if (durationHours >= 7.5 && durationHours <= 8.5) {
      score = 95;
    } else if (durationHours >= 6.5 && durationHours < 7.5) {
      score = 80;
    } else if (durationHours > 8.5 && durationHours <= 10) {
      score = 85;
    } else if (durationHours >= 5 && durationHours < 6.5) {
      score = 65;
    } else if (durationHours > 10 && durationHours <= 12) {
      score = 70;
    } else {
      score = 40;
    }

    const logDate = date ? new Date(date) : new Date();

    const log = await prisma.healthLog.create({
      data: {
        userId,
        type: 'sleep',
        value: durationHours,
        unit: 'hours',
        note: JSON.stringify({ bedtime, wakeTime, score }),
        loggedAt: logDate,
      },
    });

    return res.status(201).json({
      id: log.id,
      duration: durationHours,
      score,
      bedtime,
      wakeTime,
      loggedAt: log.loggedAt,
    });
  } catch (error: any) {
    console.error('Log sleep error:', error);
    return res.status(500).json({ error: 'Server error logging sleep' });
  }
};

// GET /api/health/sleep/stats -> avg duration, avg quality, best/worst night
export const getSleepStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const sleepLogs = await prisma.healthLog.findMany({
      where: { userId, type: 'sleep' },
    });

    if (sleepLogs.length === 0) {
      return res.status(200).json({
        avgDuration: 0,
        avgQuality: 0,
        bestNight: null,
        worstNight: null,
      });
    }

    const totalDuration = sleepLogs.reduce((sum, log) => sum + log.value, 0);
    const avgDuration = parseFloat((totalDuration / sleepLogs.length).toFixed(1));

    let totalQuality = 0;
    let validScoresCount = 0;
    let bestScore = -1;
    let worstScore = 101;
    let bestNightLog: any = null;
    let worstNightLog: any = null;

    sleepLogs.forEach(log => {
      try {
        if (log.note) {
          const details = JSON.parse(log.note);
          const score = details.score || 70;
          totalQuality += score;
          validScoresCount++;

          if (score > bestScore) {
            bestScore = score;
            bestNightLog = { date: formatDate(new Date(log.loggedAt)), duration: log.value, quality: score };
          }
          if (score < worstScore) {
            worstScore = score;
            worstNightLog = { date: formatDate(new Date(log.loggedAt)), duration: log.value, quality: score };
          }
        }
      } catch (e) {}
    });

    const avgQuality = validScoresCount > 0 ? Math.round(totalQuality / validScoresCount) : 70;

    return res.status(200).json({
      avgDuration,
      avgQuality,
      bestNight: bestNightLog,
      worstNight: worstNightLog,
    });
  } catch (error: any) {
    console.error('Get sleep stats error:', error);
    return res.status(500).json({ error: 'Server error retrieving sleep statistics' });
  }
};

// GET /api/health/steps -> today's steps count
export const getSteps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const log = await prisma.healthLog.findFirst({
      where: {
        userId,
        type: 'steps',
        loggedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    return res.status(200).json({ steps: log ? log.value : 0 });
  } catch (error: any) {
    console.error('Get steps error:', error);
    return res.status(500).json({ error: 'Server error retrieving steps' });
  }
};

// POST /api/health/steps -> log steps
export const logSteps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { count, date } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (count === undefined || count < 0) {
      return res.status(400).json({ error: 'Valid step count is required' });
    }

    const logDate = date ? new Date(date) : new Date();
    const dayStart = startOfDay(logDate);
    const dayEnd = endOfDay(logDate);

    const existingLog = await prisma.healthLog.findFirst({
      where: {
        userId,
        type: 'steps',
        loggedAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    let log;
    if (existingLog) {
      log = await prisma.healthLog.update({
        where: { id: existingLog.id },
        data: { value: parseFloat(count) },
      });
    } else {
      log = await prisma.healthLog.create({
        data: {
          userId,
          type: 'steps',
          value: parseFloat(count),
          unit: 'steps',
          loggedAt: logDate,
        },
      });
    }

    return res.status(201).json(log);
  } catch (error: any) {
    console.error('Log steps error:', error);
    return res.status(500).json({ error: 'Server error logging steps' });
  }
};

// GET /api/health/steps/history -> last 7 days daily totals
export const getStepsHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const todayStart = startOfDay(new Date());
    const startDate = subDays(todayStart, 6);

    const weeklyLogs = await prisma.healthLog.findMany({
      where: {
        userId,
        type: 'steps',
        loggedAt: { gte: startDate },
      },
    });

    const history = Array.from({ length: 7 }).map((_, i) => {
      const targetDay = subDays(todayStart, 6 - i);
      const targetDayStr = formatDate(targetDay);
      const log = weeklyLogs.find(l => formatDate(new Date(l.loggedAt)) === targetDayStr);

      return {
        date: targetDayStr,
        label: format(targetDay, 'EEE'),
        steps: log ? log.value : 0,
      };
    });

    return res.status(200).json(history);
  } catch (error: any) {
    console.error('Get steps history error:', error);
    return res.status(500).json({ error: 'Server error retrieving steps history' });
  }
};

// GET /api/health/weight/history -> all weight logs
export const getWeightHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const weightLogs = await prisma.healthLog.findMany({
      where: {
        userId,
        type: 'weight',
      },
      orderBy: { loggedAt: 'asc' },
    });

    return res.status(200).json(weightLogs);
  } catch (error: any) {
    console.error('Get weight history error:', error);
    return res.status(500).json({ error: 'Server error retrieving weight history' });
  }
};

// POST /api/health/weight -> log weight
export const logWeight = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { value, unit, date } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!value || value <= 0) {
      return res.status(400).json({ error: 'Valid weight is required' });
    }

    const logDate = date ? new Date(date) : new Date();
    const weightUnit = unit || 'kg';

    const log = await prisma.healthLog.create({
      data: {
        userId,
        type: 'weight',
        value: parseFloat(value),
        unit: weightUnit,
        loggedAt: logDate,
      },
    });

    return res.status(201).json(log);
  } catch (error: any) {
    console.error('Log weight error:', error);
    return res.status(500).json({ error: 'Server error logging weight' });
  }
};

// GET /api/health/bmi -> compute BMI given latest weight + user's height
export const getBMI = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { height: true },
    });

    if (!user || !user.height) {
      return res.status(400).json({ error: 'User height is not set in profile settings' });
    }

    const latestWeightLog = await prisma.healthLog.findFirst({
      where: { userId, type: 'weight' },
      orderBy: { loggedAt: 'desc' },
    });

    if (!latestWeightLog) {
      return res.status(200).json({ height: user.height, weight: null, bmi: null, category: 'No logs' });
    }

    // Standard formula assumes kg. If stored in lbs, convert
    let weightKg = latestWeightLog.value;
    if (latestWeightLog.unit === 'lbs') {
      weightKg = weightKg * 0.45359237;
    }

    const heightInMeters = user.height / 100;
    const bmi = parseFloat((weightKg / (heightInMeters * heightInMeters)).toFixed(1));

    let category = 'Normal';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi >= 25 && bmi < 30) category = 'Overweight';
    else if (bmi >= 30) category = 'Obese';

    return res.status(200).json({
      height: user.height,
      weight: latestWeightLog.value,
      unit: latestWeightLog.unit,
      bmi,
      category,
    });
  } catch (error: any) {
    console.error('Get BMI error:', error);
    return res.status(500).json({ error: 'Server error computing BMI' });
  }
};

// GET /api/health/score -> returns today's Health Score (0-100) + breakdown
export const getHealthScore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { waterGoal: true, sleepGoal: true, stepGoal: true },
    });

    const waterGoal = user?.waterGoal || 2000;
    const sleepGoal = user?.sleepGoal || 8;
    const stepGoal = user?.stepGoal || 8000;

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // 1. Water
    const waterLogs = await prisma.waterLog.findMany({
      where: { userId, loggedAt: { gte: todayStart, lte: todayEnd } },
    });
    const totalWater = waterLogs.reduce((acc, log) => acc + log.amount, 0);

    // 2. Sleep (check today's sleep log)
    const sleepLog = await prisma.healthLog.findFirst({
      where: { userId, type: 'sleep', loggedAt: { gte: todayStart, lte: todayEnd } },
    });
    const sleepHours = sleepLog ? sleepLog.value : 0;

    // 3. Steps
    const stepsLog = await prisma.healthLog.findFirst({
      where: { userId, type: 'steps', loggedAt: { gte: todayStart, lte: todayEnd } },
    });
    const stepsCount = stepsLog ? stepsLog.value : 0;

    const score = computeHealthScore({
      waterMl: totalWater,
      waterGoalMl: waterGoal,
      sleepHours,
      sleepGoalHours: sleepGoal,
      steps: stepsCount,
      stepGoal,
    });

    return res.status(200).json({
      healthScore: score,
      breakdown: {
        water: { amount: totalWater, goal: waterGoal },
        sleep: { hours: sleepHours, goal: sleepGoal },
        steps: { count: stepsCount, goal: stepGoal },
      },
    });
  } catch (error: any) {
    console.error('Get health score error:', error);
    return res.status(500).json({ error: 'Server error computing health score' });
  }
};

// GET /api/health/score/history -> last 7 days Health Score trend
export const getHealthScoreHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { waterGoal: true, sleepGoal: true, stepGoal: true },
    });

    const waterGoal = user?.waterGoal || 2000;
    const sleepGoal = user?.sleepGoal || 8;
    const stepGoal = user?.stepGoal || 8000;

    const todayStart = startOfDay(new Date());
    const startDate = subDays(todayStart, 6);

    const waterLogs = await prisma.waterLog.findMany({
      where: { userId, loggedAt: { gte: startDate } },
    });

    const healthLogs = await prisma.healthLog.findMany({
      where: { userId, loggedAt: { gte: startDate } },
    });

    const history = Array.from({ length: 7 }).map((_, i) => {
      const targetDay = subDays(todayStart, 6 - i);
      const targetDayStr = formatDate(targetDay);

      // Water on day
      const dayWater = waterLogs
        .filter(l => formatDate(new Date(l.loggedAt)) === targetDayStr)
        .reduce((sum, l) => sum + l.amount, 0);

      // Sleep on day
      const daySleepLog = healthLogs.find(
        l => l.type === 'sleep' && formatDate(new Date(l.loggedAt)) === targetDayStr
      );
      const daySleepHours = daySleepLog ? daySleepLog.value : 0;

      // Steps on day
      const dayStepsLog = healthLogs.find(
        l => l.type === 'steps' && formatDate(new Date(l.loggedAt)) === targetDayStr
      );
      const dayStepsCount = dayStepsLog ? dayStepsLog.value : 0;

      const score = computeHealthScore({
        waterMl: dayWater,
        waterGoalMl: waterGoal,
        sleepHours: daySleepHours,
        sleepGoalHours: sleepGoal,
        steps: dayStepsCount,
        stepGoal,
      });

      return {
        date: targetDayStr,
        label: format(targetDay, 'EEE'),
        score,
      };
    });

    return res.status(200).json(history);
  } catch (error: any) {
    console.error('Get health score history error:', error);
    return res.status(500).json({ error: 'Server error retrieving health score history' });
  }
};
