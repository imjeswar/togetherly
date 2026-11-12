import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return res.json({ notifications });
  } catch (error) {
    console.error('Notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.id },
      data: { isRead: true },
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('Read notification error:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.post('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id },
      data: { isRead: true },
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('Read all error:', error);
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;

