import { Router, Request, Response } from 'express';
import prisma from '../lib/database';
import { ChatService } from '../services/ChatService';
import { WorkoutGenerationService } from '../services/WorkoutGenerationService';
import { Prisma } from '@prisma/client';
import { parseExerciseAttributes } from '../types/exercise';

const router = Router();
const chatService = new ChatService();

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
        attributes: parseExerciseAttributes((exercise as any).attributes),
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
        attributes: parseExerciseAttributes((exercise as any).attributes),
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

    // Create workout and exercises in a transaction.
    // `attributes` is validated against the discriminated union — invalid
    // payloads are stored as NULL rather than rejecting the whole write,
    // so legacy callers that don't know about attributes still work.
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
            notes: exercise.notes,
            attributes: parseExerciseAttributes(exercise.attributes) ?? Prisma.JsonNull,
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
        attributes: parseExerciseAttributes((exercise as any).attributes),
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
        attributes: parseExerciseAttributes((exercise as any).attributes),
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

    return res.json({ message: 'Workout deleted successfully' });
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

    return res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

/**
 * POST /api/workouts/generate-next
 * Generate next workout day using AI
 * Migrated from frontend generateNextWorkout function
 */
router.post('/generate-next', async (req: Request, res: Response) => {
  try {
    const { planId, dayNumber, userId } = req.body;

    if (!planId || !dayNumber || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: planId, dayNumber, userId'
      });
    }

    console.log(`🏋️ Generating workout Day ${dayNumber} for plan ${planId}`);

    // Fetch the workout plan
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: BigInt(planId) },
      include: {
        workouts: {
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { day: 'asc' }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    // Fetch user for bodyweight exercises
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) }
    });

    // Parse existing workouts for rotation pattern
    const existingWorkouts = plan.workouts.map(w => ({
      day: w.day,
      focus: w.muscleGroup
    }));

    const daysPerWeek = existingWorkouts.length;
    const rotationIndex = (dayNumber - 1) % daysPerWeek;
    const targetWorkout = existingWorkouts[rotationIndex];

    if (!targetWorkout) {
      return res.status(400).json({
        error: 'Cannot generate workout: no existing workout pattern found'
      });
    }

    // Parse bodyweight exercises
    let bodyweightExercises: any[] = [];
    if (user?.bodyweightExercises) {
      try {
        bodyweightExercises = JSON.parse(user.bodyweightExercises);
      } catch (e) {
        console.warn('Failed to parse bodyweight exercises:', e);
      }
    }

    const bodyweightInfo = bodyweightExercises.length > 0
      ? `
BODYWEIGHT EXERCISES (with max reps):
${bodyweightExercises.map(ex => `- ${ex.name}: Max ${ex.maxReps} reps`).join('\n')}

CRITICAL: You MUST include at least ${Math.min(2, bodyweightExercises.length)} bodyweight exercises in this workout.
Program them based on max reps (strength: 40-60%, hypertrophy: 60-80%, endurance: 80-100%).
`
      : '';

    // Build AI prompt
    const prompt = `You are a professional fitness coach creating workout plans. Generate Day ${dayNumber} for this workout program.

EXISTING WORKOUT PLAN (Days 1-${existingWorkouts.length}):
${plan.planDetails}

CONTEXT:
- Plan Name: ${plan.name}
- Days per week: ${daysPerWeek}
- This is a ${daysPerWeek}-day split rotation
- Day ${dayNumber} should follow the same muscle group pattern as Day ${rotationIndex + 1}
${bodyweightInfo}

CRITICAL INSTRUCTIONS:
1. Day ${dayNumber} should target: ${targetWorkout.focus}
2. Use similar exercises to Day ${rotationIndex + 1} but with slight progression (2-5% more weight or 1-2 more reps)
3. ${bodyweightExercises.length > 0 ? 'MANDATORY: Include at least ' + Math.min(2, bodyweightExercises.length) + ' bodyweight exercises mixed with equipment exercises' : 'Use equipment-based exercises'}
4. Follow the EXACT format below - this is mandatory
5. Include ALL rest times (both between sets and before next exercise)
6. Use realistic weights based on the existing plan
7. For bodyweight exercises, use "bodyweight" as the weight
8. DO NOT add any explanation, introduction, or commentary
9. DO NOT ask questions
10. Generate ONLY the workout content

REQUIRED FORMAT (copy this structure exactly):

Day ${dayNumber} - ${targetWorkout.focus}:
1. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
2. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
3. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
4. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
5. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s

EXAMPLE WITH BODYWEIGHT:
Day 5 - Chest & Triceps:
1. Push-ups - 3x12 @ bodyweight | 60s | 90s
2. Smith Machine Bench Press - 4x10 @ 52kg | 90s | 120s
3. Dips - 3x8 @ bodyweight | 60s | 90s
4. Cable Flyes - 3x15 @ 13kg | 60s | 90s
5. Diamond Push-ups - 3x10 @ bodyweight | 60s | 90s

NOW GENERATE:`;

    // Call AI to generate workout
    const aiResponse = await chatService.chat(prompt, {});
    const generatedText = aiResponse.trim();

    console.log('✅ AI generated workout for Day', dayNumber);

    // Validate the response
    if (!generatedText.includes(`Day ${dayNumber}`) || !generatedText.includes('-')) {
      console.error('Invalid workout format from AI:', generatedText);
      return res.status(500).json({ error: 'AI generated invalid workout format' });
    }

    // Dual write: Update plan_details AND create structured Workout/Exercise records
    const updatedPlanDetails = plan.planDetails
      ? `${plan.planDetails}\n\n${generatedText}`
      : generatedText;

    await prisma.workoutPlan.update({
      where: { id: BigInt(planId) },
      data: { planDetails: updatedPlanDetails }
    });

    // Parse and save the new workout to Workout/Exercise tables
    const workoutsGenerated = await WorkoutGenerationService.generateWorkoutsFromPlanDetails(
      BigInt(planId),
      generatedText
    );

    // Fetch the newly created workout
    const newWorkout = await prisma.workout.findUnique({
      where: {
        planId_day: {
          planId: BigInt(planId),
          day: dayNumber
        }
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    // Serialize for JSON response
    const serializedWorkout = newWorkout ? {
      id: newWorkout.id.toString(),
      planId: newWorkout.planId.toString(),
      day: newWorkout.day,
      muscleGroup: newWorkout.muscleGroup,
      createdAt: newWorkout.createdAt,
      exercises: newWorkout.exercises.map(exercise => ({
        id: exercise.id.toString(),
        workoutId: exercise.workoutId.toString(),
        orderIndex: exercise.orderIndex,
        exerciseTitle: exercise.exerciseTitle,
        numberOfReps: JSON.parse(exercise.numberOfReps),
        weight: exercise.weight,
        isBodyweight: exercise.isBodyweight,
        restTime: exercise.restTime,
        notes: exercise.notes,
        attributes: parseExerciseAttributes((exercise as any).attributes),
        createdAt: exercise.createdAt
      }))
    } : null;

    return res.json({
      workout: serializedWorkout,
      generatedText,
      workoutsGenerated
    });
  } catch (error: any) {
    console.error('Error generating next workout:', error);
    return res.status(500).json({
      error: 'Failed to generate next workout',
      details: error.message
    });
  }
});

export default router;
