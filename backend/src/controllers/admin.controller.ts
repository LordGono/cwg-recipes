import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { getGeminiUsageStats } from '../services/rateLimiter';

// GET /api/admin/users
export const getUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const [users, todayUsage] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
          dailyGeminiLimit: true,
          createdAt: true,
          _count: { select: { recipes: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.geminiUsage.groupBy({
        by: ['userId'],
        where: { timestamp: { gte: todayUtc }, success: true },
        _count: { _all: true },
      }),
    ]);

    const usageMap = new Map(todayUsage.map((u) => [u.userId, u._count._all]));
    const usersWithUsage = users.map((u) => ({
      ...u,
      dailyUsage: usageMap.get(u.id) ?? 0,
    }));

    return res.json({ success: true, data: { users: usersWithUsage } }) as any;
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    // Prevent deleting yourself
    if (req.user?.userId === id) {
      throw createError(400, 'Cannot delete your own account');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw createError(404, 'User not found');

    await prisma.user.delete({ where: { id } });

    return res.json({ success: true, message: 'User deleted' }) as any;
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/admin/users/:id/toggle-admin
export const toggleAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    // Prevent demoting yourself
    if (req.user?.userId === id) {
      throw createError(400, 'Cannot change your own admin status');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw createError(404, 'User not found');

    const updated = await prisma.user.update({
      where: { id },
      data: { isAdmin: !user.isAdmin },
      select: { id: true, username: true, email: true, isAdmin: true, createdAt: true },
    });

    return res.json({ success: true, data: { user: updated } }) as any;
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/admin/users/:id/gemini-limit
export const geminiLimitValidation = [
  body('limit')
    .custom((v) => v === null || (Number.isInteger(v) && v >= 1))
    .withMessage('Limit must be a positive integer or null (unlimited)'),
];

export const setUserGeminiLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const id = req.params.id as string;
    const { limit } = req.body as { limit: number | null };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw createError(404, 'User not found');

    const updated = await prisma.user.update({
      where: { id },
      data: { dailyGeminiLimit: limit ?? null },
      select: { id: true, username: true, dailyGeminiLimit: true },
    });

    return res.json({ success: true, data: { user: updated } }) as any;
  } catch (error) {
    return next(error);
  }
};

// GET /api/admin/stats
export const getStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [userCount, recipeCount, usageStats] = await Promise.all([
      prisma.user.count(),
      prisma.recipe.count(),
      getGeminiUsageStats(),
    ]);

    return res.json({
      success: true,
      data: {
        users: userCount,
        recipes: recipeCount,
        gemini: usageStats,
      },
    }) as any;
  } catch (error) {
    return next(error);
  }
};
