import prisma from '../prisma/prisma';
import nodemailer from 'nodemailer';
import { format, startOfDay, endOfDay } from 'date-fns';
import { computeHealthScore, computeLifeScore } from '../utils/lifeScore';
import { sendPushToUser } from '../controllers/pushController';

// Helper to fetch weather
export async function fetchOpenMeteoWeather(timezone: string) {
  let lat = 40.7128;
  let lng = -74.0060;

  if (timezone && timezone.toLowerCase().includes('kolkata')) {
    lat = 22.5726;
    lng = 88.3639;
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
    );
    if (res.ok) {
      const data = (await res.json()) as any;
      const temp = Math.round(data?.current_weather?.temperature);
      const code = data?.current_weather?.weathercode;
      let cond = 'Partly Cloudy';
      if (code === 0) cond = 'Clear Sky ☀️';
      else if (code >= 1 && code <= 3) cond = 'Mainly Clear 🌤️';
      else if (code >= 51 && code <= 67) cond = 'Rainy 🌧️';
      else if (code >= 71 && code <= 77) cond = 'Snowy ❄️';
      else cond = 'Overcast ☁️';
      return { temp: `${temp}°C`, condition: cond };
    }
  } catch (e) {}

  return { temp: '22°C', condition: 'Partly Cloudy 🌤️' };
}

// Helper to compute user's life score today
async function computeTodayLifeScore(userId: string, waterGoal: number, sleepGoal: number, stepGoal: number, focusGoal: number) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // Habits Pct
  const habits = await prisma.habit.findMany({
    where: { userId, isArchived: false },
    include: {
      checkIns: {
        where: { date: { gte: todayStart, lte: todayEnd } },
      },
    },
  });

  const dayOfWeek = new Date().getDay();
  const activeHabits = habits.filter(h => {
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

  const totalActive = activeHabits.length;
  const completedActive = activeHabits.filter(h => h.checkIns.length > 0).length;
  const habitsPct = totalActive > 0 ? (completedActive / totalActive) * 100 : 100;

  // Tasks Pct
  const tasks = await prisma.task.findMany({ where: { userId } });
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const completedTasksToday = tasks.filter(t => t.status === 'done'); // Simplified
  const totalTasks = pendingTasks.length + completedTasksToday.length;
  const tasksPct = totalTasks > 0 ? (completedTasksToday.length / totalTasks) * 100 : 100;

  // Health Score
  const waterLogs = await prisma.waterLog.findMany({
    where: { userId, loggedAt: { gte: todayStart, lte: todayEnd } },
  });
  const waterMl = waterLogs.reduce((sum, l) => sum + l.amount, 0);

  const sleepLog = await prisma.healthLog.findFirst({
    where: { userId, type: 'sleep', loggedAt: { gte: todayStart, lte: todayEnd } },
  });
  const sleepHours = sleepLog ? sleepLog.value : 8;

  const stepsLog = await prisma.healthLog.findFirst({
    where: { userId, type: 'steps', loggedAt: { gte: todayStart, lte: todayEnd } },
  });
  const steps = stepsLog ? stepsLog.value : 5000;

  const healthScore = computeHealthScore({
    waterMl,
    waterGoalMl: waterGoal,
    sleepHours,
    sleepGoalHours: sleepGoal,
    steps,
    stepGoal,
  });

  // Focus Pct
  const focusSessions = await prisma.focusSession.findMany({
    where: { userId, completedAt: { gte: todayStart, lte: todayEnd } },
  });
  const focusMinutes = focusSessions.reduce((sum, s) => sum + s.duration, 0);

  return computeLifeScore({
    habitsPct,
    tasksPct,
    healthScore,
    focusMinutes,
    focusGoalMinutes: focusGoal,
  });
}

export async function runDailyDigest() {
  console.log('[Scheduler] Executing Daily Digest engine...');
  const users = await prisma.user.findMany();
  const today = new Date();
  const dayOfWeek = today.getDay();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER || 'mock-user',
      pass: process.env.SMTP_PASS || 'mock-pass',
    },
  });

  for (const user of users) {
    try {
      // 1. Get today's pending habits (which have no check-in today)
      const habits = await prisma.habit.findMany({
        where: { userId: user.id, isArchived: false },
        include: {
          checkIns: {
            where: {
              date: {
                gte: startOfDay(today),
                lte: endOfDay(today),
              },
            },
          },
        },
      });

      const pendingHabits = habits.filter(h => {
        if (h.checkIns.length > 0) return false;
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

      // 2. Fetch top 3 tasks by priority
      const tasks = await prisma.task.findMany({
        where: {
          userId: user.id,
          status: { not: 'done' },
        },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        take: 3,
      });

      // 3. Fetch weather
      const weather = await fetchOpenMeteoWeather(user.timezone);

      // 4. Compute Life Score
      const lifeScore = await computeTodayLifeScore(
        user.id,
        user.waterGoal,
        user.sleepGoal,
        user.stepGoal,
        user.focusGoal
      );

      // 5. Save in-app notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'digest',
          title: 'Your Daily Digest is ready ☀️',
          body: `Life Score: ${lifeScore} · ${pendingHabits.length} habits pending · ${tasks.length} tasks due`,
          isRead: false,
        },
      });

      // 6. Send push notification if subscribed
      await sendPushToUser(user.id, {
        title: 'Your Daily Digest is ready ☀️',
        body: `Life Score: ${lifeScore} · ${pendingHabits.length} habits pending · ${tasks.length} tasks due`,
        url: `${process.env.APP_URL || 'http://localhost:5173'}/dashboard`,
      });

      // 7. Send plain HTML Email with inline styles only
      const habitsHTML = pendingHabits.map(h => `<li>${h.emoji} <strong>${h.name}</strong></li>`).join('');
      const tasksHTML = tasks.map(t => `<li>P${t.priority} — <strong>${t.title}</strong></li>`).join('');

      const emailHTML = `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #0A0A0F; color: #F0F0FF; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
          <h2 style="font-family: 'Sora', sans-serif; color: #6C63FF; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-top: 0; text-align: center;">🧭 LIFE DIRECTOR</h2>
          
          <p style="font-size: 16px; text-align: center; color: #F0F0FF;">Good morning, <strong>${user.name}</strong>. Here is your daily orchestration digest:</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <div style="width: 80px; height: 80px; border-radius: 50%; border: 6px solid #6C63FF; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #F0F0FF; margin: 0 auto 10px auto;">
              <span style="line-height: 80px;">${lifeScore}</span>
            </div>
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A8AA0;">Estimated Life Score</span>
          </div>

          <div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 25px;">
            <h4 style="margin: 0 0 5px 0; color: #00D4AA; font-size: 14px;">🌤️ Weather Forecast</h4>
            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #F0F0FF;">${weather.temp} — ${weather.condition}</p>
          </div>

          <div style="margin-bottom: 25px;">
            <h4 style="color: #6C63FF; margin-bottom: 8px; font-size: 15px; border-left: 3px solid #6C63FF; padding-left: 8px;">🧘 Habits Pending (${pendingHabits.length})</h4>
            ${pendingHabits.length > 0 ? `<ul style="margin: 0; padding-left: 20px; line-height: 1.8; color: #F0F0FF;">${habitsHTML}</ul>` : '<p style="color: #8A8AA0; margin: 0;">No pending habits for today!</p>'}
          </div>

          <div style="margin-bottom: 25px;">
            <h4 style="color: #FF6B6B; margin-bottom: 8px; font-size: 15px; border-left: 3px solid #FF6B6B; padding-left: 8px;">📋 Top Priority Tasks (${tasks.length})</h4>
            ${tasks.length > 0 ? `<ul style="margin: 0; padding-left: 20px; line-height: 1.8; color: #F0F0FF;">${tasksHTML}</ul>` : '<p style="color: #8A8AA0; margin: 0;">No pending high priority tasks today.</p>'}
          </div>

          <div style="text-align: center; margin-top: 35px;">
            <a href="${process.env.APP_URL || 'http://localhost:5173'}" style="background-color: #6C63FF; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Open App</a>
          </div>

          <p style="font-size: 11px; color: #4A4A60; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 15px; margin-top: 35px; text-align: center;">
            Life Director — Orchestrate your routine.<br>
            Sent automatically at 8:00 AM server time.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: '"Life Director" <digest@lifedirector.app>',
        to: user.email,
        subject: `🌅 Your Life Director Daily Digest — ${format(today, 'MMM dd')}`,
        html: emailHTML,
      }).catch(() => {
        console.log(`[Email Dispatcher] Ethereal/mock email compiled for user ${user.email}`);
      });

    } catch (e) {
      console.error(`Failed compiling digest for user ${user.id}:`, e);
    }
  }
}
