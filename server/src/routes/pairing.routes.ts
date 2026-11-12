import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { checkAndAwardAchievements } from '../services/achievement.service.js';
import { getIO } from '../socket.js';

const router = Router();

export async function generateUniqueCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const exists = await prisma.relationship.findUnique({ where: { code } });
    if (!exists) {
      return code;
    }
  }
  return 'TOG' + Math.floor(100 + Math.random() * 900);
}

// GET or GENERATE INVITATION CODE
router.get('/code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        relationship: {
          include: {
            users: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    // If user already has a relationship, return its code
    if (user.relationship) {
      return res.json({
        code: user.relationship.code,
        relationship: user.relationship,
        isPaired: user.relationship.users.length >= 2,
        inviteUrl: `${clientUrl}/pair?code=${user.relationship.code}`,
      });
    }

    // If user does not have a relationship, create space with unique 6-character code
    const code = await generateUniqueCode();
    const newRelationship = await prisma.relationship.create({
      data: {
        code,
        status: 'ACTIVE',
        relationshipType: 'DATING',
        isLongDistance: false,
        users: {
          connect: { id: user.id },
        },
      },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return res.json({
      code: newRelationship.code,
      relationship: newRelationship,
      isPaired: false,
      inviteUrl: `${clientUrl}/pair?code=${newRelationship.code}`,
    });
  } catch (error) {
    console.error('Get/Generate pairing code error:', error);
    return res.status(500).json({ error: 'Failed to retrieve or generate invitation code' });
  }
});

// POST /code alias
router.post('/code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        relationship: {
          include: {
            users: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    if (user.relationship) {
      return res.json({
        code: user.relationship.code,
        relationship: user.relationship,
        isPaired: user.relationship.users.length >= 2,
        inviteUrl: `${clientUrl}/pair?code=${user.relationship.code}`,
      });
    }

    const code = await generateUniqueCode();
    const newRelationship = await prisma.relationship.create({
      data: {
        code,
        status: 'ACTIVE',
        relationshipType: 'DATING',
        isLongDistance: false,
        users: {
          connect: { id: user.id },
        },
      },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return res.json({
      code: newRelationship.code,
      relationship: newRelationship,
      isPaired: false,
      inviteUrl: `${clientUrl}/pair?code=${newRelationship.code}`,
    });
  } catch (error) {
    console.error('Generate pairing code POST error:', error);
    return res.status(500).json({ error: 'Failed to retrieve or generate invitation code' });
  }
});

// CREATE A COUPLE SPACE
router.post('/create-space', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        relationship: {
          include: {
            users: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    // If user already has an active couple space
    if (user.relationship) {
      if (user.relationship.users.length >= 2) {
        return res.status(400).json({
          error: 'You are already in an active couple space with your partner. You must unpair before creating a new space.',
          relationshipId: user.relationshipId,
          code: user.relationship.code,
        });
      }

      // Unpartnered space: return existing space and code
      return res.status(200).json({
        message: 'Your couple space is ready! Share your invitation code with your partner.',
        code: user.relationship.code,
        inviteUrl: `${clientUrl}/pair?code=${user.relationship.code}`,
        relationship: user.relationship,
      });
    }

    const code = await generateUniqueCode();
    const { relationshipType = 'DATING', anniversaryDate, isLongDistance = false } = req.body;

    const relationship = await prisma.relationship.create({
      data: {
        code,
        status: 'ACTIVE',
        relationshipType,
        isLongDistance,
        anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
        users: {
          connect: { id: user.id },
        },
      },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

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

// JOIN PARTNER'S SPACE (handles both /join-space and /join)
const handleJoinSpace = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invitation code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 4 || cleanCode.length > 10) {
      return res.status(400).json({ error: 'Invitation code must be a valid 6-character code' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        relationship: {
          include: { users: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 1. Validate Target Relationship Exists
    const targetRelationship = await prisma.relationship.findUnique({
      where: { code: cleanCode },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, profile: true },
        },
      },
    });

    if (!targetRelationship) {
      return res.status(404).json({ error: 'Invalid invitation code. No couple space found.' });
    }

    // 2. Prevent joining own space
    if (user.relationshipId === targetRelationship.id || user.relationship?.code === cleanCode) {
      return res.status(400).json({ error: 'You cannot join your own space. Share this code with your partner!' });
    }

    // 3. Prevent joining full space (2 partners max)
    if (targetRelationship.users.length >= 2) {
      return res.status(400).json({ error: 'This couple space already has two partners connected.' });
    }

    // 4. Prevent joining if already partnered with someone else
    if (user.relationship && user.relationship.users.length > 1) {
      return res.status(400).json({
        error: 'You already belong to an active couple space with another partner. Please unpair first.',
      });
    }

    // 5. Clean up old unpartnered/single space if user had one
    if (user.relationship && user.relationship.users.length <= 1) {
      const oldRelId = user.relationship.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { relationshipId: null },
      });
      await prisma.relationship.delete({ where: { id: oldRelId } }).catch(() => {});
    }

    const partner = targetRelationship.users[0];

    // Connect user to relationship
    const updatedRelationship = await prisma.relationship.update({
      where: { id: targetRelationship.id },
      data: {
        users: {
          connect: { id: user.id },
        },
        status: 'ACTIVE',
      },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, profile: true },
        },
      },
    });

    // Create notifications for both
    await prisma.notification.createMany({
      data: [
        {
          userId: user.id,
          type: 'PARTNER_INVITE',
          title: 'Connected with your partner!',
          message: `You are now connected with ${partner.firstName}. Welcome to your private couple sanctuary!`,
          link: '/',
        },
        {
          userId: partner.id,
          type: 'PARTNER_INVITE',
          title: 'Partner Joined!',
          message: `${user.firstName} has joined your couple space! Your journey together begins now.`,
          link: '/',
        },
      ],
    });

    // Check & award first spark
    await checkAndAwardAchievements(targetRelationship.id, user.id).catch(() => {});
    await checkAndAwardAchievements(targetRelationship.id, partner.id).catch(() => {});

    // Broadcast Real-Time Socket Event to Both Users
    const io = getIO();
    if (io) {
      const payloadToPartner = {
        partner: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
        },
        relationship: updatedRelationship,
      };
      const payloadToUser = {
        partner,
        relationship: updatedRelationship,
      };

      io.to(`rel_${targetRelationship.id}`).emit('partner_paired', payloadToPartner);
      io.to(`rel_${targetRelationship.id}`).emit('partner:joined', payloadToPartner);
      io.to(`user_${partner.id}`).emit('partner_paired', payloadToPartner);
      io.to(`user_${partner.id}`).emit('partner:joined', payloadToPartner);
      io.to(`user_${user.id}`).emit('partner_paired', payloadToUser);
      io.to(`user_${user.id}`).emit('partner:joined', payloadToUser);
    }

    return res.json({
      success: true,
      message: 'Successfully paired! Welcome to Togetherly.',
      relationship: updatedRelationship,
      partner,
    });
  } catch (error) {
    console.error('Join space error:', error);
    return res.status(500).json({ error: 'Failed to join couple space' });
  }
};

router.post('/join-space', authMiddleware, handleJoinSpace);
router.post('/join', authMiddleware, handleJoinSpace);

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
      return res.json({ isPaired: false, relationship: null, partner: null, code: null });
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

      const io = getIO();
      if (io) {
        io.to(`rel_${relationshipId}`).emit('partner_unpaired', { userId: user.id });
        io.to(`user_${otherUser.id}`).emit('partner_unpaired', { userId: user.id });
      }
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
