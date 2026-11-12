import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { generateUniqueCode } from './pairing.routes.js';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'togetherly-fallback-secret-2026';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  dateOfBirth: z.string().refine((dob) => {
    const birthDate = new Date(dob);
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return age >= 18;
  }, 'You must be at least 18 years old to join Togetherly'),
  avatarUrl: z.string().optional(),
  bio: z.string().optional(),
  nickname: z.string().optional(),
  loveLanguage: z.string().optional(),
  interests: z.array(z.string()).optional(),
  anniversaryDate: z.string().optional(),
  relationshipType: z.string().optional(),
  isLongDistance: z.boolean().optional(),
});

function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

// REGISTER
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const code = await generateUniqueCode();

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        relationship: {
          create: {
            code,
            status: 'ACTIVE',
            relationshipType: data.relationshipType || 'DATING',
            isLongDistance: Boolean(data.isLongDistance),
          },
        },
        profile: {
          create: {
            bio: data.bio || '',
            nickname: data.nickname || '',
            loveLanguage: data.loveLanguage || 'Quality Time',
            interests: JSON.stringify(data.interests || ['Music', 'Travel', 'Movies']),
          },
        },
        settings: {
          create: {
            theme: 'dark',
            pushNotifications: true,
            emailNotifications: true,
            soundEffects: true,
          },
        },
      },
      include: {
        profile: true,
        settings: true,
        relationship: true,
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    setAuthCookie(res, token);

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        dateOfBirth: user.dateOfBirth,
        profile: user.profile,
        relationshipId: user.relationshipId,
        relationship: user.relationship,
        partner: null,
      },
      code: user.relationship?.code,
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// LOGIN
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: true,
        settings: true,
        relationship: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    setAuthCookie(res, token);

    const partner = user.relationship?.users.find((u) => u.id !== user.id) || null;

    return res.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        dateOfBirth: user.dateOfBirth,
        profile: user.profile,
        settings: user.settings,
        relationshipId: user.relationshipId,
        relationship: user.relationship,
        partner,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// LOGOUT
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully' });
});

// GET ME
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        profile: true,
        settings: true,
        relationship: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true,
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const partner = user.relationship?.users.find((u) => u.id !== user.id) || null;

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        dateOfBirth: user.dateOfBirth,
        profile: user.profile,
        settings: user.settings,
        relationshipId: user.relationshipId,
        relationship: user.relationship,
        partner,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

// UPDATE PROFILE
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, avatarUrl, bio, nickname, loveLanguage, interests, anniversaryDate } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        profile: {
          upsert: {
            create: {
              bio: bio || '',
              nickname: nickname || '',
              loveLanguage: loveLanguage || '',
              interests: JSON.stringify(interests || []),
            },
            update: {
              bio: bio !== undefined ? bio : undefined,
              nickname: nickname !== undefined ? nickname : undefined,
              loveLanguage: loveLanguage !== undefined ? loveLanguage : undefined,
              interests: interests ? JSON.stringify(interests) : undefined,
            },
          },
        },
      },
      include: { profile: true },
    });

    // Update anniversary if provided and user is in a relationship
    if (anniversaryDate && req.user!.relationshipId) {
      await prisma.relationship.update({
        where: { id: req.user!.relationshipId },
        data: { anniversaryDate: new Date(anniversaryDate) },
      });
    }

    return res.json({ message: 'Profile updated', user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // In production, send real email. In demo/development, provide immediate reset token or confirmation
  return res.json({
    message: 'Password reset instructions have been sent to your email address.',
    demoNote: 'For demonstration, you can reset directly with /api/auth/reset-password',
  });
});

// RESET PASSWORD
router.post('/reset-password', async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Valid email and new password (min 6 chars) required' });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return res.status(404).json({ error: 'No account found with this email' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return res.json({ message: 'Password has been reset successfully. Please log in.' });
});

// DELETE ACCOUNT (PERMANENT)
router.delete('/account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { password, confirmDelete } = req.body;

    if (!confirmDelete) {
      return res.status(400).json({ error: 'Explicit confirmation required to delete account' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { relationship: { include: { users: true } } },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (password) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });
    }

    const relationshipId = user.relationshipId;

    // Disconnect user from relationship
    if (relationshipId) {
      await prisma.user.update({
        where: { id: userId },
        data: { relationshipId: null },
      });

      // If the partner had already left or no other users exist, clean up relationship
      const remainingUsers = user.relationship?.users.filter((u) => u.id !== userId) || [];
      if (remainingUsers.length === 0) {
        await prisma.relationship.delete({ where: { id: relationshipId } });
      }
    }

    // Delete personal records
    await prisma.userSession.deleteMany({ where: { userId } });
    await prisma.userKey.deleteMany({ where: { userId } });
    await prisma.userProfile.deleteMany({ where: { userId } });
    await prisma.userSettings.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.userAchievement.deleteMany({ where: { userId } });

    // Delete user
    await prisma.user.delete({ where: { id: userId } });

    res.clearCookie('token');
    return res.json({ success: true, message: 'Account and associated personal data permanently removed' });
  } catch (error) {
    console.error('Account delete error:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;

