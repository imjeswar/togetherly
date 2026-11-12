import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTestUsers() {
  console.log('Cleaning test users and mock couple data before mobile launch...');

  // Find all test emails
  const testEmails = [
    'alex@togetherly.app',
    'sarah@togetherly.app',
    'emma@test.com',
    'liam@test.com',
    'minor@test.com',
  ];

  // Delete all question responses, photos, messages, love notes, drawings associated with test users
  const testUsers = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    select: { id: true, relationshipId: true },
  });

  const userIds = testUsers.map((u) => u.id);
  const relIds = testUsers.map((u) => u.relationshipId).filter(Boolean) as string[];

  console.log(`Found ${userIds.length} test user accounts to delete.`);

  if (userIds.length > 0) {
    // Delete test relationship data
    await prisma.message.deleteMany({ where: { senderId: { in: userIds } } });
    await prisma.loveNote.deleteMany({
      where: { OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }] },
    });
    await prisma.questionResponse.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.photo.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.gameResponse.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userAchievement.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userKey.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userSettings.deleteMany({ where: { userId: { in: userIds } } });

    // Delete users
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  if (relIds.length > 0) {
    await prisma.drawing.deleteMany({ where: { relationshipId: { in: relIds } } });
    await prisma.memory.deleteMany({ where: { relationshipId: { in: relIds } } });
    await prisma.savedDateIdea.deleteMany({ where: { relationshipId: { in: relIds } } });
    await prisma.streak.deleteMany({ where: { relationshipId: { in: relIds } } });
    await prisma.dailyChallenge.deleteMany({ where: { relationshipId: { in: relIds } } });
    await prisma.gameSession.deleteMany({ where: { relationshipId: { in: relIds } } });
    await prisma.relationship.deleteMany({ where: { id: { in: relIds } } });
  }

  // Also clean up any orphan relationships
  const allRelationships = await prisma.relationship.findMany({
    include: { users: true },
  });
  for (const rel of allRelationships) {
    if (rel.users.length === 0) {
      await prisma.relationship.delete({ where: { id: rel.id } });
    }
  }

  console.log('Test users cleaned successfully! Database ready for real users.');
}

cleanTestUsers()
  .catch((e) => {
    console.error('Error cleaning test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

