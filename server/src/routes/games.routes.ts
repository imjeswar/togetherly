import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest, requireRelationship } from '../middleware/auth.js';
import { recordRelationshipActivity } from '../services/streak.service.js';

const router = Router();

// GAME ROUNDS DATA DEFINITIONS
const GAME_QUESTIONS: Record<string, any[]> = {
  WHO_KNOWS: [
    {
      round: 1,
      subject: 'Alex',
      question: 'What is Alex’s absolute favorite comfort food?',
      options: ['Artisan Pizza', 'Creamy Ramen', 'Chocolate Brownies', 'Tacos & Guac'],
      correctAnswer: 'Artisan Pizza',
    },
    {
      round: 2,
      subject: 'Sarah',
      question: 'What is Sarah’s dream weekend getaway?',
      options: ['Cozy Mountain Cabin', 'Sunny Tropical Beach', 'European Historic City', 'Wellness Hot Springs Spa'],
      correctAnswer: 'Cozy Mountain Cabin',
    },
    {
      round: 3,
      subject: 'Alex',
      question: 'If Alex could acquire any superpower, what would it be?',
      options: ['Teleportation', 'Time Travel', 'Mind Reading', 'Invisibility'],
      correctAnswer: 'Teleportation',
    },
    {
      round: 4,
      subject: 'Sarah',
      question: 'What is Sarah’s go-to way to de-stress after a chaotic week?',
      options: ['Long Hot Bubble Bath & Book', 'Binge-watching Comfort Shows', 'Going for a Long Nature Walk', 'Baking Something Sweet'],
      correctAnswer: 'Long Hot Bubble Bath & Book',
    },
    {
      round: 5,
      subject: 'Both',
      question: 'What is our ultimate dream destination together?',
      options: ['Amalfi Coast & Rome', 'Kyoto Cherry Blossoms', 'Iceland Northern Lights', 'Santorini Sunset Villa'],
      correctAnswer: 'Amalfi Coast & Rome',
    },
  ],

  MORE_LIKELY: [
    {
      round: 1,
      statement: 'Who is more likely to fall asleep 15 minutes into a movie?',
    },
    {
      round: 2,
      statement: 'Who is more likely to buy unnecessary things because "it was on sale"?',
    },
    {
      round: 3,
      statement: 'Who is more likely to lose their phone or car keys inside the house?',
    },
    {
      round: 4,
      statement: 'Who is more dramatic when they catch a mild cold?',
    },
    {
      round: 5,
      statement: 'Who is more likely to suggest a spontaneous midnight snack run?',
    },
  ],

  THIS_OR_THAT: [
    { round: 1, optionA: 'Sunrise Coffee on Balcony', optionB: 'Midnight Wine by Fireplace' },
    { round: 2, optionA: 'Beach Resort Vacation', optionB: 'Mountain Cabin Adventure' },
    { round: 3, optionA: 'Cook Gourmet Dinner Together', optionB: 'Order Delivery & Snuggle in Bed' },
    { round: 4, optionA: 'Spontaneous Unplanned Road Trip', optionB: 'Detailed Color-Coded Itinerary' },
    { round: 5, optionA: 'Movie Night at Cinema', optionB: 'Blanket Fort Streaming Marathon' },
    { round: 6, optionA: 'Sweet Breakfast (Waffles/Pancakes)', optionB: 'Savory Breakfast (Eggs/Avocado)' },
    { round: 7, optionA: 'Deep Nighttime Talks', optionB: 'Playful Silly Banter' },
    { round: 8, optionA: 'Warm Summer Sunshine', optionB: 'Cozy Rainy Autumn Afternoon' },
  ],

  WOULD_YOU_RATHER: [
    {
      round: 1,
      optionA: 'Have a personal private chef cook all our meals forever',
      optionB: 'Have unlimited free first-class flights anywhere in the world',
    },
    {
      round: 2,
      optionA: 'Travel 100 years into the past together for a month',
      optionB: 'Travel 100 years into the future together for a month',
    },
    {
      round: 3,
      optionA: 'Live in a secluded lakeside cottage surrounded by pine trees',
      optionB: 'Live in a luxury penthouse overlooking the skyline of Paris',
    },
    {
      round: 4,
      optionA: 'Relive our first date all over again with our current memories',
      optionB: 'Take a sneak peek at our 50th wedding anniversary celebration',
    },
    {
      round: 5,
      optionA: 'Never be stuck in traffic again when traveling together',
      optionB: 'Always have the perfect temperature and lighting wherever we cuddle',
    },
  ],

  DRAW_DUEL: [
    { round: 1, prompt: 'Draw our dream cozy home', timeLimit: 60 },
    { round: 2, prompt: 'Draw each other’s favorite animal', timeLimit: 60 },
    { round: 3, prompt: 'Draw our favorite date memory', timeLimit: 60 },
  ],

  LOVE_QUIZ: [
    {
      round: 1,
      question: 'Where did we share our very first memorable kiss or date?',
      options: ['Under the city lights downtown', 'In the park by the lake', 'At the cozy Italian restaurant', 'In the car while it was raining'],
      correctAnswer: 'At the cozy Italian restaurant',
    },
    {
      round: 2,
      question: 'What is our official or unofficial song that always makes us think of each other?',
      options: ['Slow acoustic ballad', 'Indie folk love tune', 'Classic 90s pop track', 'Upbeat summer anthem'],
      correctAnswer: 'Indie folk love tune',
    },
    {
      round: 3,
      question: 'What was your first impression when you first saw me?',
      options: ['Instant butterflies and couldn’t stop staring', 'Loved your infectious smile', 'Thought you looked so stylish & warm', 'All of the above!'],
      correctAnswer: 'All of the above!',
    },
    {
      round: 4,
      question: 'Which holiday or trip was our most unforgettable adventure so far?',
      options: ['Summer coastal beach trip', 'Winter holiday cabin', 'First anniversary weekend', 'Spontaneous road trip'],
      correctAnswer: 'First anniversary weekend',
    },
    {
      round: 5,
      question: 'What is our strongest superpower as a couple?',
      options: ['Unconditional empathy and listening', 'Making each other laugh till we cry', 'Teamwork and supporting dreams', 'All of the above!'],
      correctAnswer: 'All of the above!',
    },
  ],

  WORD_GAME: [
    { round: 1, scrambled: 'VLEO', answer: 'LOVE', hint: 'The magical force that binds us' },
    { round: 2, scrambled: 'NMTCEAO', answer: 'ROMANCE', hint: 'Candles, whispers, and sweet gestures' },
    { round: 3, scrambled: 'LUEMTOSA', answer: 'SOULMATE', hint: 'The person your heart recognizes instantly' },
    { round: 4, scrambled: 'SSKI', answer: 'KISS', hint: 'A touch of the lips' },
    { round: 5, scrambled: 'ROFEVER', answer: 'FOREVER', hint: 'How long our memories will last' },
  ],
};

// GET ALL GAMES
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const games = await prisma.game.findMany({
      orderBy: { title: 'asc' },
    });
    return res.json({ games });
  } catch (error) {
    console.error('Games list error:', error);
    return res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// START OR GET ACTIVE SESSION FOR GAME
router.post('/:code/start', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const relationshipId = req.user!.relationshipId!;

    const game = await prisma.game.findUnique({
      where: { code },
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check for an existing in-progress session
    let session = await prisma.gameSession.findFirst({
      where: {
        gameId: game.id,
        relationshipId,
        status: 'IN_PROGRESS',
      },
      include: {
        responses: {
          include: { user: { select: { id: true, firstName: true, avatarUrl: true } } },
        },
      },
    });

    const rounds = GAME_QUESTIONS[code] || [];
    const totalRounds = rounds.length || 5;

    if (!session) {
      session = await prisma.gameSession.create({
        data: {
          gameId: game.id,
          relationshipId,
          status: 'IN_PROGRESS',
          currentRound: 1,
          totalRounds,
          gameState: JSON.stringify({
            scores: {},
            matches: 0,
          }),
        },
        include: {
          responses: {
            include: { user: { select: { id: true, firstName: true, avatarUrl: true } } },
          },
        },
      });
    }

    return res.json({
      session,
      game,
      roundsData: rounds,
    });
  } catch (error) {
    console.error('Start game error:', error);
    return res.status(500).json({ error: 'Failed to start game session' });
  }
});

// GET GAME SESSION DETAILS
router.get('/session/:sessionId', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const relationshipId = req.user!.relationshipId!;

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        game: true,
        responses: {
          include: { user: { select: { id: true, firstName: true, avatarUrl: true } } },
        },
      },
    });

    if (!session || session.relationshipId !== relationshipId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const rounds = GAME_QUESTIONS[session.game.code] || [];

    return res.json({
      session,
      game: session.game,
      roundsData: rounds,
    });
  } catch (error) {
    console.error('Session error:', error);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// SUBMIT PLAYER RESPONSE FOR ROUND
router.post('/session/:sessionId/respond', authMiddleware, requireRelationship, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { roundNumber, answer } = req.body;
    const userId = req.user!.id;
    const relationshipId = req.user!.relationshipId!;

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        game: true,
        responses: true,
      },
    });

    if (!session || session.relationshipId !== relationshipId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save user's response for this round
    const existingResponse = await prisma.gameResponse.findFirst({
      where: {
        sessionId,
        userId,
        roundNumber: Number(roundNumber),
      },
    });

    if (existingResponse) {
      await prisma.gameResponse.update({
        where: { id: existingResponse.id },
        data: { answer: String(answer) },
      });
    } else {
      await prisma.gameResponse.create({
        data: {
          sessionId,
          userId,
          roundNumber: Number(roundNumber),
          answer: String(answer),
        },
      });
    }

    // Check if partner also responded for this round
    const partner = await prisma.user.findFirst({
      where: { relationshipId, id: { not: userId } },
    });

    const partnerResponse = partner
      ? await prisma.gameResponse.findFirst({
          where: { sessionId, userId: partner.id, roundNumber: Number(roundNumber) },
        })
      : null;

    const roundComplete = Boolean(partnerResponse);

    // If both responded, check if game is complete or advance round
    let isGameComplete = false;
    let nextRound = session.currentRound;

    if (roundComplete) {
      if (session.currentRound >= session.totalRounds) {
        isGameComplete = true;
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: { status: 'COMPLETED' },
        });

        // Create Memory
        await prisma.memory.create({
          data: {
            relationshipId,
            title: `Game Night: ${session.game.title}`,
            description: `You both completed a round of ${session.game.title}!`,
            type: 'GAME',
            metadata: JSON.stringify({ gameCode: session.game.code }),
          },
        });

        // Record streak and points
        await recordRelationshipActivity(relationshipId, userId, 'GAME');
      } else {
        nextRound = session.currentRound + 1;
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: { currentRound: nextRound },
        });
      }
    }

    // Fetch refreshed session
    const updatedSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        game: true,
        responses: {
          include: { user: { select: { id: true, firstName: true, avatarUrl: true } } },
        },
      },
    });

    return res.json({
      session: updatedSession,
      roundComplete,
      isGameComplete,
      nextRound,
    });
  } catch (error) {
    console.error('Game respond error:', error);
    return res.status(500).json({ error: 'Failed to record response' });
  }
});

export default router;

