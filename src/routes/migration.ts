import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { MigrationService } from '../services/MigrationService';
import { MigrationRequest, ApiResponse } from '../types';

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
  telegramConfig: z.object({
    botToken: z.string().optional().nullable(),
    chatId: z.string().optional().nullable(),
    startHour: z.number().optional().nullable()
  }).optional()
});

// POST /api/migration/save
router.post('/save', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const migrationData = migrationSchema.parse(req.body);
    
    await migrationService.migrateUserData(migrationData);
    
    res.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
  } catch (error) {
    console.error('Error during migration:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid migration data',
        message: error.errors.map(e => e.message).join(', ')
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  }
});

export default router;