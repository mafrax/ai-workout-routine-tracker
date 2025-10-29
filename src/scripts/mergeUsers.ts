import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mergeUsers() {
  try {
    // Find all users
    const users = await prisma.user.findMany({
      include: {
        workoutPlans: true,
        workoutSessions: true,
        dailyTasks: true,
        telegramConfig: true
      }
    });

    console.log('📊 Users in database:');
    users.forEach((user, idx) => {
      console.log(`\n👤 User ${idx + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Google ID: ${user.googleId}`);
      console.log(`  Provider: ${user.provider}`);
      console.log(`  Workout Plans: ${user.workoutPlans.length}`);
      console.log(`  Workout Sessions: ${user.workoutSessions.length}`);
      console.log(`  Daily Tasks: ${user.dailyTasks.length}`);
      console.log(`  Telegram Config: ${user.telegramConfig ? 'Yes' : 'No'}`);
    });

    if (users.length !== 2) {
      console.log('\n⚠️  Expected 2 users, found', users.length);
      return;
    }

    // Identify OAuth user (has googleId) and legacy user (no googleId)
    const oauthUser = users.find(u => u.googleId !== null);
    const legacyUser = users.find(u => u.googleId === null);

    if (!oauthUser || !legacyUser) {
      console.log('\n❌ Could not identify OAuth and legacy users');
      return;
    }

    console.log('\n🔄 Merging users:');
    console.log(`  Keep: User ${oauthUser.id} (${oauthUser.email}) - OAuth user`);
    console.log(`  Merge from: User ${legacyUser.id} (${legacyUser.email || 'no email'}) - Legacy user`);

    // Transfer all data from legacy user to OAuth user
    console.log('\n📦 Transferring data...');

    // Update workout plans
    const plansUpdated = await prisma.workoutPlan.updateMany({
      where: { userId: legacyUser.id },
      data: { userId: oauthUser.id }
    });
    console.log(`  ✅ Transferred ${plansUpdated.count} workout plans`);

    // Update workout sessions
    const sessionsUpdated = await prisma.workoutSession.updateMany({
      where: { userId: legacyUser.id },
      data: { userId: oauthUser.id }
    });
    console.log(`  ✅ Transferred ${sessionsUpdated.count} workout sessions`);

    // Update daily tasks
    const tasksUpdated = await prisma.dailyTask.updateMany({
      where: { userId: legacyUser.id },
      data: { userId: oauthUser.id }
    });
    console.log(`  ✅ Transferred ${tasksUpdated.count} daily tasks`);

    // Update telegram config if exists
    if (legacyUser.telegramConfig) {
      await prisma.telegramConfig.update({
        where: { userId: legacyUser.id },
        data: { userId: oauthUser.id }
      });
      console.log(`  ✅ Transferred telegram config`);
    }

    // Delete legacy user
    await prisma.user.delete({
      where: { id: legacyUser.id }
    });
    console.log(`\n🗑️  Deleted legacy user ${legacyUser.id}`);

    console.log('\n✅ User merge completed successfully!');

    // Show final state
    const finalUser = await prisma.user.findUnique({
      where: { id: oauthUser.id },
      include: {
        workoutPlans: true,
        workoutSessions: true,
        dailyTasks: true,
        telegramConfig: true
      }
    });

    console.log('\n📊 Final user state:');
    console.log(`  ID: ${finalUser!.id}`);
    console.log(`  Email: ${finalUser!.email}`);
    console.log(`  Name: ${finalUser!.name}`);
    console.log(`  Workout Plans: ${finalUser!.workoutPlans.length}`);
    console.log(`  Workout Sessions: ${finalUser!.workoutSessions.length}`);
    console.log(`  Daily Tasks: ${finalUser!.dailyTasks.length}`);
    console.log(`  Telegram Config: ${finalUser!.telegramConfig ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Error merging users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mergeUsers();
