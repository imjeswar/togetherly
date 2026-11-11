import { prisma } from '../prisma.js';

export async function checkAndAwardAchievements(relationshipId: string, userId: string) {
  const newlyUnlocked: any[] = [];

  const [
    relationship,
    user,
    questionCount,
    photoCount,
    mutualMatchesCount,
    drawingCount,
    loveNoteCount,
    completedGamesCount,
    existingUserAchievements,
  ] = await Promise.all([
    prisma.relationship.findUnique({ where: { id: relationshipId } }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.questionResponse.count({ where: { relationshipId } }),
    prisma.photo.count({ where: { relationshipId } }),
    prisma.savedDateIdea.count({ where: { relationshipId, isMutualMatch: true } }),
    prisma.drawing.count({ where: { relationshipId } }),
    prisma.loveNote.count({ where: { relationshipId } }),
    prisma.gameSession.count({ where: { relationshipId, status: 'COMPLETED' } }),
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    }),
  ]);

  if (!relationship || !user) return newlyUnlocked;

  const unlockedCodes = new Set(existingUserAchievements.map((ua) => ua.achievement.code));

  async function award(code: string) {
    if (unlockedCodes.has(code)) return;

    const achievement = await prisma.achievement.findUnique({
      where: { code },
    });
    if (!achievement) return;

    await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: achievement.id,
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'ACHIEVEMENT',
        title: `Achievement Unlocked: ${achievement.title}!`,
        message: achievement.description,
        link: '/memories',
      },
    });

    newlyUnlocked.push(achievement);
  }

  // 1. FIRST_SPARK (Any activity)
  if (relationship.streakCount >= 1 || questionCount > 0 || photoCount > 0) {
    await award('FIRST_SPARK');
  }

  // 2. FIRST_7_DAYS
  if (relationship.streakCount >= 7) {
    await award('FIRST_7_DAYS');
  }

  // 3. 30_DAYS_TOGETHER
  if (relationship.streakCount >= 30) {
    await award('30_DAYS_TOGETHER');
  }

  // 4. CONVERSATION_STARTERS
  if (questionCount >= 10) {
    await award('CONVERSATION_STARTERS');
  }

  // 5. MEMORY_MAKERS
  if (photoCount >= 5) {
    await award('MEMORY_MAKERS');
  }

  // 6. PERFECT_MATCH
  if (mutualMatchesCount >= 1) {
    await award('PERFECT_MATCH');
  }

  // 7. CANVAS_ARTISTS
  if (drawingCount >= 1) {
    await award('CANVAS_ARTISTS');
  }

  // 8. LOVE_LETTER_DELIVERY
  if (loveNoteCount >= 1) {
    await award('LOVE_LETTER_DELIVERY');
  }

  // 9. GAME_CHAMPIONS
  if (completedGamesCount >= 5) {
    await award('GAME_CHAMPIONS');
  }

  // 10. SOULMATES_CONNECTED
  if (relationship.couplePoints >= 500) {
    await award('SOULMATES_CONNECTED');
  }

  return newlyUnlocked;
}
