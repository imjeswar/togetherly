import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest, requireRelationship } from '../middleware/auth.js';
import { recordRelationshipActivity } from '../services/streak.service.js';

const router = Router();

// GET ALL CATEGORIES
router.get('/categories', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.questionCategory.findMany({
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    return res.json({ categories });
  } catch (error) {
    console.error('Categories error:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET QUESTIONS IN CATEGORY
router.get('/category/:categoryId', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId } = req.params;
    const relationshipId = req.user!.relationshipId!;
    const userId = req.user!.id;

    const questions = await prisma.question.findMany({
      where: { categoryId },
      include: {
        category: true,
        responses: {
          where: { relationshipId },
          include: {
            user: { select: { id: true, firstName: true, avatarUrl: true } },
          },
        },
      },
    });

    const partner = await prisma.user.findFirst({
      where: { relationshipId, id: { not: userId } },
    });

    const mapped = questions.map((q) => {
      const userResp = q.responses.find((r) => r.userId === userId);
      const partnerResp = partner ? q.responses.find((r) => r.userId === partner.id) : null;
      const bothAnswered = Boolean(userResp && partnerResp);

      return {
        id: q.id,
        text: q.text,
        category: q.category.name,
        intimacyLevel: q.intimacyLevel,
        bothAnswered,
        userAnswer: userResp
          ? {
              id: userResp.id,
              answer: userResp.answer,
              reaction: userResp.reaction,
              partnerComment: userResp.partnerComment,
            }
          : null,
        partnerAnswer: partnerResp
          ? bothAnswered
            ? {
                id: partnerResp.id,
                answer: partnerResp.answer,
                reaction: partnerResp.reaction,
                partnerComment: partnerResp.partnerComment,
                user: partnerResp.user,
              }
            : { hasAnswered: true }
          : null,
      };
    });

    return res.json({ questions: mapped });
  } catch (error) {
    console.error('Questions by category error:', error);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// GET TODAY'S DAILY QUESTION
router.get('/daily', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;
    const userId = req.user!.id;

    const allQuestionsCount = await prisma.question.count();
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const questionSkip = allQuestionsCount > 0 ? dayOfYear % allQuestionsCount : 0;

    const question = await prisma.question.findFirst({
      skip: questionSkip,
      include: {
        category: true,
        responses: {
          where: { relationshipId },
          include: {
            user: { select: { id: true, firstName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'No daily question available' });
    }

    const partner = await prisma.user.findFirst({
      where: { relationshipId, id: { not: userId } },
    });

    const userResp = question.responses.find((r) => r.userId === userId);
    const partnerResp = partner ? question.responses.find((r) => r.userId === partner.id) : null;
    const bothAnswered = Boolean(userResp && partnerResp);

    return res.json({
      question: {
        id: question.id,
        text: question.text,
        category: question.category.name,
        intimacyLevel: question.intimacyLevel,
        bothAnswered,
        userAnswer: userResp
          ? {
              id: userResp.id,
              answer: userResp.answer,
              reaction: userResp.reaction,
              partnerComment: userResp.partnerComment,
            }
          : null,
        partnerAnswer: partnerResp
          ? bothAnswered
            ? {
                id: partnerResp.id,
                answer: partnerResp.answer,
                reaction: partnerResp.reaction,
                partnerComment: partnerResp.partnerComment,
                user: partnerResp.user,
              }
            : { hasAnswered: true }
          : null,
      },
    });
  } catch (error) {
    console.error('Daily question error:', error);
    return res.status(500).json({ error: 'Failed to fetch daily question' });
  }
});

// SUBMIT ANSWER
router.post('/:questionId/answer', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    const { answer } = req.body;
    const userId = req.user!.id;
    const relationshipId = req.user!.relationshipId!;

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({ error: 'Answer cannot be empty' });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { category: true },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check partner's response
    const partner = await prisma.user.findFirst({
      where: { relationshipId, id: { not: userId } },
    });

    const partnerResponse = partner
      ? await prisma.questionResponse.findFirst({
          where: { questionId, userId: partner.id, relationshipId },
        })
      : null;

    // Both answer status
    const willBothBeAnswered = Boolean(partnerResponse);

    // Upsert user response
    const existingUserResponse = await prisma.questionResponse.findFirst({
      where: { questionId, userId, relationshipId },
    });

    let userResponse;
    if (existingUserResponse) {
      userResponse = await prisma.questionResponse.update({
        where: { id: existingUserResponse.id },
        data: {
          answer: answer.trim(),
          isHidden: !willBothBeAnswered,
        },
      });
    } else {
      userResponse = await prisma.questionResponse.create({
        data: {
          questionId,
          userId,
          relationshipId,
          answer: answer.trim(),
          isHidden: !willBothBeAnswered,
        },
      });
    }

    // If partner already responded, unhide partner response too!
    if (partnerResponse && partnerResponse.isHidden) {
      await prisma.questionResponse.update({
        where: { id: partnerResponse.id },
        data: { isHidden: false },
      });

      // Create a shared Memory for the couple
      await prisma.memory.create({
        data: {
          relationshipId,
          title: `Question: ${question.text.slice(0, 50)}...`,
          description: `You both shared answers to: "${question.text}"`,
          type: 'QUESTION',
          metadata: JSON.stringify({
            questionId,
            category: question.category.name,
          }),
        },
      });

      // Notify partner
      await prisma.notification.create({
        data: {
          userId: partner!.id,
          type: 'QUESTION_ANSWERED',
          title: 'Answers Revealed!',
          message: `${req.user!.firstName} answered today's question. You can now see both answers!`,
          link: '/connect?tab=questions',
        },
      });
    } else if (partner) {
      // Notify partner that current user answered
      await prisma.notification.create({
        data: {
          userId: partner.id,
          type: 'QUESTION_ANSWERED',
          title: 'Partner Answered!',
          message: `${req.user!.firstName} answered the question. Submit your answer to reveal both!`,
          link: '/connect?tab=questions',
        },
      });
    }

    // Record relationship activity
    const activityResult = await recordRelationshipActivity(relationshipId, userId, 'QUESTION');

    return res.json({
      message: willBothBeAnswered ? 'Both answers unlocked!' : 'Answer submitted! Waiting for partner to reveal.',
      userResponse,
      bothAnswered: willBothBeAnswered,
      activityResult,
    });
  } catch (error) {
    console.error('Answer question error:', error);
    return res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// ADD REACTION OR COMMENT TO RESPONSE
router.post('/response/:responseId/reaction', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { responseId } = req.params;
    const { reaction, comment } = req.body;

    const response = await prisma.questionResponse.findUnique({
      where: { id: responseId },
      include: { question: true, user: true },
    });

    if (!response || response.relationshipId !== req.user!.relationshipId) {
      return res.status(404).json({ error: 'Response not found or unauthorized' });
    }

    const updated = await prisma.questionResponse.update({
      where: { id: responseId },
      data: {
        reaction: reaction !== undefined ? reaction : response.reaction,
        partnerComment: comment !== undefined ? comment : response.partnerComment,
      },
    });

    return res.json({ message: 'Reaction saved', response: updated });
  } catch (error) {
    console.error('Reaction error:', error);
    return res.status(500).json({ error: 'Failed to save reaction' });
  }
});

// GET COMPLETED QUESTION HISTORY
router.get('/history', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const relationshipId = req.user!.relationshipId!;

    const responses = await prisma.questionResponse.findMany({
      where: {
        relationshipId,
        isHidden: false,
      },
      include: {
        question: { include: { category: true } },
        user: { select: { id: true, firstName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group responses by questionId
    const grouped = new Map<string, any>();
    for (const r of responses) {
      if (!grouped.has(r.questionId)) {
        grouped.set(r.questionId, {
          question: r.question,
          category: r.question.category.name,
          responses: [],
        });
      }
      grouped.get(r.questionId).responses.push({
        id: r.id,
        user: r.user,
        answer: r.answer,
        reaction: r.reaction,
        partnerComment: r.partnerComment,
        createdAt: r.createdAt,
      });
    }

    return res.json({ history: Array.from(grouped.values()) });
  } catch (error) {
    console.error('Question history error:', error);
    return res.status(500).json({ error: 'Failed to fetch question history' });
  }
});

export default router;

