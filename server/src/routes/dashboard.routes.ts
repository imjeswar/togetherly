import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest, requireRelationship } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const relationshipId = req.user!.relationshipId!;

    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            dateOfBirth: true,
            profile: true,
          },
        },
      },
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    const partner = relationship.users.find((u) => u.id !== userId) || null;
    const currentUser = relationship.users.find((u) => u.id === userId)!;

    // Days together calculation
    const startDate = relationship.anniversaryDate || relationship.createdAt;
    const diffTime = Math.abs(Date.now() - new Date(startDate).getTime());
    const daysTogether = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    // Upcoming Anniversary countdown
    let nextAnniversaryDays = null;
    if (relationship.anniversaryDate) {
      const ann = new Date(relationship.anniversaryDate);
      const now = new Date();
      let targetAnn = new Date(now.getFullYear(), ann.getMonth(), ann.getDate());
      if (targetAnn < now) {
        targetAnn.setFullYear(now.getFullYear() + 1);
      }
      const annDiff = targetAnn.getTime() - now.getTime();
      nextAnniversaryDays = Math.ceil(annDiff / (1000 * 60 * 60 * 24));
    }

    // Today's Deterministic Daily Question
    // Calculate a daily index so both partners get the same question every day
    const allQuestionsCount = await prisma.question.count();
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const questionSkip = allQuestionsCount > 0 ? dayOfYear % allQuestionsCount : 0;

    const dailyQuestion = await prisma.question.findFirst({
      skip: questionSkip,
      include: {
        category: true,
        responses: {
          where: { relationshipId },
          include: {
            user: {
              select: { id: true, firstName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    // Responses privacy logic
    const userResponse = dailyQuestion?.responses.find((r) => r.userId === userId) || null;
    const partnerResponse = dailyQuestion?.responses.find((r) => r.userId === partner?.id) || null;
    const bothAnswered = Boolean(userResponse && partnerResponse);

    // Sanitize partner response if hidden
    const sanitizedDailyQuestion = dailyQuestion
      ? {
          id: dailyQuestion.id,
          text: dailyQuestion.text,
          category: dailyQuestion.category.name,
          intimacyLevel: dailyQuestion.intimacyLevel,
          bothAnswered,
          userAnswer: userResponse
            ? {
                id: userResponse.id,
                answer: userResponse.answer,
                reaction: userResponse.reaction,
                partnerComment: userResponse.partnerComment,
              }
            : null,
          partnerAnswer: partnerResponse
            ? bothAnswered
              ? {
                  id: partnerResponse.id,
                  answer: partnerResponse.answer,
                  reaction: partnerResponse.reaction,
                  partnerComment: partnerResponse.partnerComment,
                  user: partnerResponse.user,
                }
              : { hasAnswered: true }
            : null,
        }
      : null;

    // Today's Photo Challenge Prompt
    const PHOTO_PROMPTS = [
      'Show something that reminds you of me',
      'Your current view right now',
      'Something that made you smile today',
      'Your favorite comfort snack today',
      'Take a picture of something beautiful you saw',
      'A cozy or silly selfie just for us',
      'What you are wearing right now',
    ];
    const todayPrompt = PHOTO_PROMPTS[dayOfYear % PHOTO_PROMPTS.length];
    const todayDateStr = today.toISOString().split('T')[0];

    const todayPhotos = await prisma.photo.findMany({
      where: {
        relationshipId,
        challengeDate: todayDateStr,
      },
      include: {
        user: { select: { id: true, firstName: true, avatarUrl: true } },
      },
    });

    // Today's Streak record
    const todayStreak = await prisma.streak.findUnique({
      where: {
        relationshipId_date: {
          relationshipId,
          date: todayDateStr,
        },
      },
    });

    const completedActivities: string[] = todayStreak ? JSON.parse(todayStreak.activities || '[]') : [];

    // Recent Memories
    const recentMemories = await prisma.memory.findMany({
      where: { relationshipId },
      orderBy: { date: 'desc' },
      take: 4,
    });

    // Unopened Love Notes waiting for current user
    const pendingLoveNotesCount = await prisma.loveNote.count({
      where: {
        relationshipId,
        receiverId: userId,
        isOpened: false,
      },
    });

    // Unread notifications count
    const unreadNotificationsCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    // Daily Activity Recommendation
    const dailyActivities = [
      {
        type: 'QUESTION',
        title: 'Today’s Connection Question',
        description: 'Discover something new about each other today.',
        actionText: userResponse ? 'View Responses' : 'Answer Question',
        actionUrl: '/connect?tab=questions',
        isCompleted: Boolean(userResponse),
      },
      {
        type: 'PHOTO',
        title: 'Daily Photo Challenge',
        description: todayPrompt,
        actionText: 'Upload Photo',
        actionUrl: '/connect?tab=photos',
        isCompleted: todayPhotos.some((p) => p.userId === userId),
      },
      {
        type: 'GAME',
        title: 'Play a Quick Couple Game',
        description: 'Test your compatibility in Who Knows Whom Better or Draw Duel.',
        actionText: 'Play Now',
        actionUrl: '/games',
        isCompleted: completedActivities.includes('GAME'),
      },
      {
        type: 'LOVE_NOTE',
        title: 'Send a Love Capsule',
        description: 'Surprise your partner with an envelope to open when they miss you.',
        actionText: 'Write Note',
        actionUrl: '/connect?tab=notes',
        isCompleted: completedActivities.includes('LOVE_NOTE'),
      },
    ];

    return res.json({
      user: currentUser,
      partner,
      relationship: {
        id: relationship.id,
        code: relationship.code,
        streakCount: relationship.streakCount,
        couplePoints: relationship.couplePoints,
        relationshipType: relationship.relationshipType,
        isLongDistance: relationship.isLongDistance,
        daysTogether,
        nextAnniversaryDays,
      },
      dailyQuestion: sanitizedDailyQuestion,
      photoChallenge: {
        prompt: todayPrompt,
        photos: todayPhotos,
        hasUserUploaded: todayPhotos.some((p) => p.userId === userId),
        hasPartnerUploaded: partner ? todayPhotos.some((p) => p.userId === partner.id) : false,
      },
      dailyActivities,
      completedActivities,
      recentMemories,
      pendingLoveNotesCount,
      unreadNotificationsCount,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
