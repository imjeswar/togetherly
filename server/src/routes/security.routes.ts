import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// =========================================================================
// 1. TWO-FACTOR AUTHENTICATION (2FA - TOTP RFC 6238 COMPATIBLE)
// =========================================================================

// Helper to generate Base32 secret
function generateBase32Secret(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += chars[bytes[i] % chars.length];
  }
  return secret;
}

// Helper to verify TOTP code
function verifyTOTP(secret: string, code: string, window = 1): boolean {
  if (!secret || !code || code.length !== 6) return false;

  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const currentCounter = Math.floor(epoch / timeStep);

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const counter = currentCounter + errorWindow;
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'utf-8'));
    hmac.update(buf);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0xf;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const generatedCode = (binary % 1000000).toString().padStart(6, '0');
    if (crypto.timingSafeEqual(Buffer.from(generatedCode), Buffer.from(code))) {
      return true;
    }
  }

  return false;
}

// Generate 2FA Secret & Backup Codes
router.post('/2fa/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = generateBase32Secret();
    const otpAuthUrl = `otpauth://totp/Togetherly:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Togetherly`;

    // Generate 8 alphanumeric backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    // Hash backup codes before saving
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, 8))
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
      },
    });

    return res.json({
      secret,
      otpAuthUrl,
      backupCodes,
      message: '2FA setup initialized. Please verify with a 6-digit code to enable.',
    });
  } catch (error) {
    console.error('2FA generate error:', error);
    return res.status(500).json({ error: 'Failed to initialize 2FA' });
  }
});

// Verify 2FA & Enable
router.post('/2fa/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code, isBackupCode } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA has not been generated for this account' });
    }

    let isValid = false;

    if (isBackupCode) {
      const hashedCodes: string[] = JSON.parse(user.twoFactorBackupCodes || '[]');
      let matchedIndex = -1;
      for (let i = 0; i < hashedCodes.length; i++) {
        if (await bcrypt.compare(code.trim().toUpperCase(), hashedCodes[i])) {
          isValid = true;
          matchedIndex = i;
          break;
        }
      }

      if (isValid && matchedIndex > -1) {
        // Burn used backup code
        hashedCodes.splice(matchedIndex, 1);
        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorBackupCodes: JSON.stringify(hashedCodes) },
        });
      }
    } else {
      isValid = verifyTOTP(user.twoFactorSecret, code.trim());
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 2FA verification code' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    // Create security notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'ACHIEVEMENT',
        title: 'Two-Factor Authentication Enabled',
        message: 'Your Togetherly sanctuary is now guarded with biometric and 2FA security.',
      },
    });

    return res.json({
      success: true,
      twoFactorEnabled: true,
      message: 'Two-Factor Authentication is now actively protecting your account!',
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return res.status(500).json({ error: 'Failed to verify 2FA code' });
  }
});

// Disable 2FA
router.post('/2fa/disable', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (password) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: '[]',
      },
    });

    return res.json({ success: true, message: 'Two-Factor Authentication disabled' });
  } catch (error) {
    console.error('2FA disable error:', error);
    return res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// =========================================================================
// 2. DEVICE & SESSION MANAGEMENT
// =========================================================================

// Record or update active session
router.post('/sessions/ping', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { deviceId, deviceName, os, pushToken } = req.body;

    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });

    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';

    // Find existing session
    const existing = await prisma.userSession.findFirst({
      where: { userId, deviceId },
    });

    let session;
    let isNewDevice = false;

    if (existing) {
      session = await prisma.userSession.update({
        where: { id: existing.id },
        data: {
          deviceName: deviceName || existing.deviceName,
          os: os || existing.os,
          ipAddress,
          pushToken: pushToken || existing.pushToken,
          lastActiveAt: new Date(),
          isRevoked: false,
        },
      });
    } else {
      isNewDevice = true;
      session = await prisma.userSession.create({
        data: {
          userId,
          deviceId,
          deviceName: deviceName || 'Mobile Device',
          os: os || 'Unknown',
          ipAddress,
          pushToken: pushToken || null,
        },
      });

      // Notify user of new device login
      await prisma.notification.create({
        data: {
          userId,
          type: 'PARTNER_INVITE',
          title: 'New Device Sign-in',
          message: `Togetherly was accessed from a new ${os || 'device'} (${deviceName || 'Device'}).`,
        },
      });
    }

    return res.json({ session, isNewDevice });
  } catch (error) {
    console.error('Session ping error:', error);
    return res.status(500).json({ error: 'Failed to update device session' });
  }
});

// List active user sessions
router.get('/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const currentDeviceId = req.headers['x-device-id']?.toString() || '';

    const sessions = await prisma.userSession.findMany({
      where: { userId, isRevoked: false },
      orderBy: { lastActiveAt: 'desc' },
    });

    const mapped = sessions.map((s) => ({
      id: s.id,
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      os: s.os,
      ipAddress: s.ipAddress,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.deviceId === currentDeviceId,
    }));

    return res.json({ sessions: mapped });
  } catch (error) {
    console.error('Get sessions error:', error);
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Revoke a session
router.post('/sessions/:id/revoke', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.userSession.updateMany({
      where: { id, userId },
      data: { isRevoked: true },
    });

    return res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    return res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// =========================================================================
// 3. END-TO-END ENCRYPTION (E2EE) PUBLIC KEY DIRECTORY
// =========================================================================

// Publish or update device public key
router.post('/e2ee/keys', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { publicKey, keyAlgorithm = 'ECDH-X25519-AES-GCM' } = req.body;

    if (!publicKey) {
      return res.status(400).json({ error: 'Public key string is required' });
    }

    const key = await prisma.userKey.upsert({
      where: { userId },
      update: {
        publicKey,
        keyAlgorithm,
      },
      create: {
        userId,
        publicKey,
        keyAlgorithm,
      },
    });

    return res.json({
      success: true,
      message: 'E2EE Public key registered in relationship key directory',
      key: {
        id: key.id,
        keyAlgorithm: key.keyAlgorithm,
        updatedAt: key.updatedAt,
      },
    });
  } catch (error) {
    console.error('Register E2EE key error:', error);
    return res.status(500).json({ error: 'Failed to register public key' });
  }
});

// Retrieve partner's verified public key
router.get('/e2ee/partner-key', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId;
    const userId = req.user!.id;

    if (!relationshipId) {
      return res.status(400).json({ error: 'User is not in a paired relationship' });
    }

    const partner = await prisma.user.findFirst({
      where: { relationshipId, id: { not: userId } },
      include: { e2eeKey: true },
    });

    if (!partner || !partner.e2eeKey) {
      return res.status(404).json({
        error: 'Partner has not registered an E2EE public key on their device yet.',
        hasPartnerKey: false,
      });
    }

    return res.json({
      partnerId: partner.id,
      partnerName: partner.firstName,
      publicKey: partner.e2eeKey.publicKey,
      keyAlgorithm: partner.e2eeKey.keyAlgorithm,
      updatedAt: partner.e2eeKey.updatedAt,
      hasPartnerKey: true,
    });
  } catch (error) {
    console.error('Get partner key error:', error);
    return res.status(500).json({ error: 'Failed to retrieve partner key' });
  }
});

export default router;

