import { Router, Request, Response } from 'express';
import prisma from '../lib/database';

const router = Router();

// GET /api/sessions/user/:userId - Get all workout sessions for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.params.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const userId = BigInt(req.params.userId);

    const sessions = await prisma.workoutSession.findMany({
      where: { userId },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            color: true,
            planDetails: true
          }
        }
      },
      orderBy: { sessionDate: 'desc' }
    });

    // Convert BigInt to number for JSON serialization
    const serializedSessions = sessions.map(session => ({
      id: Number(session.id),
      userId: Number(session.userId),
      workoutPlanId: session.planId ? Number(session.planId) : null,
      planId: session.planId ? Number(session.planId) : null,
      dayNumber: session.dayNumber,
      sessionDate: session.sessionDate,
      durationMinutes: session.durationMinutes,
      completionRate: session.completionRate ? Number(session.completionRate) : null,
      exercises: session.exercises,
      notes: session.notes,
      workoutPlan: session.plan ? {
        id: Number(session.plan.id),
        name: session.plan.name,
        color: session.plan.color,
        planDetails: session.plan.planDetails
      } : null,
      createdAt: session.createdAt.toISOString()
    }));

    return res.json(serializedSessions);
  } catch (error) {
    console.error('Error fetching workout sessions:', error);
    return res.status(500).json({ error: 'Failed to fetch workout sessions' });
  }
});

// POST /api/sessions - Create a new workout session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, planId, workoutPlanId, dayNumber, sessionDate, durationMinutes, completionRate, exercises, notes } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Use workoutPlanId if provided (takes precedence over planId)
    const actualPlanId = workoutPlanId || planId;

    const session = await prisma.workoutSession.create({
      data: {
        userId: BigInt(userId),
        planId: actualPlanId ? BigInt(actualPlanId) : null,
        dayNumber: dayNumber || null,
        sessionDate: sessionDate || new Date().toISOString(),
        durationMinutes: durationMinutes || null,
        completionRate: completionRate || null,
        exercises: exercises || null,
        notes: notes || null
      }
    });

    const serializedSession = {
      id: Number(session.id),
      userId: Number(session.userId),
      planId: session.planId ? Number(session.planId) : null,
      dayNumber: session.dayNumber,
      sessionDate: session.sessionDate,
      durationMinutes: session.durationMinutes,
      completionRate: session.completionRate ? Number(session.completionRate) : null,
      exercises: session.exercises,
      notes: session.notes,
      createdAt: session.createdAt.toISOString()
    };

    return res.json(serializedSession);
  } catch (error) {
    console.error('Error creating workout session:', error);
    return res.status(500).json({ error: 'Failed to create workout session' });
  }
});

export default router;
