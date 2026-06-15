import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma/prisma';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addHours } from 'date-fns';

export const getEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { start, end } = req.query; // optional range start/end ISO strings

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const startDate = start ? new Date(start as string) : startOfMonth(new Date());
    const endDate = end ? new Date(end as string) : endOfMonth(new Date());

    // 1. Fetch Custom Events (including marked days)
    const customEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
    });

    // 2. Fetch Tasks with due dates within range
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 3. Fetch Habits to auto-populate calendar days
    const habits = await prisma.habit.findMany({
      where: { userId, isArchived: false },
      include: {
        checkIns: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    // Consolidate into calendar payload
    const events: any[] = [];

    // Map custom events
    customEvents.forEach(e => {
      events.push({
        id: e.id,
        title: e.title,
        description: e.description,
        startTime: e.startTime,
        endTime: e.endTime,
        color: e.color,
        type: e.type, // 'custom', 'health', 'focus', etc.
        isMarked: e.isMarked,
        markerLabel: e.markerLabel,
      });
    });

    // Map tasks
    tasks.forEach(t => {
      let color = '#FF6B6B'; // P1: Coral
      if (t.priority === 2) color = '#FFD166'; // P2: Gold
      if (t.priority === 3) color = '#6C63FF'; // P3: Violet
      if (t.priority === 4) color = '#8A8AA0'; // P4: Muted

      const start = t.dueDate ? new Date(t.dueDate) : new Date();
      const end = addHours(start, 1);

      events.push({
        id: `task-${t.id}`,
        title: `📋 ${t.title}`,
        description: t.description || 'Task due',
        startTime: start,
        endTime: end,
        color,
        type: 'task',
        status: t.status,
      });
    });

    // Map habits (calculate scheduled days in the range)
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    habits.forEach(h => {
      const customDays: number[] = h.customDays ? JSON.parse(h.customDays) : [];

      days.forEach(day => {
        let isScheduled = false;
        if (h.frequency === 'daily') {
          isScheduled = true;
        } else if (h.frequency === 'custom') {
          const dayOfWeek = day.getDay(); // 0 = Sun, 1 = Mon...
          isScheduled = customDays.includes(dayOfWeek);
        }

        if (isScheduled) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isDone = h.checkIns.some(c => format(new Date(c.date), 'yyyy-MM-dd') === dateStr);
          
          // Time details
          const timePart = h.reminderTime || '08:00';
          const [hours, minutes] = timePart.split(':').map(Number);
          const start = new Date(day);
          start.setHours(hours || 8, minutes || 0, 0, 0);
          const end = addHours(start, 0.5);

          events.push({
            id: `habit-${h.id}-${dateStr}`,
            habitId: h.id,
            title: `${h.emoji} ${h.name}`,
            description: isDone ? 'Completed today!' : 'Pending check-in',
            startTime: start,
            endTime: end,
            color: isDone ? '#00D4AA' : h.color, // Mint green if checked in, else habit default color
            type: 'habit',
            isDone,
          });
        }
      });
    });

    return res.status(200).json(events);
  } catch (error: any) {
    console.error('Get calendar events error:', error);
    return res.status(500).json({ error: 'Server error retrieving events' });
  }
};

export const createEvent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, startTime, endTime, color, type, isMarked, markerLabel } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, startTime, and endTime are required' });
    }

    const newEvent = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        color: color || '#6C63FF',
        type: type || 'custom',
        isMarked: isMarked || false,
        markerLabel: markerLabel || null,
      },
    });

    return res.status(201).json(newEvent);
  } catch (error: any) {
    console.error('Create calendar event error:', error);
    return res.status(500).json({ error: 'Server error creating event' });
  }
};

export const updateEvent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { startTime, endTime, title, description, color, isMarked, markerLabel } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Handle rescheduling dynamic tasks!
    if (id.startsWith('task-')) {
      const taskId = id.replace('task-', '');
      const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          dueDate: startTime ? new Date(startTime) : null,
        },
      });
      return res.status(200).json({
        id,
        startTime: updatedTask.dueDate,
        type: 'task',
        title: updatedTask.title,
      });
    }

    // Handle pseudo habits (read-only for reschedule)
    if (id.startsWith('habit-')) {
      return res.status(400).json({ error: 'Habit auto-schedules cannot be rescheduled directly. Modify the habit config.' });
    }

    // Handle Custom Event update
    const event = await prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const updateData: any = {};
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (isMarked !== undefined) updateData.isMarked = isMarked;
    if (markerLabel !== undefined) updateData.markerLabel = markerLabel;

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update calendar event error:', error);
    return res.status(500).json({ error: 'Server error updating event' });
  }
};

export const deleteEvent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (id.startsWith('task-')) {
      const taskId = id.replace('task-', '');
      await prisma.task.update({
        where: { id: taskId },
        data: { dueDate: null },
      });
      return res.status(200).json({ message: 'Task due date removed from calendar' });
    }

    if (id.startsWith('habit-')) {
      return res.status(400).json({ error: 'Habit schedules cannot be deleted. Archive the habit instead.' });
    }

    const event = await prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    await prisma.calendarEvent.delete({ where: { id } });

    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete calendar event error:', error);
    return res.status(500).json({ error: 'Server error deleting event' });
  }
};

// Exporter for .ics file format
export const exportICS = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch custom events
    const customEvents = await prisma.calendarEvent.findMany({
      where: { userId },
    });

    // Fetch tasks
    const tasks = await prisma.task.findMany({
      where: { userId, dueDate: { not: null } },
    });

    // Generate ICS content
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Life Director//NONSGML v1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n') + '\r\n';

    const formatICSDate = (date: Date) => {
      return format(date, "yyyyMMdd'T'HHmmss'Z'");
    };

    customEvents.forEach(e => {
      icsContent += [
        'BEGIN:VEVENT',
        `UID:custom-${e.id}@lifedirector.app`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(new Date(e.startTime))}`,
        `DTEND:${formatICSDate(new Date(e.endTime))}`,
        `SUMMARY:${e.title}`,
        `DESCRIPTION:${e.description || ''}`,
        'END:VEVENT'
      ].join('\r\n') + '\r\n';
    });

    tasks.forEach(t => {
      const start = t.dueDate ? new Date(t.dueDate) : new Date();
      const end = addHours(start, 1);
      icsContent += [
        'BEGIN:VEVENT',
        `UID:task-${t.id}@lifedirector.app`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(start)}`,
        `DTEND:${formatICSDate(end)}`,
        `SUMMARY:📋 ${t.title}`,
        `DESCRIPTION:${t.description || ''}`,
        'END:VEVENT'
      ].join('\r\n') + '\r\n';
    });

    icsContent += 'END:VCALENDAR';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lifedirector.ics"');
    return res.status(200).send(icsContent);
  } catch (error: any) {
    console.error('ICS Export error:', error);
    return res.status(500).json({ error: 'Server error generating calendar file' });
  }
};
