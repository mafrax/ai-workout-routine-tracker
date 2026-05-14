import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { MigrationService } from '../services/MigrationService';
import { MigrationRequest } from '../types';

const router = Router();
const migrationService = new MigrationService();

const migrationSchema = z.object({
  userId: z.union([z.string(), z.number()]).transform((val) => BigInt(val)),
  tasks: z.array(z.object({
    title: z.string(),
    completed: z.boolean()
  })),
  workoutPlans: z.array(z.object({
    name: z.string(),
    planDetails: z.string(),
    isActive: z.boolean(),
    isArchived: z.boolean(),
    completedWorkouts: z.array(z.number()),
    telegramPreviewHour: z.number().optional().nullable()
  })),
  workoutSessions: z.array(z.object({
    planId: z.union([z.string(), z.number()]).transform((val) => BigInt(val)).optional().nullable(),
    dayNumber: z.number().optional().nullable(),
    sessionDate: z.string(),
    durationMinutes: z.number().optional().nullable(),
    completionRate: z.number().optional().nullable(),
    notes: z.string().optional().nullable()
  })),
  userProfile: z.object({
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    age: z.number().optional().nullable(),
    weight: z.number().optional().nullable(),
    height: z.number().optional().nullable(),
    fitnessLevel: z.string().optional().nullable(),
    goals: z.array(z.string()).optional().nullable(),
    availableEquipment: z.array(z.string()).optional().nullable(),
    // Accept either the new {name, unit, max} shape or the legacy
    // {name, maxReps} shape — MigrationService normalises before insert.
    bodyweightExercises: z.array(z.union([
      z.object({ name: z.string(), unit: z.enum(['reps', 'seconds']), max: z.number() }),
      z.object({ name: z.string(), maxReps: z.number() }),
    ])).optional().nullable()
  }).optional().nullable(),
  telegramConfig: z.object({
    botToken: z.string().optional().nullable(),
    chatId: z.string().optional().nullable(),
    startHour: z.number().optional().nullable()
  }).optional()
});

// POST /api/migration/save
router.post('/save', async (req: Request, res: Response) => {
  try {
    const migrationData = migrationSchema.parse(req.body);

    await migrationService.migrateUserData(migrationData);

    res.json({ message: 'Migration completed successfully' });
  } catch (error) {
    console.error('Error during migration:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid migration data',
        details: error.errors.map((e) => e.message).join(', '),
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/migration/merge-users
router.post('/merge-users', async (req: Request, res: Response) => {
  try {
    const result = await migrationService.mergeUsers();
    res.json({ message: 'Users merged successfully', data: result });
  } catch (error) {
    console.error('Error merging users:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/migration/run-schema-migration
router.post('/run-schema-migration', async (req: Request, res: Response) => {
  try {
    await migrationService.runSchemaMigration();
    res.json({ message: 'Schema migration completed successfully' });
  } catch (error) {
    console.error('Error running schema migration:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;