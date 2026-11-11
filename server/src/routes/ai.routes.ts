import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AIService } from '../services/ai.service.js';

const router = Router();

router.post('/question', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { category, intimacyLevel, mood } = req.body;
    const result = await AIService.generateQuestion({
      category,
      intimacyLevel: Number(intimacyLevel) || 2,
      mood: mood || 'romantic',
    });
    return res.json(result);
  } catch (error) {
    console.error('AI question error:', error);
    return res.status(500).json({ error: 'Failed to generate question' });
  }
});

router.post('/date', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { budget, locationType, duration, interests, weather } = req.body;
    const result = await AIService.generateDateIdea({
      budget,
      locationType,
      duration,
      interests,
      weather,
    });
    return res.json(result);
  } catch (error) {
    console.error('AI date error:', error);
    return res.status(500).json({ error: 'Failed to generate date idea' });
  }
});

router.post('/anniversary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerName, yearsOrDays, tone, sharedMemory } = req.body;
    const result = await AIService.generateAnniversaryLetter({
      partnerName: partnerName || 'my beloved',
      yearsOrDays: yearsOrDays || 'our journey together',
      tone: tone || 'romantic',
      sharedMemory: sharedMemory || 'the day we first met',
    });
    return res.json(result);
  } catch (error) {
    console.error('AI anniversary error:', error);
    return res.status(500).json({ error: 'Failed to generate letter' });
  }
});

export default router;
