import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma/prisma';

// Mappings helper to support both mobile (body, isRead) and web (message, read) properties
const formatNotification = (notification: any) => {
  return {
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    body: notification.body,
    message: notification.body, // compatibility with web client
    type: notification.type,
    isRead: notification.isRead,
    read: notification.isRead, // compatibility with web client
    createdAt: notification.createdAt,
  };
};

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return res.status(200).json({
      notifications: notifications.map(formatNotification),
      unreadCount,
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Server error retrieving notifications' });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });

    return res.status(200).json({ message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Server error updating notification' });
  }
};

export const markAllRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ error: 'Server error updating notifications' });
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.delete({
      where: { id, userId },
    });

    return res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ error: 'Server error deleting notification' });
  }
};
