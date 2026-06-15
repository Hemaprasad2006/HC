import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma/prisma';

// tags is now a native array in PostgreSQL

export const getTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const tasks = await prisma.task.findMany({
      where: { userId },
      include: {
        subtasks: true,
      },
      orderBy: [
        { status: 'asc' }, // todo first, done last
        { priority: 'asc' }, // high priority first
        { dueDate: 'asc' },
      ],
    });

    return res.status(200).json(tasks);
  } catch (error: any) {
    console.error('Get tasks error:', error);
    return res.status(500).json({ error: 'Server error retrieving tasks' });
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, dueDate, priority, project, tags, isRecurring, recurrence, subtasks } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const createdTask = await prisma.task.create({
      data: {
        userId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 4,
        project,
        tags: tags || [],
        isRecurring: isRecurring || false,
        recurrence,
        subtasks: subtasks && subtasks.length > 0 ? {
          create: subtasks.map((st: any) => ({
            title: st.title,
            isDone: st.isDone || false,
          })),
        } : undefined,
      },
      include: {
        subtasks: true,
      },
    });

    return res.status(201).json(createdTask);
  } catch (error: any) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Server error creating task' });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { title, description, dueDate, priority, status, project, tags, isRecurring, recurrence, subtasks } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Handle subtask sync: if subtasks are passed, delete old and write new (or update)
    if (subtasks !== undefined) {
      await prisma.subtask.deleteMany({ where: { taskId: id } });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (project !== undefined) updateData.project = project;
    if (tags !== undefined) updateData.tags = tags;
    if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
    if (recurrence !== undefined) updateData.recurrence = recurrence;

    if (subtasks !== undefined && subtasks.length > 0) {
      updateData.subtasks = {
        create: subtasks.map((st: any) => ({
          title: st.title,
          isDone: st.isDone || false,
        })),
      };
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        subtasks: true,
      },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Server error updating task' });
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await prisma.task.delete({ where: { id } });

    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('Delete task error:', error);
    return res.status(500).json({ error: 'Server error deleting task' });
  }
};

export const completeTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const newStatus = task.status === 'done' ? 'todo' : 'done';

    const updated = await prisma.task.update({
      where: { id },
      data: { status: newStatus },
      include: { subtasks: true },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('Complete task error:', error);
    return res.status(500).json({ error: 'Server error updating task status' });
  }
};

// Bulk Actions
export const bulkCompleteTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { ids, status } = req.body; // ids: string[], status: "todo" | "in_progress" | "done"

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid or missing task IDs' });
    }

    await prisma.task.updateMany({
      where: {
        id: { in: ids },
        userId,
      },
      data: {
        status: status || 'done',
      },
    });

    return res.status(200).json({ message: `Successfully updated ${ids.length} tasks` });
  } catch (error: any) {
    console.error('Bulk complete tasks error:', error);
    return res.status(500).json({ error: 'Server error during bulk status update' });
  }
};

export const bulkPriorityTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { ids, priority } = req.body; // ids: string[], priority: number (1-4)

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!ids || !Array.isArray(ids) || !priority) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    await prisma.task.updateMany({
      where: {
        id: { in: ids },
        userId,
      },
      data: {
        priority,
      },
    });

    return res.status(200).json({ message: `Successfully updated ${ids.length} tasks to priority P${priority}` });
  } catch (error: any) {
    console.error('Bulk priority error:', error);
    return res.status(500).json({ error: 'Server error during bulk priority update' });
  }
};

export const bulkDeleteTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { ids } = req.body; // ids: string[]

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid task IDs' });
    }

    await prisma.task.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    return res.status(200).json({ message: `Successfully deleted ${ids.length} tasks` });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    return res.status(500).json({ error: 'Server error during bulk deletion' });
  }
};
