import { Router, Request, Response } from 'express';
import prisma from '../lib/database';
import { WorkoutGenerationService } from '../services/WorkoutGenerationService';

const router = Router();

// GET /api/plans/user/:userId - Get all workout plans for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.params.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const userId = BigInt(req.params.userId);

    const plans = await prisma.workoutPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        workouts: {
          include: {
            workoutSessions: {
              select: { id: true }
            }
          }
        }
      }
    });

    // Convert BigInt to string and calculate completed workouts
    const serializedPlans = plans.map(plan => {
      // Get day numbers of workouts that have sessions (completed workouts)
      const completedDays = plan.workouts
        .filter(workout => workout.workoutSessions.length > 0)
        .map(workout => workout.day);

      return {
        ...plan,
        id: plan.id.toString(),
        userId: plan.userId.toString(),
        completedWorkouts: completedDays, // Array of completed day numbers
        workouts: undefined // Don't send full workout data to reduce payload size
      };
    });

    return res.json(serializedPlans);
  } catch (error) {
    console.error('Error fetching workout plans:', error);
    return res.status(500).json({ error: 'Failed to fetch workout plans' });
  }
});

// GET /api/plans/user/:userId/active - Get active workout plan for a user
router.get('/user/:userId/active', async (req: Request, res: Response) => {
  try {
    if (!req.params.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const userId = BigInt(req.params.userId);

    const plan = await prisma.workoutPlan.findFirst({
      where: {
        userId,
        isActive: true
      },
      include: {
        workouts: {
          include: {
            workoutSessions: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'No active plan found' });
    }

    // Get day numbers of workouts that have sessions (completed workouts)
    const completedDays = plan.workouts
      .filter(workout => workout.workoutSessions.length > 0)
      .map(workout => workout.day);

    const serializedPlan = {
      ...plan,
      id: plan.id.toString(),
      userId: plan.userId.toString(),
      completedWorkouts: completedDays, // Array of completed day numbers
      workouts: undefined
    };

    return res.json(serializedPlan);
  } catch (error) {
    console.error('Error fetching active plan:', error);
    return res.status(500).json({ error: 'Failed to fetch active plan' });
  }
});

// POST /api/plans - Create a new workout plan
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, name, planDetails, isActive, daysPerWeek, durationWeeks, description } = req.body;

    const plan = await prisma.workoutPlan.create({
      data: {
        userId: BigInt(userId),
        name,
        planDetails,
        isActive: isActive || false,
        isArchived: false,
        telegramPreviewHour: null
      }
    });

    // Auto-generate workouts from plan_details
    let workoutsGenerated = { created: 0, updated: 0 };
    if (planDetails) {
      try {
        workoutsGenerated = await WorkoutGenerationService.generateWorkoutsFromPlanDetails(
          plan.id,
          planDetails
        );
      } catch (error) {
        console.error('Error auto-generating workouts:', error);
      }
    }

    const serializedPlan = {
      ...plan,
      id: plan.id.toString(),
      userId: plan.userId.toString(),
      workoutsGenerated
    };

    return res.json(serializedPlan);
  } catch (error) {
    console.error('Error creating workout plan:', error);
    return res.status(500).json({ error: 'Failed to create workout plan' });
  }
});

// PUT /api/plans/:planId - Update a workout plan
router.put('/:planId', async (req: Request, res: Response) => {
  try {
    if (!req.params.planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    const planId = BigInt(req.params.planId);
    const updates = req.body;

    // Filter out computed fields that don't exist in the schema
    const { completedWorkouts, workouts, id, userId, ...validUpdates } = updates;

    // Convert userId to BigInt if it exists in the updates
    if (validUpdates.userId) {
      validUpdates.userId = BigInt(validUpdates.userId);
    }

    const plan = await prisma.workoutPlan.update({
      where: { id: planId },
      data: validUpdates
    });

    // Auto-generate/update workouts if plan_details were updated
    let workoutsGenerated = { created: 0, updated: 0 };
    if (updates.planDetails) {
      try {
        workoutsGenerated = await WorkoutGenerationService.generateWorkoutsFromPlanDetails(
          plan.id,
          updates.planDetails
        );

        // Clean up workouts that were removed from plan_details
        const removed = await WorkoutGenerationService.cleanupRemovedWorkouts(
          plan.id,
          updates.planDetails
        );
        console.log(`🗑️  Removed ${removed} workouts no longer in plan_details`);
      } catch (error) {
        console.error('Error auto-generating workouts:', error);
      }
    }

    const serializedPlan = {
      ...plan,
      id: plan.id.toString(),
      userId: plan.userId.toString(),
      workoutsGenerated
    };

    return res.json(serializedPlan);
  } catch (error) {
    console.error('Error updating workout plan:', error);
    return res.status(500).json({ error: 'Failed to update workout plan' });
  }
});

// PUT /api/plans/:planId/activate - Activate a workout plan
router.put('/:planId/activate', async (req: Request, res: Response) => {
  try {
    if (!req.params.planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    const planId = BigInt(req.params.planId);

    // Get the plan to find userId
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Deactivate all other plans for this user
    await prisma.workoutPlan.updateMany({
      where: { userId: plan.userId },
      data: { isActive: false }
    });

    // Activate this plan
    const activatedPlan = await prisma.workoutPlan.update({
      where: { id: planId },
      data: { isActive: true }
    });

    const serializedPlan = {
      ...activatedPlan,
      id: activatedPlan.id.toString(),
      userId: activatedPlan.userId.toString()
    };

    return res.json(serializedPlan);
  } catch (error) {
    console.error('Error activating workout plan:', error);
    return res.status(500).json({ error: 'Failed to activate workout plan' });
  }
});

// POST /api/plans/:planId/update-exercise-weight - Update exercise weight
router.post('/:planId/update-exercise-weight', async (req: Request, res: Response) => {
  try {
    if (!req.params.planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    const planId = BigInt(req.params.planId);
    const { exerciseName, newWeight } = req.body;

    const plan = await prisma.workoutPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (!plan.planDetails) {
      return res.status(400).json({ error: 'Plan has no details to update' });
    }

    // Parse planDetails and update the weight
    let planDetails = plan.planDetails;
    const regex = new RegExp(`(${exerciseName}.*?)(\\d+)\\s*(kg|lbs)`, 'gi');
    planDetails = planDetails.replace(regex, `$1${newWeight}`);

    const updatedPlan = await prisma.workoutPlan.update({
      where: { id: planId },
      data: { planDetails }
    });

    const serializedPlan = {
      ...updatedPlan,
      id: updatedPlan.id.toString(),
      userId: updatedPlan.userId.toString()
    };

    return res.json(serializedPlan);
  } catch (error) {
    console.error('Error updating exercise weight:', error);
    return res.status(500).json({ error: 'Failed to update exercise weight' });
  }
});

export default router;
