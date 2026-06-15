import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma/prisma';
import webpush from 'web-push';

// Configure Web Push VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const smtpUser = process.env.SMTP_USER || 'mailto:digest@lifedirector.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    smtpUser.startsWith('mailto:') ? smtpUser : `mailto:${smtpUser}`,
    vapidPublicKey,
    vapidPrivateKey
  );
}

// POST /api/push/subscribe -> save push subscription
export const subscribe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { endpoint, keys } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription details' });
    }

    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      // Update if user changed
      const updated = await prisma.pushSubscription.update({
        where: { endpoint },
        data: { userId, p256dh: keys.p256dh, auth: keys.auth },
      });
      return res.status(200).json(updated);
    }

    const sub = await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return res.status(201).json(sub);
  } catch (error: any) {
    console.error('Subscribe push error:', error);
    return res.status(500).json({ error: 'Server error subscribing to push notifications' });
  }
};

// DELETE /api/push/unsubscribe -> remove subscription by endpoint
export const unsubscribe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (error: any) {
    console.error('Unsubscribe push error:', error);
    return res.status(500).json({ error: 'Server error unsubscribing' });
  }
};

// GET /api/push/vapid-public-key -> return VAPID public key (no auth needed)
export const getVapidPublicKey = async (_req: Request, res: Response) => {
  return res.status(200).json({ publicKey: vapidPublicKey });
};

// POST /api/push/test -> send test push to current user (dev only)
export const testPush = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await sendPushToUser(userId, {
      title: 'Test Notification 🧭',
      body: 'This is a developer confirmation test from Life Director!',
      url: '/dashboard',
    });

    return res.status(200).json({ message: 'Test notification dispatched.' });
  } catch (error: any) {
    console.error('Test push error:', error);
    return res.status(500).json({ error: 'Failed dispatching test notification' });
  }
};

// Core helper to trigger push alerts
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; icon?: string; url?: string }
) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subs) {
    try {
      // Special check: if endpoint is 'expo', it is registered from the mobile client
      // We will handle mobile push notification delivery via Expo later, or log it
      if (sub.endpoint === 'expo' || sub.p256dh === 'expo') {
        console.log(`[Expo Push Mock] Dispatching mobile alert to ${userId}: ${payload.title} - ${payload.body}`);
        continue;
      }

      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
    } catch (e) {
      if ((e as any).statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      } else {
        console.error(`Failed dispatching push to sub ${sub.id}:`, e);
      }
    }
  }
}
