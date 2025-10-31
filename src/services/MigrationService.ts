import { MigrationRequest } from '../types';
import prisma from '../lib/database';

export class MigrationService {
  async migrateUserData(migrationData: MigrationRequest): Promise<void> {
    const { userId, tasks, workoutPlans, workoutSessions, telegramConfig, userProfile } = migrationData;

    await prisma.$transaction(async (tx) => {
      // Ensure user exists and update profile if provided
      const userUpdateData: any = {};
      if (userProfile) {
        if (userProfile.name) userUpdateData.name = userProfile.name;
        if (userProfile.email) userUpdateData.email = userProfile.email;
        if (userProfile.age) userUpdateData.age = userProfile.age;
        if (userProfile.weight) userUpdateData.weight = userProfile.weight;
        if (userProfile.height) userUpdateData.height = userProfile.height;
        if (userProfile.fitnessLevel) userUpdateData.fitnessLevel = userProfile.fitnessLevel;
        if (userProfile.goals) userUpdateData.goals = JSON.stringify(userProfile.goals);
        if (userProfile.availableEquipment) userUpdateData.availableEquipment = JSON.stringify(userProfile.availableEquipment);
        if (userProfile.bodyweightExercises) userUpdateData.bodyweightExercises = JSON.stringify(userProfile.bodyweightExercises);
      }

      await tx.user.upsert({
        where: { id: userId },
        update: userUpdateData,
        create: {
          id: userId,
          ...userUpdateData
        }
      });

      // Migrate daily tasks
      if (tasks.length > 0) {
        // Clear existing tasks for this user
        await tx.dailyTask.deleteMany({
          where: { userId }
        });

        // Create new tasks
        await tx.dailyTask.createMany({
          data: tasks.map(task => ({
            userId,
            title: task.title,
            completed: task.completed,
            createdAt: new Date()
          }))
        });
      }

      // Migrate workout plans
      if (workoutPlans.length > 0) {
        // Clear existing plans for this user
        await tx.workoutPlan.deleteMany({
          where: { userId }
        });

        // Create new workout plans
        for (const plan of workoutPlans) {
          await tx.workoutPlan.create({
            data: {
              userId,
              name: plan.name,
              planDetails: plan.planDetails,
              isActive: plan.isActive,
              isArchived: plan.isArchived,
              completedWorkouts: JSON.stringify(plan.completedWorkouts),
              telegramPreviewHour: plan.telegramPreviewHour ?? null,
              createdAt: new Date()
            }
          });
        }
      }

      // Migrate workout sessions
      if (workoutSessions.length > 0) {
        // Clear existing sessions for this user
        await tx.workoutSession.deleteMany({
          where: { userId }
        });

        // Create new workout sessions (planId set to null since old IDs won't match)
        await tx.workoutSession.createMany({
          data: workoutSessions.map(session => ({
            userId,
            planId: null, // Skip plan relationships during migration
            dayNumber: session.dayNumber ?? null,
            sessionDate: session.sessionDate,
            durationMinutes: session.durationMinutes ?? null,
            completionRate: session.completionRate ?? null,
            notes: session.notes ?? null,
            createdAt: new Date()
          }))
        });
      }

      // Migrate telegram config
      if (telegramConfig) {
        await tx.telegramConfig.upsert({
          where: { userId },
          update: {
            botToken: telegramConfig.botToken ?? null,
            chatId: telegramConfig.chatId ?? null,
            dailyTasksStartHour: telegramConfig.startHour ?? 9
          },
          create: {
            userId,
            botToken: telegramConfig.botToken ?? null,
            chatId: telegramConfig.chatId ?? null,
            dailyTasksStartHour: telegramConfig.startHour ?? 9,
            createdAt: new Date()
          }
        });
      }
    });
  }

  async mergeUsers(): Promise<{ message: string, mergedUser: any, deletedUser: any }> {
    // Find all users
    const users = await prisma.user.findMany({
      include: {
        workoutPlans: true,
        workoutSessions: true,
        dailyTasks: true,
        telegramConfig: true
      }
    });

    console.log('📊 Found users:', users.length);

    if (users.length !== 2) {
      throw new Error(`Expected 2 users, found ${users.length}`);
    }

    // Identify OAuth user (has googleId) and legacy user (no googleId)
    const oauthUser = users.find(u => u.googleId !== null);
    const legacyUser = users.find(u => u.googleId === null);

    if (!oauthUser || !legacyUser) {
      throw new Error('Could not identify OAuth and legacy users');
    }

    console.log(`🔄 Merging User ${legacyUser.id} into User ${oauthUser.id}`);

    await prisma.$transaction(async (tx) => {
      // Update workout plans
      await tx.workoutPlan.updateMany({
        where: { userId: legacyUser.id },
        data: { userId: oauthUser.id }
      });

      // Update workout sessions
      await tx.workoutSession.updateMany({
        where: { userId: legacyUser.id },
        data: { userId: oauthUser.id }
      });

      // Update daily tasks
      await tx.dailyTask.updateMany({
        where: { userId: legacyUser.id },
        data: { userId: oauthUser.id }
      });

      // Update telegram config if exists
      if (legacyUser.telegramConfig) {
        // Delete OAuth user's telegram config if it exists (keep legacy user's config)
        if (oauthUser.telegramConfig) {
          await tx.telegramConfig.delete({
            where: { userId: oauthUser.id }
          });
        }

        await tx.telegramConfig.update({
          where: { userId: legacyUser.id },
          data: { userId: oauthUser.id }
        });
      }

      // Delete legacy user
      await tx.user.delete({
        where: { id: legacyUser.id }
      });
    });

    console.log('✅ Users merged successfully');

    return {
      message: 'Users merged successfully',
      mergedUser: {
        id: oauthUser.id.toString(),
        email: oauthUser.email,
        name: oauthUser.name
      },
      deletedUser: {
        id: legacyUser.id.toString(),
        email: legacyUser.email
      }
    };
  }
}