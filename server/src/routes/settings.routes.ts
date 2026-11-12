import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET USER SETTINGS
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user!.id },
      update: {},
      create: {
        userId: req.user!.id,
        theme: 'dark',
        pushNotifications: true,
        emailNotifications: true,
        soundEffects: true,
      },
    });
    return res.json({ settings });
  } catch (error) {
    console.error('Settings error:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// UPDATE SETTINGS
router.put('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { pushNotifications, emailNotifications, soundEffects, theme, privacyMode } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user!.id },
      update: {
        pushNotifications: pushNotifications !== undefined ? pushNotifications : undefined,
        emailNotifications: emailNotifications !== undefined ? emailNotifications : undefined,
        soundEffects: soundEffects !== undefined ? soundEffects : undefined,
        theme: theme !== undefined ? theme : undefined,
        privacyMode: privacyMode !== undefined ? privacyMode : undefined,
      },
      create: {
        userId: req.user!.id,
        pushNotifications: pushNotifications ?? true,
        emailNotifications: emailNotifications ?? true,
        soundEffects: soundEffects ?? true,
        theme: theme ?? 'dark',
        privacyMode: privacyMode ?? false,
      },
    });

    return res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// EXPORT ALL COUPLE DATA (JSON)
router.get('/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const relationshipId = req.user!.relationshipId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        settings: true,
        achievements: { include: { achievement: true } },
      },
    });

    let relationshipData = null;
    if (relationshipId) {
      relationshipData = await prisma.relationship.findUnique({
        where: { id: relationshipId },
        include: {
          users: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          photos: true,
          memories: true,
          drawings: true,
          messages: true,
          loveNotes: true,
          savedDateIdeas: { include: { dateIdea: true } },
        },
      });
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      platform: 'Togetherly - A little moment. A stronger connection.',
      user,
      coupleWorkspace: relationshipData,
    };

    res.setHeader('Content-Disposition', 'attachment; filename="togetherly-data-export.json"');
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(exportPayload, null, 2));
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;

