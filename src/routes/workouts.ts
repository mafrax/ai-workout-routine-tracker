import { Router, Request, Response } from 'express';
import prisma from '../lib/database';

const router = Router();

/**
 * GET /api/workouts/plan/:planId
 * Get all workouts for a workout plan with exercises
 */
router.get('/plan/:planId', async (req: Request, res: Response) => {
  try {
    if (!req.params.planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    const planId = BigInt(req.params.planId);

    const workouts = await prisma.workout.findMany({
      where: { planId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { day: 'asc' }
    });

    // Serialize BigInt fields for JSON
    const serializedWorkouts = workouts.map(workout => ({
      id: workout.id.toString(),
      planId: workout.planId.toString(),
      day: workout.day,
      muscleGroup: workout.muscleGroup,
      createdAt: workout.createdAt,
      exercises: workout.exercises.map(exercise => ({
        id: exercise.id.toString(),
        workoutId: exercise.workoutId.toString(),
        orderIndex: exercise.orderIndex,
        exerciseTitle: exercise.exerciseTitle,
        numberOfReps: JSON.parse(exercise.numberOfReps),
        weight: exercise.weight,
        isBodyweight: exercise.isBodyweight,
        restTime: exercise.restTime,
        notes: exercise.notes,
        createdAt: exercise.createdAt
      }))
    }));

    return res.json(serializedWorkouts);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

/**
 * GET /api/workouts/:workoutId
 * Get a specific workout with exercises
 */
router.get('/:workoutId', async (req: Request, res: Response) => {
  try {
    if (!req.params.workoutId) {
      return res.status(400).json({ error: 'Workout ID is required' });
    }
    const workoutId = BigInt(req.params.workoutId);

    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const serializedWorkout = {
      id: workout.id.toString(),
      planId: workout.planId.toString(),
      day: workout.day,
      muscleGroup: workout.muscleGroup,
      createdAt: workout.createdAt,
      exercises: workout.exercises.map(exercise => ({
        id: exercise.id.toString(),
        workoutId: exercise.workoutId.toString(),
        orderIndex: exercise.orderIndex,
        exerciseTitle: exercise.exerciseTitle,
        numberOfReps: JSON.parse(exercise.numberOfReps),
        weight: exercise.weight,
        isBodyweight: exercise.isBodyweight,
        restTime: exercise.restTime,
        notes: exercise.notes,
        createdAt: exercise.createdAt
      }))
    };

    return res.json(serializedWorkout);
  } catch (error) {
    console.error('Error fetching workout:', error);
    return res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

/**
 * POST /api/workouts
 * Create a new workout with exercises
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { planId, day, muscleGroup, exercises } = req.body;

    if (!planId || !day || !muscleGroup || !exercises || !Array.isArray(exercises)) {
      return res.status(400).json({
        error: 'Missing required fields: planId, day, muscleGroup, exercises'
      });
    }

    // Create workout and exercises in a transaction
    const workout = await prisma.workout.create({
      data: {
        planId: BigInt(planId),
        day,
        muscleGroup,
        exercises: {
          create: exercises.map((exercise, index) => ({
            orderIndex: exercise.orderIndex || index + 1,
            exerciseTitle: exercise.exerciseTitle,
            numberOfReps: JSON.stringify(exercise.numberOfReps),
            weight: exercise.weight,
            isBodyweight: exercise.isBodyweight || false,
            restTime: exercise.restTime,
            notes: exercise.notes
          }))
        }
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    const serializedWorkout = {
      id: workout.id.toString(),
      planId: workout.planId.toString(),
      day: workout.day,
      muscleGroup: workout.muscleGroup,
      createdAt: workout.createdAt,
      exercises: workout.exercises.map(exercise => ({
        id: exercise.id.toString(),
        workoutId: exercise.workoutId.toString(),
        orderIndex: exercise.orderIndex,
        exerciseTitle: exercise.exerciseTitle,
        numberOfReps: JSON.parse(exercise.numberOfReps),
        weight: exercise.weight,
        isBodyweight: exercise.isBodyweight,
        restTime: exercise.restTime,
        notes: exercise.notes,
        createdAt: exercise.createdAt
      }))
    };

    return res.json(serializedWorkout);
  } catch (error) {
    console.error('Error creating workout:', error);
    return res.status(500).json({ error: 'Failed to create workout' });
  }
});

/**
 * PUT /api/workouts/:workoutId
 * Update a workout (muscle group only, exercises updated separately)
 */
router.put('/:workoutId', async (req: Request, res: Response) => {
  try {
    if (!req.params.workoutId) {
      return res.status(400).json({ error: 'Workout ID is required' });
    }
    const workoutId = BigInt(req.params.workoutId);
    const { muscleGroup } = req.body;

    const workout = await prisma.workout.update({
      where: { id: workoutId },
      data: { muscleGroup },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    const serializedWorkout = {
      id: workout.id.toString(),
      planId: workout.planId.toString(),
      day: workout.day,
      muscleGroup: workout.muscleGroup,
      createdAt: workout.createdAt,
      exercises: workout.exercises.map(exercise => ({
        id: exercise.id.toString(),
        workoutId: exercise.workoutId.toString(),
        orderIndex: exercise.orderIndex,
        exerciseTitle: exercise.exerciseTitle,
        numberOfReps: JSON.parse(exercise.numberOfReps),
        weight: exercise.weight,
        isBodyweight: exercise.isBodyweight,
        restTime: exercise.restTime,
        notes: exercise.notes,
        createdAt: exercise.createdAt
      }))
    };

    return res.json(serializedWorkout);
  } catch (error) {
    console.error('Error updating workout:', error);
    return res.status(500).json({ error: 'Failed to update workout' });
  }
});

/**
 * DELETE /api/workouts/:workoutId
 * Delete a workout and all its exercises (cascade)
 */
router.delete('/:workoutId', async (req: Request, res: Response) => {
  try {
    if (!req.params.workoutId) {
      return res.status(400).json({ error: 'Workout ID is required' });
    }
    const workoutId = BigInt(req.params.workoutId);

    await prisma.workout.delete({
      where: { id: workoutId }
    });

    return res.json({ success: true, message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout:', error);
    return res.status(500).json({ error: 'Failed to delete workout' });
  }
});

/**
 * PUT /api/workouts/exercises/:exerciseId
 * Update an exercise
 */
router.put('/exercises/:exerciseId', async (req: Request, res: Response) => {
  try {
    if (!req.params.exerciseId) {
      return res.status(400).json({ error: 'Exercise ID is required' });
    }
    const exerciseId = BigInt(req.params.exerciseId);
    const { exerciseTitle, numberOfReps, weight, isBodyweight, restTime, notes } = req.body;

    const updates: any = {};
    if (exerciseTitle !== undefined) updates.exerciseTitle = exerciseTitle;
    if (numberOfReps !== undefined) updates.numberOfReps = JSON.stringify(numberOfReps);
    if (weight !== undefined) updates.weight = weight;
    if (isBodyweight !== undefined) updates.isBodyweight = isBodyweight;
    if (restTime !== undefined) updates.restTime = restTime;
    if (notes !== undefined) updates.notes = notes;

    const exercise = await prisma.exercise.update({
      where: { id: exerciseId },
      data: updates
    });

    const serializedExercise = {
      id: exercise.id.toString(),
      workoutId: exercise.workoutId.toString(),
      orderIndex: exercise.orderIndex,
      exerciseTitle: exercise.exerciseTitle,
      numberOfReps: JSON.parse(exercise.numberOfReps),
      weight: exercise.weight,
      isBodyweight: exercise.isBodyweight,
      restTime: exercise.restTime,
      notes: exercise.notes,
      createdAt: exercise.createdAt
    };

    return res.json(serializedExercise);
  } catch (error) {
    console.error('Error updating exercise:', error);
    return res.status(500).json({ error: 'Failed to update exercise' });
  }
});

/**
 * POST /api/workouts/:workoutId/exercises
 * Add an exercise to a workout
 */
router.post('/:workoutId/exercises', async (req: Request, res: Response) => {
  try {
    if (!req.params.workoutId) {
      return res.status(400).json({ error: 'Workout ID is required' });
    }
    const workoutId = BigInt(req.params.workoutId);
    const { exerciseTitle, numberOfReps, weight, isBodyweight, restTime, notes, orderIndex } = req.body;

    // If no orderIndex provided, add to end
    let finalOrderIndex = orderIndex;
    if (!finalOrderIndex) {
      const lastExercise = await prisma.exercise.findFirst({
        where: { workoutId },
        orderBy: { orderIndex: 'desc' }
      });
      finalOrderIndex = (lastExercise?.orderIndex || 0) + 1;
    }

    const exercise = await prisma.exercise.create({
      data: {
        workoutId,
        orderIndex: finalOrderIndex,
        exerciseTitle,
        numberOfReps: JSON.stringify(numberOfReps),
        weight,
        isBodyweight: isBodyweight || false,
        restTime,
        notes
      }
    });

    const serializedExercise = {
      id: exercise.id.toString(),
      workoutId: exercise.workoutId.toString(),
      orderIndex: exercise.orderIndex,
      exerciseTitle: exercise.exerciseTitle,
      numberOfReps: JSON.parse(exercise.numberOfReps),
      weight: exercise.weight,
      isBodyweight: exercise.isBodyweight,
      restTime: exercise.restTime,
      notes: exercise.notes,
      createdAt: exercise.createdAt
    };

    return res.json(serializedExercise);
  } catch (error) {
    console.error('Error adding exercise:', error);
    return res.status(500).json({ error: 'Failed to add exercise' });
  }
});

/**
 * DELETE /api/workouts/exercises/:exerciseId
 * Delete an exercise
 */
router.delete('/exercises/:exerciseId', async (req: Request, res: Response) => {
  try {
    if (!req.params.exerciseId) {
      return res.status(400).json({ error: 'Exercise ID is required' });
    }
    const exerciseId = BigInt(req.params.exerciseId);

    await prisma.exercise.delete({
      where: { id: exerciseId }
    });

    return res.json({ success: true, message: 'Exercise deleted successfully' });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

export default router;
