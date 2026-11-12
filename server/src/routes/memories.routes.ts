import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest, requireRelationship } from '../middleware/auth.js';

const router = Router();

// GET MEMORIES TIMELINE & STATS
router.get('/', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const { type } = req.query;

    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
    });

    const whereClause: any = { relationshipId };
    if (type && typeof type === 'string' && type !== 'ALL') {
      whereClause.type = type;
    }

    const memories = await prisma.memory.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    // Days together calculation
    const startDate = relationship?.anniversaryDate || relationship?.createdAt || new Date();
    const diffTime = Math.abs(Date.now() - new Date(startDate).getTime());
    const daysTogether = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    // Counts by category
    const counts = await prisma.memory.groupBy({
      by: ['type'],
      where: { relationshipId },
      _count: true,
    });

    return res.json({
      daysTogether,
      anniversaryDate: relationship?.anniversaryDate,
      totalMemories: memories.length,
      categoryCounts: counts,
      memories,
    });
  } catch (error) {
    console.error('Memories error:', error);
    return res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// CREATE CUSTOM MILESTONE MEMORY
router.post('/', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const { title, description, date, mediaUrl, type = 'MILESTONE' } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required for milestone memory' });
    }

    const memory = await prisma.memory.create({
      data: {
        relationshipId,
        title: title.trim(),
        description: description ? description.trim() : null,
        date: date ? new Date(date) : new Date(),
        mediaUrl: mediaUrl || null,
        type,
      },
    });

    return res.status(201).json({
      message: 'Milestone memory created successfully!',
      memory,
    });
  } catch (error) {
    console.error('Create memory error:', error);
    return res.status(500).json({ error: 'Failed to create memory' });
  }
});

// GET MONTHLY CALENDAR ACTIVITIES
router.get('/calendar', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const { year, month } = req.query;

    const currentYear = year ? Number(year) : new Date().getFullYear();
    const currentMonth = month ? Number(month) : new Date().getMonth() + 1;

    // Build date range for month
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Fetch memories and streaks in that range
    const [memories, photos, streaks] = await Promise.all([
      prisma.memory.findMany({
        where: {
          relationshipId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.photo.findMany({
        where: {
          relationshipId,
          createdAt: { gte: startDate, lte: endDate },
        },
        include: { user: { select: { id: true, firstName: true } } },
      }),
      prisma.streak.findMany({
        where: { relationshipId },
      }),
    ]);

    // Group items by date string "YYYY-MM-DD"
    const calendarMap: Record<string, { memories: any[]; photos: any[]; activities: string[] }> = {};

    for (const m of memories) {
      const d = m.date.toISOString().split('T')[0];
      if (!calendarMap[d]) calendarMap[d] = { memories: [], photos: [], activities: [] };
      calendarMap[d].memories.push(m);
    }

    for (const p of photos) {
      const d = p.createdAt.toISOString().split('T')[0];
      if (!calendarMap[d]) calendarMap[d] = { memories: [], photos: [], activities: [] };
      calendarMap[d].photos.push(p);
    }

    for (const s of streaks) {
      if (!calendarMap[s.date]) calendarMap[s.date] = { memories: [], photos: [], activities: [] };
      const acts: string[] = JSON.parse(s.activities || '[]');
      calendarMap[s.date].activities.push(...acts);
    }

    return res.json({
      year: currentYear,
      month: currentMonth,
      calendar: calendarMap,
    });
  } catch (error) {
    console.error('Calendar error:', error);
    return res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

export default router;

