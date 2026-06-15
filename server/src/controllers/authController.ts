import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        timezone: 'UTC',
        theme: 'dark',
        remainingFreezes: 1,
        lastFreezeReplenish: new Date(),
      },
    });

    const accessToken = generateAccessToken({ userId: newUser.id, email: newUser.email });
    const refreshToken = generateRefreshToken({ userId: newUser.id, email: newUser.email });

    return res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        timezone: newUser.timezone,
        theme: newUser.theme,
        remainingFreezes: newUser.remainingFreezes,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Lazy Streak Freeze replenishment check:
    // Check if 7 days have passed since lastFreezeReplenish. If so, reset remainingFreezes to 1 and update lastFreezeReplenish to now.
    const now = new Date();
    const msDiff = now.getTime() - new Date(user.lastFreezeReplenish).getTime();
    const daysDiff = msDiff / (1000 * 60 * 60 * 24);

    let remainingFreezes = user.remainingFreezes;
    let lastFreezeReplenish = user.lastFreezeReplenish;

    if (daysDiff >= 7) {
      remainingFreezes = 1;
      lastFreezeReplenish = now;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          remainingFreezes: 1,
          lastFreezeReplenish: now,
        },
      });
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        theme: user.theme,
        remainingFreezes,
        lastFreezeReplenish,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
    const newRefreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'Server error during token refresh' });
  }
};

export const logout = async (_req: Request, res: Response) => {
  // Simple token-based logout (client deletes token; server returns OK)
  return res.status(200).json({ message: 'Logged out successfully' });
};
