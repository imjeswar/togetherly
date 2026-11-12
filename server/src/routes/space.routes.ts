import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { deviceAuthMiddleware, DeviceAuthRequest } from '../middleware/deviceAuth.js';
import { getIO, isDeviceOnline } from '../socket.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'togetherly-secret-key-couples-platform-2026-super-secure';

// Helper: Generate collision-free 6-character code
export async function generateInvitationCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous 0, O, 1, I
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const exists = await prisma.invitationCode.findUnique({ where: { code } });
    if (!exists) {
      return code;
    }
  }
  return 'TOG' + Math.floor(100 + Math.random() * 900);
}

// 1. CREATE YOUR SPACE
router.post('/create', async (req, res) => {
  try {
    const { deviceId, nickname = 'My Love', platform = 'mobile' } = req.body;

    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      return res.status(400).json({ error: 'Valid device identifier required' });
    }

    const cleanDeviceId = deviceId.trim();

    // Check if this device is already in an active space with a partner
    const existingDevice = await prisma.pairedDevice.findUnique({
      where: { deviceId: cleanDeviceId },
      include: {
        space: {
          include: { devices: true },
        },
      },
    });

    if (existingDevice && existingDevice.space && existingDevice.space.status === 'ACTIVE') {
      // If already paired with partner, reuse current space
      if (existingDevice.space.devices.length >= 2) {
        const token = jwt.sign(
          { deviceId: cleanDeviceId, spaceId: existingDevice.space.id },
          JWT_SECRET,
          { expiresIn: '365d' }
        );
        return res.json({
          token,
          spaceId: existingDevice.space.id,
          message: 'Existing active space restored',
          isPaired: true,
          device: {
            id: existingDevice.id,
            deviceId: cleanDeviceId,
            nickname: existingDevice.nickname,
          },
        });
      }
    }

    // Generate unique 6-character invitation code
    const code = await generateInvitationCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours validity

    // Create CoupleSpace, PairedDevice, and InvitationCode in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create fresh space
      const space = await tx.coupleSpace.create({
        data: {
          name: 'Our Little Space',
          status: 'ACTIVE',
        },
      });

      // Upsert PairedDevice linked to this space
      const device = await tx.pairedDevice.upsert({
        where: { deviceId: cleanDeviceId },
        update: {
          spaceId: space.id,
          nickname: nickname.trim(),
          platform,
          lastActiveAt: new Date(),
        },
        create: {
          deviceId: cleanDeviceId,
          spaceId: space.id,
          nickname: nickname.trim(),
          platform,
        },
      });

      // Create InvitationCode
      const invitation = await tx.invitationCode.create({
        data: {
          code,
          spaceId: space.id,
          createdByDeviceId: cleanDeviceId,
          expiresAt,
        },
      });

      return { space, device, invitation };
    });

    const token = jwt.sign(
      { deviceId: cleanDeviceId, spaceId: result.space.id },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    const clientUrl = process.env.CLIENT_URL || 'https://togetherly-ruby-pi.vercel.app';
    const inviteUrl = `${clientUrl}/join?code=${code}`;

    return res.status(201).json({
      token,
      spaceId: result.space.id,
      invitationCode: code,
      inviteUrl,
      expiresAt: result.invitation.expiresAt,
      isPaired: false,
      device: {
        id: result.device.id,
        deviceId: cleanDeviceId,
        nickname: result.device.nickname,
      },
    });
  } catch (error: any) {
    console.error('Create space error:', error);
    return res.status(500).json({ error: 'Failed to create your private space' });
  }
});

// 2. JOIN YOUR PARTNER'S SPACE
router.post('/join', async (req, res) => {
  try {
    const { code, deviceId, nickname = 'My Darling', platform = 'mobile' } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invitation code is required' });
    }

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'Valid device identifier required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanDeviceId = deviceId.trim();

    // Find invitation
    const invitation = await prisma.invitationCode.findUnique({
      where: { code: cleanCode },
      include: {
        space: {
          include: {
            devices: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation code not found. Please double-check the 6 characters.' });
    }

    if (invitation.isUsed) {
      return res.status(400).json({ error: 'This invitation code has already been used.' });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ error: 'This invitation code has expired. Please ask your partner to generate a new code.' });
    }

    if (invitation.space.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'This couple space is no longer active.' });
    }

    // Prevent more than 2 devices in a couple sanctuary
    if (invitation.space.devices.length >= 2) {
      return res.status(400).json({ error: 'This couple sanctuary is already full (maximum 2 partners).' });
    }

    // Add device to space and mark invitation as consumed in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Upsert device 2
      const device = await tx.pairedDevice.upsert({
        where: { deviceId: cleanDeviceId },
        update: {
          spaceId: invitation.spaceId,
          nickname: nickname.trim(),
          platform,
          lastActiveAt: new Date(),
        },
        create: {
          deviceId: cleanDeviceId,
          spaceId: invitation.spaceId,
          nickname: nickname.trim(),
          platform,
        },
      });

      // Mark code used
      await tx.invitationCode.update({
        where: { id: invitation.id },
        data: {
          isUsed: true,
          usedByDeviceId: cleanDeviceId,
        },
      });

      return device;
    });

    // Partner info (creator device)
    const partnerDevice = invitation.space.devices.find((d) => d.deviceId !== cleanDeviceId);

    // Sign device JWT
    const token = jwt.sign(
      { deviceId: cleanDeviceId, spaceId: invitation.spaceId },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    // Emit real-time pairing event to space room
    const io = getIO();
    if (io) {
      io.to(`space_${invitation.spaceId}`).emit('partner_joined', {
        spaceId: invitation.spaceId,
        partner: {
          deviceId: cleanDeviceId,
          nickname: result.nickname,
        },
      });
      // Also emit on legacy channel for existing mobile apps
      io.to(`rel_${invitation.spaceId}`).emit('partner_paired', {
        relationshipId: invitation.spaceId,
        partner: {
          firstName: result.nickname,
        },
      });
    }

    return res.json({
      token,
      spaceId: invitation.spaceId,
      message: 'Successfully paired into couple sanctuary!',
      isPaired: true,
      partner: partnerDevice
        ? {
            id: partnerDevice.id,
            nickname: partnerDevice.nickname,
            avatarUrl: partnerDevice.avatarUrl,
          }
        : null,
      device: {
        id: result.id,
        deviceId: cleanDeviceId,
        nickname: result.nickname,
      },
    });
  } catch (error: any) {
    console.error('Join space error:', error);
    return res.status(500).json({ error: 'Failed to join partner space' });
  }
});

// 3. GET SPACE STATUS & SANCTUARY INFO
router.get('/status', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const space = await prisma.coupleSpace.findUnique({
      where: { id: req.space!.id },
      include: {
        devices: {
          select: {
            id: true,
            deviceId: true,
            nickname: true,
            avatarUrl: true,
            platform: true,
            lastActiveAt: true,
          },
        },
        invitations: {
          where: { isUsed: false, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }

    const selfDevice = space.devices.find((d) => d.deviceId === req.device!.deviceId);
    const partnerDevice = space.devices.find((d) => d.deviceId !== req.device!.deviceId);
    const isPaired = Boolean(partnerDevice);
    let partnerIsOnline = partnerDevice ? isDeviceOnline(space.id, partnerDevice.deviceId) : false;
    // Fallback: If memory presence was cleared due to server restart, check recent lastActiveAt (< 45s)
    if (!partnerIsOnline && partnerDevice?.lastActiveAt) {
      const diffSec = (Date.now() - new Date(partnerDevice.lastActiveAt).getTime()) / 1000;
      if (diffSec < 45) {
        partnerIsOnline = true;
      }
    }

    // Asynchronously refresh self device lastActiveAt
    prisma.pairedDevice
      .updateMany({
        where: { deviceId: req.device!.deviceId, spaceId: space.id },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => {});

    const clientUrl = process.env.CLIENT_URL || 'https://togetherly-ruby-pi.vercel.app';
    const activeInvitation = space.invitations[0]
      ? {
          code: space.invitations[0].code,
          expiresAt: space.invitations[0].expiresAt,
          inviteUrl: `${clientUrl}/join?code=${space.invitations[0].code}`,
        }
      : null;

    // Days together calculation
    const daysTogether = Math.max(
      1,
      Math.floor((Date.now() - new Date(space.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );

    return res.json({
      spaceId: space.id,
      name: space.name,
      status: space.status,
      createdAt: space.createdAt,
      daysTogether,
      isPaired,
      device: selfDevice,
      partner: partnerDevice
        ? {
            ...partnerDevice,
            isOnline: partnerIsOnline,
          }
        : null,
      invitation: activeInvitation,
    });
  } catch (error: any) {
    console.error('Space status error:', error);
    return res.status(500).json({ error: 'Failed to fetch sanctuary status' });
  }
});

// 4. UPDATE DEVICE PROFILE
router.put('/profile', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const { nickname, avatarUrl } = req.body;

    const updated = await prisma.pairedDevice.update({
      where: { id: req.device!.id },
      data: {
        ...(nickname !== undefined && { nickname: String(nickname).trim() }),
        ...(avatarUrl !== undefined && { avatarUrl: String(avatarUrl).trim() }),
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        deviceId: true,
        nickname: true,
        avatarUrl: true,
        platform: true,
      },
    });

    // Notify partner in space
    const io = getIO();
    if (io) {
      io.to(`space_${req.space!.id}`).emit('partner_profile_updated', {
        partner: updated,
      });
    }

    return res.json({ message: 'Profile updated', device: updated });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 5. EXPLICIT UNPAIR
router.post('/unpair', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    await prisma.coupleSpace.update({
      where: { id: req.space!.id },
      data: { status: 'UNPAIRED' },
    });

    const io = getIO();
    if (io) {
      io.to(`space_${req.space!.id}`).emit('space_unpaired', {
        spaceId: req.space!.id,
        reason: 'A partner has unpaired this couple sanctuary.',
      });
    }

    return res.json({
      success: true,
      message: 'You have unpaired from this sanctuary. Your device is now free to create or join a new space.',
    });
  } catch (error: any) {
    console.error('Unpair error:', error);
    return res.status(500).json({ error: 'Failed to unpair sanctuary' });
  }
});

export default router;

