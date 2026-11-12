import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest, requireRelationship } from '../middleware/auth.js';
import { recordRelationshipActivity } from '../services/streak.service.js';

const router = Router();

// Configure local uploads directory
const uploadDir = path.resolve('uploads/photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// GET DAILY PHOTO CHALLENGE
router.get('/daily', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const userId = req.user!.id;

    const PHOTO_PROMPTS = [
      'Show something that reminds you of me',
      'Your current view right now',
      'Something that made you smile today',
      'Your favorite moment this week',
      'Take a picture of something beautiful you saw',
      'A cozy or silly candid photo',
      'Your delicious meal or drink today',
    ];

    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const todayPrompt = PHOTO_PROMPTS[dayOfYear % PHOTO_PROMPTS.length];
    const todayDateStr = today.toISOString().split('T')[0];

    const photos = await prisma.photo.findMany({
      where: {
        relationshipId,
        challengeDate: todayDateStr,
      },
      include: {
        user: { select: { id: true, firstName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const partner = await prisma.user.findFirst({
      where: { relationshipId, id: { not: userId } },
    });

    return res.json({
      prompt: todayPrompt,
      date: todayDateStr,
      photos,
      hasUserUploaded: photos.some((p) => p.userId === userId),
      hasPartnerUploaded: partner ? photos.some((p) => p.userId === partner.id) : false,
    });
  } catch (error) {
    console.error('Daily photo challenge error:', error);
    return res.status(500).json({ error: 'Failed to fetch daily photo challenge' });
  }
});

// UPLOAD PHOTO (supports multipart file OR json url/base64)
router.post('/upload', authMiddleware, requireRelationship, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const relationshipId = req.user!.relationshipId!;
    const { caption, prompt, photoUrl: bodyUrl } = req.body;

    let finalPhotoUrl = bodyUrl;

    if (req.file) {
      finalPhotoUrl = `/uploads/photos/${req.file.filename}`;
    }

    if (!finalPhotoUrl) {
      return res.status(400).json({ error: 'Please provide a photo file or photo URL' });
    }

    const todayDateStr = new Date().toISOString().split('T')[0];

    const photo = await prisma.photo.create({
      data: {
        relationshipId,
        userId,
        prompt: prompt || 'Daily Photo Challenge',
        photoUrl: finalPhotoUrl,
        caption: caption || '',
        challengeDate: todayDateStr,
      },
      include: {
        user: { select: { id: true, firstName: true, avatarUrl: true } },
      },
    });

    // Create shared Memory
    await prisma.memory.create({
      data: {
        relationshipId,
        title: prompt || 'Photo Challenge',
        description: caption || `${req.user!.firstName} shared a photo for today's challenge.`,
        type: 'PHOTO',
        mediaUrl: finalPhotoUrl,
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
          title: 'New Photo Shared!',
          message: `${req.user!.firstName} uploaded a photo for "${prompt || 'today’s challenge'}".`,
          link: '/connect?tab=photos',
        },
      });
    }

    // Record activity streak
    const activityResult = await recordRelationshipActivity(relationshipId, userId, 'PHOTO');

    return res.status(201).json({
      message: 'Photo uploaded successfully!',
      photo,
      activityResult,
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// GET COUPLE PHOTO FEED
router.get('/feed', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;

    const photos = await prisma.photo.findMany({
      where: { relationshipId },
      include: {
        user: { select: { id: true, firstName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ photos });
  } catch (error) {
    console.error('Photo feed error:', error);
    return res.status(500).json({ error: 'Failed to fetch photo feed' });
  }
});

export default router;

