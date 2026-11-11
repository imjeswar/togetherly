import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest, requireRelationship } from '../middleware/auth.js';
import { recordRelationshipActivity } from '../services/streak.service.js';

const router = Router();

// GET CHAT MESSAGE HISTORY
router.get('/messages', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const userId = req.user!.id;

    const messages = await prisma.message.findMany({
      where: { relationshipId },
      include: {
        sender: {
          select: { id: true, firstName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // Mark partner's messages as read
    await prisma.message.updateMany({
      where: {
        relationshipId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return res.json({ messages });
  } catch (error) {
    console.error('Chat messages error:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// SEND A MESSAGE
router.post('/messages', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const senderId = req.user!.id;
    const { text, mediaUrl } = req.body;

    if (!text && !mediaUrl) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const message = await prisma.message.create({
      data: {
        relationshipId,
        senderId,
        text: text ? text.trim() : '',
        mediaUrl: mediaUrl || null,
        reactions: '{}',
      },
      include: {
        sender: { select: { id: true, firstName: true, avatarUrl: true } },
      },
    });

    return res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// REACT TO MESSAGE
router.post('/messages/:id/react', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user!.id;

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message || message.relationshipId !== req.user!.relationshipId) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const currentReactions: Record<string, string> = JSON.parse(message.reactions || '{}');
    if (currentReactions[userId] === emoji) {
      delete currentReactions[userId]; // Toggle off
    } else {
      currentReactions[userId] = emoji;
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { reactions: JSON.stringify(currentReactions) },
      include: {
        sender: { select: { id: true, firstName: true, avatarUrl: true } },
      },
    });

    return res.json({ message: updated });
  } catch (error) {
    console.error('React message error:', error);
    return res.status(500).json({ error: 'Failed to react to message' });
  }
});

// GET LOVE NOTES (both sent and received)
router.get('/love-notes', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const userId = req.user!.id;

    const notes = await prisma.loveNote.findMany({
      where: { relationshipId },
      include: {
        sender: { select: { id: true, firstName: true, avatarUrl: true } },
        receiver: { select: { id: true, firstName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Hide content of unopened notes received by current user (keeps the surprise!)
    const sanitized = notes.map((note) => {
      const isRecipient = note.receiverId === userId;
      const canView = !isRecipient || note.isOpened;

      return {
        id: note.id,
        title: note.title,
        unlockCondition: note.unlockCondition,
        theme: note.theme,
        unlockDate: note.unlockDate,
        isOpened: note.isOpened,
        openedAt: note.openedAt,
        sender: note.sender,
        receiver: note.receiver,
        createdAt: note.createdAt,
        content: canView ? note.content : null, // Hidden until opened!
      };
    });

    return res.json({ notes: sanitized });
  } catch (error) {
    console.error('Love notes error:', error);
    return res.status(500).json({ error: 'Failed to fetch love notes' });
  }
});

// CREATE LOVE NOTE
router.post('/love-notes', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const senderId = req.user!.id;
    const { title, content, unlockCondition = 'MISS_YOU', theme = 'romantic', unlockDate } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const partner = await prisma.user.findFirst({
      where: { relationshipId, id: { not: senderId } },
    });

    if (!partner) {
      return res.status(400).json({ error: 'You need an active partner to send a Love Note.' });
    }

    const note = await prisma.loveNote.create({
      data: {
        relationshipId,
        senderId,
        receiverId: partner.id,
        title: title.trim(),
        content: content.trim(),
        unlockCondition,
        theme,
        unlockDate: unlockDate ? new Date(unlockDate) : null,
        isOpened: false,
      },
      include: {
        sender: { select: { id: true, firstName: true, avatarUrl: true } },
        receiver: { select: { id: true, firstName: true, avatarUrl: true } },
      },
    });

    // Notify partner
    await prisma.notification.create({
      data: {
        userId: partner.id,
        type: 'LOVE_NOTE',
        title: 'New Sealed Love Note!',
        message: `${req.user!.firstName} left a sealed capsule: "${title}".`,
        link: '/connect?tab=notes',
      },
    });

    // Record activity
    const activityResult = await recordRelationshipActivity(relationshipId, senderId, 'LOVE_NOTE');

    return res.status(201).json({
      message: 'Love Note capsule created and sealed!',
      note,
      activityResult,
    });
  } catch (error) {
    console.error('Create love note error:', error);
    return res.status(500).json({ error: 'Failed to create love note' });
  }
});

// OPEN LOVE NOTE CAPSULE
router.post('/love-notes/:id/open', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const relationshipId = req.user!.relationshipId!;

    const note = await prisma.loveNote.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, firstName: true, avatarUrl: true } },
        receiver: { select: { id: true, firstName: true, avatarUrl: true } },
      },
    });

    if (!note || note.relationshipId !== relationshipId) {
      return res.status(404).json({ error: 'Love note not found' });
    }

    if (note.receiverId !== userId) {
      return res.status(403).json({ error: 'Only the designated recipient can open this love note' });
    }

    // Check if scheduled for future
    if (note.unlockDate && new Date(note.unlockDate) > new Date()) {
      return res.status(400).json({
        error: `This note is locked until ${new Date(note.unlockDate).toLocaleDateString()}`,
      });
    }

    const updatedNote = await prisma.loveNote.update({
      where: { id },
      data: {
        isOpened: true,
        openedAt: new Date(),
      },
      include: {
        sender: { select: { id: true, firstName: true, avatarUrl: true } },
        receiver: { select: { id: true, firstName: true, avatarUrl: true } },
      },
    });

    // Create a memory
    await prisma.memory.create({
      data: {
        relationshipId,
        title: `Opened Love Note: ${note.title}`,
        description: `Unsealed by ${req.user!.firstName}.`,
        type: 'LOVE_NOTE',
        metadata: JSON.stringify({ noteId: note.id }),
      },
    });

    return res.json({
      message: 'Love Note unsealed!',
      note: updatedNote,
    });
  } catch (error) {
    console.error('Open love note error:', error);
    return res.status(500).json({ error: 'Failed to open love note' });
  }
});

export default router;
