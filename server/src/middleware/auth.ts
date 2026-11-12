import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'togetherly-fallback-secret-2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  relationshipId?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        relationshipId: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found or session invalid' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireRelationship(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.relationshipId) {
    return res.status(403).json({
      error: 'A paired partner space is required for this action. Please create or join a couple space first.',
    });
  }
  next();
}

