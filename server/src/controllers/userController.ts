import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma/prisma';

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        timezone: true,
        theme: true,
        height: true,
        focusGoal: true,
        waterGoal: true,
        sleepGoal: true,
        stepGoal: true,
        remainingFreezes: true,
        lastFreezeReplenish: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Lazy Streak Freeze replenishment check:
    const now = new Date();
    const msDiff = now.getTime() - new Date(user.lastFreezeReplenish).getTime();
    const daysDiff = msDiff / (1000 * 60 * 60 * 24);

    let remainingFreezes = user.remainingFreezes;
    let lastFreezeReplenish = user.lastFreezeReplenish;

    if (daysDiff >= 7) {
      remainingFreezes = 1;
      lastFreezeReplenish = now;
      await prisma.user.update({
        where: { id: userId },
        data: {
          remainingFreezes: 1,
          lastFreezeReplenish: now,
        },
      });
    }

    return res.status(200).json({
      ...user,
      remainingFreezes,
      lastFreezeReplenish,
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Server error retrieving profile' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, email, avatarUrl, timezone, height, focusGoal, waterGoal, sleepGoal, stepGoal } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (height !== undefined) updateData.height = height ? parseFloat(height) : null;
    if (focusGoal !== undefined) updateData.focusGoal = parseInt(focusGoal);
    if (waterGoal !== undefined) updateData.waterGoal = parseFloat(waterGoal);
    if (sleepGoal !== undefined) updateData.sleepGoal = parseFloat(sleepGoal);
    if (stepGoal !== undefined) updateData.stepGoal = parseInt(stepGoal);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        timezone: true,
        theme: true,
        height: true,
        focusGoal: true,
        waterGoal: true,
        sleepGoal: true,
        stepGoal: true,
        remainingFreezes: true,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Server error updating profile' });
  }
};

export const updatePreferences = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { theme, timezone } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const updateData: any = {};
    if (theme !== undefined) updateData.theme = theme;
    if (timezone !== undefined) updateData.timezone = timezone;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        theme: true,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error: any) {
    console.error('Update preferences error:', error);
    return res.status(500).json({ error: 'Server error updating preferences' });
  }
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Cascade delete because Prisma is set up with onDelete: Cascade on all relations
    await prisma.user.delete({ where: { id: userId } });

    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Server error deleting account' });
  }
};

export const exportUserData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        habits: { include: { checkIns: true } },
        tasks: { include: { subtasks: true } },
        events: true,
        healthLogs: true,
        waterLogs: true,
        focusSessions: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Clean sensitive password data
    const exportData = {
      profile: {
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        theme: user.theme,
        createdAt: user.createdAt,
      },
      habits: user.habits,
      tasks: user.tasks,
      events: user.events,
      healthLogs: user.healthLogs,
      waterLogs: user.waterLogs,
      focusSessions: user.focusSessions,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="lifedirector_export.json"');
    return res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (error: any) {
    console.error('Export user data error:', error);
    return res.status(500).json({ error: 'Server error exporting user data' });
  }
};
