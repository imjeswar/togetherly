import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { checkAndAwardAchievements } from '../services/achievement.service.js';

const router = Router();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// CREATE A COUPLE SPACE
router.post('/create-space', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { relationship: true },
    });

    if (user?.relationshipId) {
      return res.status(400).json({
        error: 'You are already in a couple space. You must unpair before creating a new space.',
        relationshipId: user.relationshipId,
      });
    }

    let code = generateCode();
    // Ensure code uniqueness
    let exists = await prisma.relationship.findUnique({ where: { code } });
    while (exists) {
      code = generateCode();
      exists = await prisma.relationship.findUnique({ where: { code } });
    }

    const { relationshipType = 'DATING', anniversaryDate, isLongDistance = false } = req.body;

    const relationship = await prisma.relationship.create({
      data: {
        code,
        status: 'ACTIVE',
        relationshipType,
        isLongDistance,
        anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
        users: {
          connect: { id: user!.id },
        },
      },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const inviteUrl = `${clientUrl}/pair?code=${code}`;

    return res.status(201).json({
      message: 'Couple space created! Share your invitation code or link with your partner.',
      code,
      inviteUrl,
      relationship,
    });
  } catch (error) {
    console.error('Create space error:', error);
    return res.status(500).json({ error: 'Failed to create couple space' });
  }
});

// PREVIEW PARTNER BEFORE JOINING
router.post('/preview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Invitation code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const relationship = await prisma.relationship.findUnique({
      where: { code: cleanCode },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            profile: true,
          },
        },
      },
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Invalid invitation code. Please check and try again.' });
    }

    if (relationship.users.length >= 2) {
      return res.status(400).json({ error: 'This couple space is already full.' });
    }

    const partner = relationship.users[0];
    if (partner.id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot join your own space.' });
    }

    return res.json({
      code: relationship.code,
      relationshipType: relationship.relationshipType,
      partner: {
        id: partner.id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        avatarUrl: partner.avatarUrl,
        bio: partner.profile?.bio,
        loveLanguage: partner.profile?.loveLanguage,
      },
    });
  } catch (error) {
    console.error('Preview space error:', error);
    return res.status(500).json({ error: 'Failed to preview couple space' });
  }
});

// JOIN PARTNER'S SPACE
router.post('/join-space', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Invitation code is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (user?.relationshipId) {
      return res.status(400).json({
        error: 'You already belong to an active couple space. Please unpair first if you want to switch.',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const relationship = await prisma.relationship.findUnique({
      where: { code: cleanCode },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, profile: true },
        },
      },
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Invalid invitation code. Space not found.' });
    }

    if (relationship.users.length >= 2) {
      return res.status(400).json({ error: 'This couple space already has two partners connected.' });
    }

    if (relationship.users.some((u) => u.id === user!.id)) {
      return res.status(400).json({ error: 'You are already in this space.' });
    }

    // Connect user to relationship
    const updatedRelationship = await prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        users: {
          connect: { id: user!.id },
        },
      },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, profile: true },
        },
      },
    });

    const partner = relationship.users[0];

    // Create notifications for both
    await prisma.notification.createMany({
      data: [
        {
          userId: user!.id,
          type: 'PARTNER_INVITE',
          title: 'Connected with your partner!',
          message: `You are now connected with ${partner.firstName}. Welcome to your private couple sanctuary!`,
          link: '/',
        },
        {
          userId: partner.id,
          type: 'PARTNER_INVITE',
          title: 'Partner Joined!',
          message: `${user!.firstName} has joined your couple space! Your journey together begins now.`,
          link: '/',
        },
      ],
    });

    // Check & award first spark
    await checkAndAwardAchievements(relationship.id, user!.id);
    await checkAndAwardAchievements(relationship.id, partner.id);

    return res.json({
      message: 'Successfully paired! Welcome to Togetherly.',
      relationship: updatedRelationship,
      partner,
    });
  } catch (error) {
    console.error('Join space error:', error);
    return res.status(500).json({ error: 'Failed to join couple space' });
  }
});

// GET PAIRING STATUS
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        relationship: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!user?.relationship) {
      return res.json({ isPaired: false, relationship: null, partner: null });
    }

    const partner = user.relationship.users.find((u) => u.id !== user.id) || null;
    const isPaired = Boolean(partner);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const inviteUrl = `${clientUrl}/pair?code=${user.relationship.code}`;

    return res.json({
      isPaired,
      code: user.relationship.code,
      inviteUrl,
      relationship: user.relationship,
      partner,
    });
  } catch (error) {
    console.error('Pairing status error:', error);
    return res.status(500).json({ error: 'Failed to retrieve pairing status' });
  }
});

// UNPAIR PARTNER
router.post('/unpair', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { confirmUnpair } = req.body;
    if (!confirmUnpair) {
      return res.status(400).json({
        error: 'Confirmation required. Unpairing disconnects your shared couple space.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { relationship: { include: { users: true } } },
    });

    if (!user?.relationshipId) {
      return res.status(400).json({ error: 'You are not currently in an active couple space.' });
    }

    const relationshipId = user.relationshipId;

    // Disconnect user from relationship
    await prisma.user.update({
      where: { id: user.id },
      data: { relationshipId: null },
    });

    // Notify other user if exists
    const otherUser = user.relationship?.users.find((u) => u.id !== user.id);
    if (otherUser) {
      await prisma.notification.create({
        data: {
          userId: otherUser.id,
          type: 'PARTNER_INVITE',
          title: 'Partner has unpaired',
          message: `${user.firstName} has unlinked from the couple space.`,
        },
      });
    }

    return res.json({
      message: 'You have successfully unpaired from the couple space.',
    });
  } catch (error) {
    console.error('Unpair error:', error);
    return res.status(500).json({ error: 'Failed to unpair' });
  }
});

export default router;
