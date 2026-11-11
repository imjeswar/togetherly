import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest, requireRelationship } from '../middleware/auth.js';
import { recordRelationshipActivity } from '../services/streak.service.js';

const router = Router();

// GET DATE IDEAS (with match status)
router.get('/', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const userId = req.user!.id;
    const { category } = req.query;

    const partner = await prisma.user.findFirst({
      where: { relationshipId, id: { not: userId } },
    });

    const whereClause: any = {};
    if (category && typeof category === 'string' && category !== 'ALL') {
      whereClause.category = category;
    }

    const ideas = await prisma.dateIdea.findMany({
      where: whereClause,
      include: {
        savedInstances: {
          where: { relationshipId },
        },
      },
      orderBy: { title: 'asc' },
    });

    const mapped = ideas.map((idea) => {
      const saved = idea.savedInstances[0] || null;
      const likedUsers: string[] = saved ? JSON.parse(saved.likedByUsers || '[]') : [];
      const userLiked = likedUsers.includes(userId);
      const partnerLiked = partner ? likedUsers.includes(partner.id) : false;
      const isMutualMatch = saved?.isMutualMatch || (userLiked && partnerLiked);

      return {
        id: idea.id,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        budget: idea.budget,
        duration: idea.duration,
        userLiked,
        partnerLiked,
        isMutualMatch,
        isCompleted: saved?.isCompleted || false,
        scheduledFor: saved?.scheduledFor || null,
        notes: saved?.notes || null,
      };
    });

    return res.json({ dateIdeas: mapped });
  } catch (error) {
    console.error('Date ideas error:', error);
    return res.status(500).json({ error: 'Failed to fetch date ideas' });
  }
});

// SWIPE (LIKE / PASS) ON DATE IDEA
router.post('/:id/swipe', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "LIKE" or "PASS"
    const userId = req.user!.id;
    const relationshipId = req.user!.relationshipId!;

    const dateIdea = await prisma.dateIdea.findUnique({
      where: { id },
    });

    if (!dateIdea) {
      return res.status(404).json({ error: 'Date idea not found' });
    }

    const partner = await prisma.user.findFirst({
      where: { relationshipId, id: { not: userId } },
    });

    let saved = await prisma.savedDateIdea.findUnique({
      where: {
        dateIdeaId_relationshipId: {
          dateIdeaId: id,
          relationshipId,
        },
      },
    });

    let likedUsers: string[] = saved ? JSON.parse(saved.likedByUsers || '[]') : [];

    if (action === 'LIKE') {
      if (!likedUsers.includes(userId)) {
        likedUsers.push(userId);
      }
    } else {
      likedUsers = likedUsers.filter((u) => u !== userId);
    }

    const partnerLiked = partner ? likedUsers.includes(partner.id) : false;
    const isMutualMatch = likedUsers.includes(userId) && partnerLiked;

    if (!saved) {
      saved = await prisma.savedDateIdea.create({
        data: {
          dateIdeaId: id,
          relationshipId,
          likedByUsers: JSON.stringify(likedUsers),
          isMutualMatch,
        },
      });
    } else {
      saved = await prisma.savedDateIdea.update({
        where: { id: saved.id },
        data: {
          likedByUsers: JSON.stringify(likedUsers),
          isMutualMatch,
        },
      });
    }

    // If it just became a mutual match!
    if (isMutualMatch && partner) {
      await prisma.notification.createMany({
        data: [
          {
            userId,
            type: 'ACHIEVEMENT',
            title: 'It’s a Date Match! 💖',
            message: `You and ${partner.firstName} both loved: "${dateIdea.title}"! Time to plan it!`,
            link: '/connect?tab=dates',
          },
          {
            userId: partner.id,
            type: 'ACHIEVEMENT',
            title: 'It’s a Date Match! 💖',
            message: `You and ${req.user!.firstName} both loved: "${dateIdea.title}"! Time to plan it!`,
            link: '/connect?tab=dates',
          },
        ],
      });

      // Record activity & check achievements
      await recordRelationshipActivity(relationshipId, userId, 'DATE');
    }

    return res.json({
      message: isMutualMatch ? 'It is a match! Both of you love this date idea.' : 'Preference saved',
      isMutualMatch,
      saved,
    });
  } catch (error) {
    console.error('Swipe error:', error);
    return res.status(500).json({ error: 'Failed to record date preference' });
  }
});

// GET MUTUAL MATCHES
router.get('/matches', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;

    const matches = await prisma.savedDateIdea.findMany({
      where: {
        relationshipId,
        isMutualMatch: true,
      },
      include: {
        dateIdea: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ matches });
  } catch (error) {
    console.error('Matches error:', error);
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// SCHEDULE OR COMPLETE DATE IDEA
router.post('/:id/schedule', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledFor, notes } = req.body;
    const relationshipId = req.user!.relationshipId!;

    const saved = await prisma.savedDateIdea.update({
      where: {
        dateIdeaId_relationshipId: {
          dateIdeaId: id,
          relationshipId,
        },
      },
      data: {
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        notes: notes !== undefined ? notes : undefined,
      },
      include: { dateIdea: true },
    });

    return res.json({ message: 'Date scheduled!', saved });
  } catch (error) {
    console.error('Schedule date error:', error);
    return res.status(500).json({ error: 'Failed to schedule date' });
  }
});

// MARK DATE AS COMPLETED
router.post('/:id/complete', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const relationshipId = req.user!.relationshipId!;
    const userId = req.user!.id;

    const saved = await prisma.savedDateIdea.update({
      where: {
        dateIdeaId_relationshipId: {
          dateIdeaId: id,
          relationshipId,
        },
      },
      data: { isCompleted: true },
      include: { dateIdea: true },
    });

    // Create Memory
    await prisma.memory.create({
      data: {
        relationshipId,
        title: `Date Night Completed: ${saved.dateIdea.title}`,
        description: saved.notes || `A wonderful date night shared together.`,
        type: 'MILESTONE',
      },
    });

    // Record activity
    const activityResult = await recordRelationshipActivity(relationshipId, userId, 'DATE');

    return res.json({
      message: 'Date marked as completed! Added to your relationship memories.',
      saved,
      activityResult,
    });
  } catch (error) {
    console.error('Complete date error:', error);
    return res.status(500).json({ error: 'Failed to mark date completed' });
  }
});

export default router;
