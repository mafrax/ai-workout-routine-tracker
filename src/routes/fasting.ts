import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { FastingService } from '../services/FastingService';
import {
  FastingPresetDto,
  FastingSessionDto,
  FastingEatingWindowDto,
} from '../types';

const router = Router();
const fastingService = new FastingService();

const userIdSchema = z.string().transform((val) => BigInt(val));
const idSchema = z.string().min(1);

// Validation schemas
const createPresetSchema = z.object({
  name: z.string().min(1).max(100),
  durationMinutes: z.number().int().min(1).max(10080), // Max 1 week
});

const updatePresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  durationMinutes: z.number().int().min(1).max(10080).optional(),
});

const startSessionSchema = z.object({
  presetName: z.string(),
  goalMinutes: z.number().int().min(1),
  eatingWindowMinutes: z.number().int().min(1),
});

const createEatingWindowSchema = z.object({
  startTime: z.string().datetime(),
  expectedDurationMinutes: z.number().int().min(1),
  nextFastDueTime: z.string().datetime(),
});

// Presets Routes

// GET /api/fasting/presets/user/:userId
router.get('/presets/user/:userId', async (req: Request, res: Response<FastingPresetDto[]>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const presets = await fastingService.getUserPresets(userId);
    return res.json(presets);
  } catch (error) {
    console.error('Error getting presets:', error);
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// POST /api/fasting/presets/user/:userId
router.post('/presets/user/:userId', async (req: Request, res: Response<FastingPresetDto>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const { name, durationMinutes } = createPresetSchema.parse(req.body);
    const preset = await fastingService.createPreset(userId, name, durationMinutes);
    return res.status(201).json(preset);
  } catch (error) {
    console.error('Error creating preset:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors } as any);
    }
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// PUT /api/fasting/presets/:id
router.put('/presets/:id', async (req: Request, res: Response<FastingPresetDto>) => {
  try {
    const id = idSchema.parse(req.params.id);
    const updates = updatePresetSchema.parse(req.body);
    const preset = await fastingService.updatePreset(id, updates.name, updates.durationMinutes);
    return res.json(preset);
  } catch (error) {
    console.error('Error updating preset:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors } as any);
    }
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// DELETE /api/fasting/presets/:id
router.delete('/presets/:id', async (req: Request, res: Response) => {
  try {
    const id = idSchema.parse(req.params.id);
    await fastingService.deletePreset(id);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting preset:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Session Routes

// GET /api/fasting/sessions/user/:userId
router.get('/sessions/user/:userId', async (req: Request, res: Response<FastingSessionDto[]>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const sessions = await fastingService.getUserSessions(userId);
    return res.json(sessions);
  } catch (error) {
    console.error('Error getting sessions:', error);
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// GET /api/fasting/sessions/user/:userId/active
router.get('/sessions/user/:userId/active', async (req: Request, res: Response<FastingSessionDto | null>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const session = await fastingService.getActiveSession(userId);
    return res.json(session);
  } catch (error) {
    console.error('Error getting active session:', error);
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// POST /api/fasting/sessions/user/:userId/start
router.post('/sessions/user/:userId/start', async (req: Request, res: Response<FastingSessionDto>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const { presetName, goalMinutes, eatingWindowMinutes } = startSessionSchema.parse(req.body);
    const session = await fastingService.startSession(userId, presetName, goalMinutes, eatingWindowMinutes);
    return res.status(201).json(session);
  } catch (error) {
    console.error('Error starting session:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors } as any);
    }
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// POST /api/fasting/sessions/:id/stop
router.post('/sessions/:id/stop', async (req: Request, res: Response<FastingSessionDto>) => {
  try {
    const id = idSchema.parse(req.params.id);
    const { stoppedEarly } = req.body;
    const session = await fastingService.stopSession(id, Boolean(stoppedEarly));
    return res.json(session);
  } catch (error) {
    console.error('Error stopping session:', error);
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// Eating Window Routes

// GET /api/fasting/eating-windows/user/:userId/active
router.get('/eating-windows/user/:userId/active', async (req: Request, res: Response<FastingEatingWindowDto | null>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const window = await fastingService.getActiveEatingWindow(userId);
    return res.json(window);
  } catch (error) {
    console.error('Error getting active eating window:', error);
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// POST /api/fasting/eating-windows/user/:userId
router.post('/eating-windows/user/:userId', async (req: Request, res: Response<FastingEatingWindowDto>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const { startTime, expectedDurationMinutes, nextFastDueTime } = createEatingWindowSchema.parse(req.body);
    const window = await fastingService.createEatingWindow(
      userId,
      new Date(startTime),
      expectedDurationMinutes,
      new Date(nextFastDueTime)
    );
    return res.status(201).json(window);
  } catch (error) {
    console.error('Error creating eating window:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors } as any);
    }
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// POST /api/fasting/eating-windows/:id/close
router.post('/eating-windows/:id/close', async (req: Request, res: Response<FastingEatingWindowDto>) => {
  try {
    const id = idSchema.parse(req.params.id);
    const window = await fastingService.closeEatingWindow(id);
    return res.json(window);
  } catch (error) {
    console.error('Error closing eating window:', error);
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

export default router;
