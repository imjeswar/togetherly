import { prisma } from '../prisma.js';
import { checkAndAwardAchievements } from './achievement.service.js';

export async function recordRelationshipActivity(
  relationshipId: string,
  userId: string,
  activityType: 'QUESTION' | 'PHOTO' | 'GAME' | 'DRAWING' | 'LOVE_NOTE' | 'DATE'
) {
  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
  });

  if (!relationship) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  // Find or create today's streak entry
  let streak = await prisma.streak.findUnique({
    where: {
      relationshipId_date: {
        relationshipId,
        date: todayStr,
      },
    },
  });

  let isNewDayActivity = false;

  if (!streak) {
    isNewDayActivity = true;
    streak = await prisma.streak.create({
      data: {
        relationshipId,
        date: todayStr,
        completedCount: 1,
        activities: JSON.stringify([activityType]),
      },
    });
  } else {
    const activities: string[] = JSON.parse(streak.activities || '[]');
    if (!activities.includes(activityType)) {
      activities.push(activityType);
    }
    streak = await prisma.streak.update({
      where: { id: streak.id },
      data: {
        completedCount: streak.completedCount + 1,
        activities: JSON.stringify(activities),
      },
    });
  }

  // Update streak count on Relationship if this is the first activity today
  let newStreakCount = relationship.streakCount;
  if (isNewDayActivity) {
    const yesterdayStreak = await prisma.streak.findUnique({
      where: {
        relationshipId_date: {
          relationshipId,
          date: yesterdayStr,
        },
      },
    });

    if (yesterdayStreak || relationship.streakCount === 0) {
      newStreakCount = relationship.streakCount + 1;
    } else {
      newStreakCount = 1; // Reset if streak broke
    }
  }

  // Award couple points (+15 points per activity)
  const updatedRelationship = await prisma.relationship.update({
    where: { id: relationshipId },
    data: {
      streakCount: newStreakCount,
      lastStreakDate: new Date(),
      couplePoints: relationship.couplePoints + 15,
    },
  });

  // Check achievements
  const unlocked = await checkAndAwardAchievements(relationshipId, userId);

  return {
    relationship: updatedRelationship,
    newStreakCount,
    unlockedAchievements: unlocked,
  };
}

