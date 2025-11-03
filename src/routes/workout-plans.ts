import { Router, Request, Response } from 'express';
import prisma from '../lib/database';

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
      orderBy: { createdAt: 'desc' }
    });

    // Convert BigInt to string for JSON serialization
    const serializedPlans = plans.map(plan => ({
      ...plan,
      id: plan.id.toString(),
      userId: plan.userId.toString(),
      completedWorkouts: plan.completedWorkouts ? JSON.parse(plan.completedWorkouts as string) : []
    }));

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
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'No active plan found' });
    }

    const serializedPlan = {
      ...plan,
      id: plan.id.toString(),
      userId: plan.userId.toString(),
      completedWorkouts: plan.completedWorkouts ? JSON.parse(plan.completedWorkouts as string) : []
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
        completedWorkouts: JSON.stringify([]),
        telegramPreviewHour: null
      }
    });

    const serializedPlan = {
      ...plan,
      id: plan.id.toString(),
      userId: plan.userId.toString(),
      completedWorkouts: []
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

    // Handle completedWorkouts if present
    if (updates.completedWorkouts) {
      updates.completedWorkouts = JSON.stringify(updates.completedWorkouts);
    }

    const plan = await prisma.workoutPlan.update({
      where: { id: planId },
      data: updates
    });

    const serializedPlan = {
      ...plan,
      id: plan.id.toString(),
      userId: plan.userId.toString(),
      completedWorkouts: plan.completedWorkouts ? JSON.parse(plan.completedWorkouts as string) : []
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
      userId: activatedPlan.userId.toString(),
      completedWorkouts: activatedPlan.completedWorkouts ? JSON.parse(activatedPlan.completedWorkouts as string) : []
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
      userId: updatedPlan.userId.toString(),
      completedWorkouts: updatedPlan.completedWorkouts ? JSON.parse(updatedPlan.completedWorkouts as string) : []
    };

    return res.json(serializedPlan);
  } catch (error) {
    console.error('Error updating exercise weight:', error);
    return res.status(500).json({ error: 'Failed to update exercise weight' });
  }
});

// POST /api/plans/:planId/sync-completion - Sync completedWorkouts with actual sessions
router.post('/:planId/sync-completion', async (req: Request, res: Response) => {
  try {
    if (!req.params.planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    const planId = BigInt(req.params.planId);

    // Get all workout sessions for this plan
    const sessions = await prisma.workoutSession.findMany({
      where: { planId },
      select: { dayNumber: true }
    });

    // Extract unique day numbers from sessions
    const completedDays = [...new Set(
      sessions
        .map(s => s.dayNumber)
        .filter((day): day is number => day !== null)
    )];

    // Update the plan with the actual completed days
    const updatedPlan = await prisma.workoutPlan.update({
      where: { id: planId },
      data: {
        completedWorkouts: JSON.stringify(completedDays.sort((a, b) => a - b))
      }
    });

    const serializedPlan = {
      ...updatedPlan,
      id: updatedPlan.id.toString(),
      userId: updatedPlan.userId.toString(),
      completedWorkouts: completedDays.sort((a, b) => a - b)
    };

    console.log(`✅ Synced completedWorkouts for plan ${planId}: [${completedDays.join(', ')}]`);
    return res.json(serializedPlan);
  } catch (error) {
    console.error('Error syncing completion status:', error);
    return res.status(500).json({ error: 'Failed to sync completion status' });
  }
});

export default router;
