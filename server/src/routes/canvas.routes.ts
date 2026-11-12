import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest, requireRelationship } from '../middleware/auth.js';
import { recordRelationshipActivity } from '../services/streak.service.js';

const router = Router();

// GET CURRENT CANVAS & RECENT DRAWINGS
router.get('/', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;

    const latestDrawing = await prisma.drawing.findFirst({
      where: { relationshipId },
      orderBy: { updatedAt: 'desc' },
    });

    const drawings = await prisma.drawing.findMany({
      where: { relationshipId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.json({
      latestDrawing,
      drawings,
    });
  } catch (error) {
    console.error('Canvas get error:', error);
    return res.status(500).json({ error: 'Failed to fetch canvas' });
  }
});

// SAVE DRAWING TO DATABASE & MEMORIES
router.post('/save', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const userId = req.user!.id;
    const { title, canvasData, previewUrl, stickyNotes } = req.body;

    if (!canvasData) {
      return res.status(400).json({ error: 'Canvas data is required to save' });
    }

    const drawing = await prisma.drawing.create({
      data: {
        relationshipId,
        title: title || 'Our Shared Canvas',
        canvasData: typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData),
        previewUrl: previewUrl || null,
        stickyNotes: stickyNotes ? JSON.stringify(stickyNotes) : '[]',
        createdBy: req.user!.firstName,
      },
    });

    // Save as Memory
    await prisma.memory.create({
      data: {
        relationshipId,
        title: title || 'Shared Drawing Canvas',
        description: `Created with love by ${req.user!.firstName}.`,
        type: 'DRAWING',
        mediaUrl: previewUrl || null,
        metadata: JSON.stringify({ drawingId: drawing.id }),
      },
    });

    // Notify partner
    const partner = await prisma.user.findFirst({
      where: { relationshipId, id: { not: userId } },
    });

    if (partner) {
      await prisma.notification.create({
        data: {
          userId: partner.id,
          type: 'PHOTO_UPLOADED',
          title: 'New Canvas Drawing Saved!',
          message: `${req.user!.firstName} saved a collaborative drawing to your memories.`,
          link: '/connect?tab=canvas',
        },
      });
    }

    // Record activity
    const activityResult = await recordRelationshipActivity(relationshipId, userId, 'DRAWING');

    return res.status(201).json({
      message: 'Drawing saved successfully!',
      drawing,
      activityResult,
    });
  } catch (error) {
    console.error('Save canvas error:', error);
    return res.status(500).json({ error: 'Failed to save drawing' });
  }
});

export default router;

