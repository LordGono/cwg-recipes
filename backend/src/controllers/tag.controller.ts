import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';

// Get all tags
export const getAllTags = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { recipes: true },
        },
      },
    });

    return res.json({
      success: true,
      data: { tags },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

// Create a tag
export const createTag = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createError(401, 'Authentication required');
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw createError(400, 'Tag name is required');
    }

    const normalizedName = name.trim().toLowerCase();

    // Find or create
    let tag = await prisma.tag.findUnique({ where: { name: normalizedName } });
    if (!tag) {
      tag = await prisma.tag.create({ data: { name: normalizedName } });
    }

    return res.status(201).json({
      success: true,
      data: { tag },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

// Delete a tag (admin only)
export const deleteTag = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createError(401, 'Authentication required');
    }

    if (!req.user.isAdmin) {
      throw createError(403, 'Admin access required');
    }

    const { id } = req.params;
    const tagId = Array.isArray(id) ? id[0] : id;

    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) {
      throw createError(404, 'Tag not found');
    }

    await prisma.tag.delete({ where: { id: tagId } });

    return res.json({
      success: true,
      message: 'Tag deleted successfully',
    }) as any;
  } catch (error) {
    return next(error);
  }
};
