import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { subDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.streakFreezeLog.deleteMany();
  await prisma.waterLog.deleteMany();
  await prisma.healthLog.deleteMany();
  await prisma.focusSession.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.habitCheckIn.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding demo user...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'demo@lifedirector.app',
      name: 'Oliver Thorne',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      timezone: 'America/New_York',
      theme: 'dark',
      remainingFreezes: 1,
      lastFreezeReplenish: new Date(),
    },
  });

  console.log('Seeding habits...');
  const habitsData = [
    { name: 'Morning Meditation', emoji: '🧘', color: '#6C63FF', category: 'Mind', frequency: 'daily', customDays: '[]', reminderTime: '07:30' },
    { name: 'Drink 3L Water', emoji: '💧', color: '#00D4AA', category: 'Health', frequency: 'daily', customDays: '[]', reminderTime: '09:00' },
    { name: 'Read 15 Pages', emoji: '📚', color: '#FFD166', category: 'Mind', frequency: 'custom', customDays: '[1,2,3,4,5]', reminderTime: '21:00' }, // Mon-Fri
    { name: 'Strength Training', emoji: '🏋️', color: '#FF6B6B', category: 'Body', frequency: 'custom', customDays: '[1,3,5]', reminderTime: '18:00' }, // Mon, Wed, Fri
    { name: 'Gratitude Journal', emoji: '✍️', color: '#6C63FF', category: 'Mind', frequency: 'daily', customDays: '[]', reminderTime: '22:30' },
  ];

  const habits = [];
  for (const h of habitsData) {
    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        name: h.name,
        emoji: h.emoji,
        color: h.color,
        category: h.category,
        frequency: h.frequency,
        customDays: h.customDays,
        reminderTime: h.reminderTime,
        streak: 5,
        longestStreak: 12,
      },
    });
    habits.push(habit);
  }

  console.log('Seeding habit check-ins for the last 5 days...');
  const today = startOfDay(new Date());
  for (let i = 0; i < 5; i++) {
    const date = subDays(today, i);
    // Meditation and Water check-ins
    await prisma.habitCheckIn.create({
      data: { habitId: habits[0].id, date },
    });
    await prisma.habitCheckIn.create({
      data: { habitId: habits[1].id, date },
    });

    // Journal check-in on most days
    if (i !== 2) {
      await prisma.habitCheckIn.create({
        data: { habitId: habits[4].id, date },
      });
    }

    // Gym check-ins (Mon, Wed, Fri matching date offset)
    const dayOfWeek = date.getDay();
    if ([1, 3, 5].includes(dayOfWeek)) {
      await prisma.habitCheckIn.create({
        data: { habitId: habits[3].id, date },
      });
    }
  }

  // Seed one streak freeze log for testing
  await prisma.streakFreezeLog.create({
    data: {
      userId: user.id,
      habitId: habits[4].id,
      date: subDays(today, 2),
    },
  });

  console.log('Seeding tasks...');
  const tasksData = [
    { title: 'Deport Weekly Metrics to Team', status: 'done', priority: 1, dueDate: today, project: 'Work', tags: '["metrics", "report"]' },
    { title: 'Design Glassmorphism Dashboard Layout', status: 'in_progress', priority: 1, dueDate: today, project: 'Life Director', tags: '["design", "frontend"]' },
    { title: 'Integrate Web Push Notifications API', status: 'todo', priority: 2, dueDate: new Date(today.getTime() + 24 * 60 * 60 * 1000), project: 'Life Director', tags: '["pwa", "service-worker"]' },
    { title: 'Write Prisma SQLite Migration and Schemas', status: 'done', priority: 3, dueDate: subDays(today, 1), project: 'Life Director', tags: '["database", "backend"]' },
    { title: 'Schedule Dental Checkup Visit', status: 'todo', priority: 4, dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), project: 'Health', tags: '["wellness"]' },
  ];

  for (const t of tasksData) {
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        project: t.project,
        tags: t.tags,
      },
    });

    if (t.title.includes('Design')) {
      await prisma.subtask.createMany({
        data: [
          { taskId: task.id, title: 'Export Figma gradients', isDone: true },
          { taskId: task.id, title: 'Code custom CSS variables in globals.css', isDone: true },
          { taskId: task.id, title: 'Draft framer-motion page wrappers', isDone: false },
        ],
      });
    }
  }

  console.log('Seeding custom calendar events...');
  await prisma.calendarEvent.createMany({
    data: [
      {
        userId: user.id,
        title: '🚀 Life Director Project Launch Review',
        description: 'Sync with core team on beta rollout plan',
        startTime: new Date(today.getTime() + 2 * 60 * 60 * 1000), // today in 2h
        endTime: new Date(today.getTime() + 3.5 * 60 * 60 * 1000),
        color: '#6C63FF',
        type: 'custom',
      },
      {
        userId: user.id,
        title: '🩺 Doctor Appointment',
        description: 'Annual routine health checkup',
        startTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // day after tomorrow at 10:00
        endTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
        color: '#00D4AA',
        type: 'health',
        isMarked: true,
        markerLabel: 'Critical Checkup',
      },
    ],
  });

  console.log('Seeding water logs...');
  await prisma.waterLog.createMany({
    data: [
      { userId: user.id, amount: 250, loggedAt: new Date(today.getTime() - 4 * 60 * 60 * 1000) },
      { userId: user.id, amount: 500, loggedAt: new Date(today.getTime() - 2 * 60 * 60 * 1000) },
      { userId: user.id, amount: 250, loggedAt: new Date() },
    ],
  });

  console.log('Seeding health logs (sleep, steps, weight)...');
  // Sleep & steps for past 7 days
  for (let i = 0; i < 7; i++) {
    const logDate = subDays(today, i);
    // Sleep: average 7.8 hours, score 88
    const bedtime = new Date(logDate.getTime() - 8 * 60 * 60 * 1000);
    const wakeTime = new Date(logDate.getTime() + 0.5 * 60 * 60 * 1000);
    const duration = 8.5 - (i % 3) * 0.5;
    const score = duration >= 7.5 ? 95 : 75;

    await prisma.healthLog.create({
      data: {
        userId: user.id,
        type: 'sleep',
        value: duration,
        unit: 'hours',
        note: JSON.stringify({ bedtime, wakeTime, score }),
        loggedAt: logDate,
      },
    });

    // Steps: average 9500 steps
    await prisma.healthLog.create({
      data: {
        userId: user.id,
        type: 'steps',
        value: 8000 + (i % 4) * 1200,
        unit: 'steps',
        loggedAt: logDate,
      },
    });
  }

  // Weight
  await prisma.healthLog.create({
    data: {
      userId: user.id,
      type: 'weight',
      value: 78.5,
      unit: 'kg',
      note: JSON.stringify({ bmi: 24.1 }),
      loggedAt: subDays(today, 10),
    },
  });
  await prisma.healthLog.create({
    data: {
      userId: user.id,
      type: 'weight',
      value: 77.9,
      unit: 'kg',
      note: JSON.stringify({ bmi: 23.9 }),
      loggedAt: today,
    },
  });

  console.log('Seeding focus sessions...');
  await prisma.focusSession.createMany({
    data: [
      { userId: user.id, taskTitle: 'Design Glassmorphism Layout', duration: 25, mode: 'pomodoro', rounds: 1, completedAt: subDays(today, 2) },
      { userId: user.id, taskTitle: 'Design Glassmorphism Layout', duration: 50, mode: 'pomodoro', rounds: 2, completedAt: subDays(today, 1) },
      { userId: user.id, taskTitle: 'Write Prisma SQLite Migration', duration: 40, mode: 'custom', rounds: 1, completedAt: today },
    ],
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
