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
        },
        workout: {
          select: {
            id: true,
            day: true,
            muscleGroup: true,
            exercises: {
              orderBy: { orderIndex: 'asc' }
            }
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
      workoutId: session.workoutId ? Number(session.workoutId) : null,
      sessionDate: session.sessionDate,
      durationMinutes: session.durationMinutes,
      completionRate: session.completionRate ? Number(session.completionRate) : null,
      notes: session.notes,
      workoutPlan: session.plan ? {
        id: Number(session.plan.id),
        name: session.plan.name,
        color: session.plan.color,
        planDetails: session.plan.planDetails
      } : null,
      workout: session.workout ? {
        id: Number(session.workout.id),
        day: session.workout.day,
        muscleGroup: session.workout.muscleGroup,
        exercises: session.workout.exercises.map(ex => ({
          id: Number(ex.id),
          orderIndex: ex.orderIndex,
          exerciseTitle: ex.exerciseTitle,
          numberOfReps: JSON.parse(ex.numberOfReps),
          weight: ex.weight,
          isBodyweight: ex.isBodyweight,
          restTime: ex.restTime,
          notes: ex.notes
        }))
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
    const { userId, planId, workoutPlanId, workoutId, dayNumber, sessionDate, durationMinutes, completionRate, notes } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Use workoutPlanId if provided (takes precedence over planId)
    const actualPlanId = workoutPlanId || planId;

    // If workoutId is not provided but dayNumber and planId are, find the workout
    let actualWorkoutId = workoutId ? BigInt(workoutId) : null;
    if (!actualWorkoutId && dayNumber && actualPlanId) {
      const workout = await prisma.workout.findFirst({
        where: {
          planId: BigInt(actualPlanId),
          day: dayNumber
        }
      });
      if (workout) {
        actualWorkoutId = workout.id;
      }
    }

    const session = await prisma.workoutSession.create({
      data: {
        userId: BigInt(userId),
        planId: actualPlanId ? BigInt(actualPlanId) : null,
        workoutId: actualWorkoutId,
        sessionDate: sessionDate || new Date().toISOString(),
        durationMinutes: durationMinutes || null,
        completionRate: completionRate || null,
        notes: notes || null
      }
    });

    const serializedSession = {
      id: Number(session.id),
      userId: Number(session.userId),
      planId: session.planId ? Number(session.planId) : null,
      workoutId: session.workoutId ? Number(session.workoutId) : null,
      sessionDate: session.sessionDate,
      durationMinutes: session.durationMinutes,
      completionRate: session.completionRate ? Number(session.completionRate) : null,
      notes: session.notes,
      createdAt: session.createdAt.toISOString()
    };

    return res.json(serializedSession);
  } catch (error) {
    console.error('Error creating workout session:', error);
    return res.status(500).json({ error: 'Failed to create workout session' });
  }
});

// DELETE /api/sessions/:id - Delete a workout session
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Handle both numeric and string IDs (for mock data compatibility)
    const idParam = req.params.id;

    // If it's a string ID like "session-1", return a mock success response
    // In production, only numeric IDs should be used
    if (isNaN(Number(idParam))) {
      console.log(`⚠️  Skipping deletion of mock session: ${idParam}`);
      return res.json({
        success: true,
        message: 'Mock session deletion acknowledged',
        id: idParam
      });
    }

    const sessionId = BigInt(idParam);

    const session = await prisma.workoutSession.delete({
      where: { id: sessionId }
    });

    return res.json({
      success: true,
      message: 'Workout session deleted successfully',
      id: Number(session.id)
    });
  } catch (error) {
    console.error('Error deleting workout session:', error);
    return res.status(500).json({ error: 'Failed to delete workout session' });
  }
});

// DELETE /api/sessions/workout/:workoutId - Delete workout sessions by workout ID
router.delete('/workout/:workoutId', async (req: Request, res: Response) => {
  try {
    if (!req.params.workoutId) {
      return res.status(400).json({ error: 'Workout ID is required' });
    }
    const workoutId = BigInt(req.params.workoutId);

    // Delete all sessions for this workout
    const result = await prisma.workoutSession.deleteMany({
      where: { workoutId }
    });

    return res.json({
      success: true,
      message: `Deleted ${result.count} workout session(s)`,
      count: result.count
    });
  } catch (error) {
    console.error('Error deleting workout sessions:', error);
    return res.status(500).json({ error: 'Failed to delete workout sessions' });
  }
});

// DELETE /api/sessions/plan/:planId/day/:day - Delete workout sessions by plan ID and day number
router.delete('/plan/:planId/day/:day', async (req: Request, res: Response) => {
  try {
    if (!req.params.planId || !req.params.day) {
      return res.status(400).json({ error: 'Plan ID and day number are required' });
    }
    const planId = BigInt(req.params.planId);
    const day = parseInt(req.params.day);

    // Find the workout for this plan and day
    const workout = await prisma.workout.findFirst({
      where: {
        planId,
        day
      }
    });

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found for this plan and day' });
    }

    // Delete all sessions for this workout
    const result = await prisma.workoutSession.deleteMany({
      where: { workoutId: workout.id }
    });

    return res.json({
      success: true,
      message: `Deleted ${result.count} workout session(s) for day ${day}`,
      count: result.count
    });
  } catch (error) {
    console.error('Error deleting workout sessions:', error);
    return res.status(500).json({ error: 'Failed to delete workout sessions' });
  }
});

export default router;
