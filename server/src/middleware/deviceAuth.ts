import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'togetherly-secret-key-couples-platform-2026-super-secure';

export interface DeviceAuthRequest extends Request {
  device?: {
    id: string;
    deviceId: string;
    spaceId: string;
    nickname: string | null;
    avatarUrl: string | null;
    platform: string | null;
  };
  space?: {
    id: string;
    name: string | null;
    status: string;
    devices: any[];
  };
}

export async function deviceAuthMiddleware(req: DeviceAuthRequest, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.deviceToken || req.cookies?.token;

    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(401).json({ error: 'Device authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { deviceId?: string; spaceId?: string };
    if (!decoded.deviceId || !decoded.spaceId) {
      return res.status(401).json({ error: 'Malformed device token payload' });
    }

    const device = await prisma.pairedDevice.findUnique({
      where: { deviceId: decoded.deviceId },
      include: {
        space: {
          include: {
            devices: {
              select: {
                id: true,
                deviceId: true,
                nickname: true,
                avatarUrl: true,
                platform: true,
                lastActiveAt: true,
              },
            },
          },
        },
      },
    });

    if (!device || !device.space) {
      return res.status(401).json({ error: 'Device pairing not found or space deleted' });
    }

    if (device.space.status === 'UNPAIRED') {
      return res.status(403).json({ error: 'This couple space has been unpaired' });
    }

    req.device = {
      id: device.id,
      deviceId: device.deviceId,
      spaceId: device.spaceId,
      nickname: device.nickname,
      avatarUrl: device.avatarUrl,
      platform: device.platform,
    };

    req.space = device.space;

    // Update lastActiveAt periodically (asynchronously without blocking)
    prisma.pairedDevice
      .update({
        where: { id: device.id },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => {});

    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired device token' });
  }
}

