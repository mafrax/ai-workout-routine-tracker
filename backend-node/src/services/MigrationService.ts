import { MigrationRequest } from '../types';
import prisma from '../lib/database';

export class MigrationService {
  async migrateUserData(migrationData: MigrationRequest): Promise<void> {
    const { userId, tasks, workoutPlans, workoutSessions, telegramConfig } = migrationData;

    await prisma.$transaction(async (tx) => {
      // Ensure user exists
      await tx.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId }
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

        // Create new workout sessions
        await tx.workoutSession.createMany({
          data: workoutSessions.map(session => ({
            userId,
            planId: session.planId ?? null,
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
}