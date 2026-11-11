import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const relationshipId = req.user!.relationshipId;

    const [allAchievements, userAchievements, relationship] = await Promise.all([
      prisma.achievement.findMany({
        orderBy: { pointsReward: 'asc' },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
      }),
      relationshipId ? prisma.relationship.findUnique({ where: { id: relationshipId } }) : null,
    ]);

    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

    const mapped = allAchievements.map((a) => ({
      ...a,
      isUnlocked: unlockedIds.has(a.id),
      unlockedAt: userAchievements.find((ua) => ua.achievementId === a.id)?.unlockedAt || null,
    }));

    return res.json({
      couplePoints: relationship?.couplePoints || 0,
      streakCount: relationship?.streakCount || 0,
      achievements: mapped,
    });
  } catch (error) {
    console.error('Achievements error:', error);
    return res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

export default router;
