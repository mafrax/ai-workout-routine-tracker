import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/database';
import { WorkoutGenerationService } from '../services/WorkoutGenerationService';
import { ChatService } from '../services/ChatService';
import { isDev } from '../config/env';
import { parseBodyweightColumn } from '../utils/bodyweight';
import type { BodyweightExercise } from '../types';

const router = Router();
const chatService = new ChatService();

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

    // Validate up-front: if planDetails is supplied, it MUST parse into at
    // least one workout. We refuse to persist plans whose structured form
    // would be empty — that's exactly how phantom "Day 1 / 0 exercises"
    // cards leaked into the UI before.
    if (planDetails) {
      const preview = WorkoutGenerationService.previewParsedWorkouts(planDetails);
      if (preview.length === 0) {
        return res.status(400).json({
          error: 'Plan rejected: no parseable workouts in planDetails',
          hint: 'Each day must use "Day N - Focus:" or "Day N: Focus" headers, with numbered exercise lines like "1. Name - 4x8 @ 60kg | 90s | 120s".'
        });
      }
    }

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

    // Reject updates that would replace planDetails with text we can't parse.
    if (typeof validUpdates.planDetails === 'string' && validUpdates.planDetails.trim().length > 0) {
      const preview = WorkoutGenerationService.previewParsedWorkouts(validUpdates.planDetails);
      if (preview.length === 0) {
        return res.status(400).json({
          error: 'Plan update rejected: no parseable workouts in planDetails',
          hint: 'Each day must use "Day N - Focus:" or "Day N: Focus" headers, with numbered exercise lines like "1. Name - 4x8 @ 60kg | 90s | 120s".'
        });
      }
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

/**
 * POST /api/plans/:planId/regenerate-incomplete
 *
 * Regenerates every day of a plan that the user hasn't completed yet
 * (no WorkoutSession rows for that day). The plan's existing completed
 * day blocks are preserved verbatim; incomplete blocks are replaced by
 * fresh AI output that respects the user's current profile, equipment,
 * and bodyweight max-rep caps.
 *
 * Body: { userId: number }
 *
 * Returns: { ok, regeneratedDays, skippedDays, plan }
 */
router.post('/:planId/regenerate-incomplete', async (req: Request, res: Response) => {
  try {
    if (!req.params.planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    const planId = BigInt(req.params.planId);
    const userId = req.body?.userId ? BigInt(req.body.userId) : null;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required in the body' });
    }

    const [plan, user] = await Promise.all([
      prisma.workoutPlan.findUnique({
        where: { id: planId },
        include: {
          workouts: {
            include: { workoutSessions: { select: { id: true } } },
            orderBy: { day: 'asc' },
          },
        },
      }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (plan.userId !== user.id) {
      return res.status(403).json({ error: 'Plan does not belong to this user' });
    }
    if (!plan.planDetails) {
      return res.status(400).json({ error: 'Plan has no planDetails to regenerate from' });
    }

    const completedDays = new Set(
      plan.workouts.filter((w) => w.workoutSessions.length > 0).map((w) => w.day)
    );

    // Split planDetails into day blocks. Reuse the same header regex shape
    // as WorkoutGenerationService so we treat the same set of lines as headers.
    const dayHeader = /^\*{0,2}Day\s+(\d+)\*{0,2}\s*[:\-]\s*(.+?):?$/im;
    const lines = plan.planDetails.split('\n');
    const blocks: Array<{ day: number; focus: string; text: string }> = [];
    let current: { day: number; focus: string; lines: string[] } | null = null;
    const preamble: string[] = [];
    for (const line of lines) {
      const m = line.match(dayHeader);
      if (m && m[1] && m[2]) {
        if (current) blocks.push({ day: current.day, focus: current.focus, text: current.lines.join('\n').trim() });
        current = { day: parseInt(m[1], 10), focus: m[2].trim().replace(/:$/, ''), lines: [line] };
      } else if (current) {
        current.lines.push(line);
      } else {
        preamble.push(line);
      }
    }
    if (current) blocks.push({ day: current.day, focus: current.focus, text: current.lines.join('\n').trim() });

    if (blocks.length === 0) {
      return res.status(400).json({ error: 'Could not parse any days from planDetails' });
    }

    const incompleteBlocks = blocks.filter((b) => !completedDays.has(b.day));
    if (incompleteBlocks.length === 0) {
      return res.json({
        regeneratedDays: [],
        skippedDays: blocks.map((b) => b.day),
        message: 'No incomplete days to regenerate',
      });
    }

    // Parse user profile JSON columns
    const parseArr = (v: string | null | undefined): any[] => {
      if (!v) return [];
      try {
        const p = JSON.parse(v);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    };
    const bodyweight = parseBodyweightColumn(user.bodyweightExercises);
    const equipment = parseArr(user.availableEquipment) as string[];
    const goals = parseArr(user.goals) as string[];

    // Strict bodyweight constraint — make it a HARD cap. Use the right
    // unit per exercise: reps for Pull-ups etc., seconds for Plank holds.
    const bodyweightCap = bodyweight
      .map((b) => {
        const u = b.unit === 'seconds' ? 'seconds per set' : 'reps per set';
        return `- ${b.name}: ABSOLUTE MAX ${b.max} ${u}. Programming more than ${b.max} ${b.unit === 'seconds' ? 'seconds' : 'reps'} for ${b.name} is FORBIDDEN.`;
      })
      .join('\n');

    const regenerated: Array<{ day: number; text: string }> = [];

    for (const blk of incompleteBlocks) {
      const prompt = `Generate ONE workout block — Day ${blk.day} (${blk.focus}) — for an existing plan.

USER PROFILE
- Fitness level: ${user.fitnessLevel || 'intermediate'}
- Goals: ${goals.join(', ') || 'general fitness'}
- Available equipment: ${equipment.join(', ') || 'bodyweight only'}
${bodyweightCap ? `\nBODYWEIGHT MAX REPS (HARD CAPS — DO NOT EXCEED):\n${bodyweightCap}` : ''}

OUTPUT RULES
- Output ONLY the workout block. No commentary, no preface, no closing remarks.
- First line MUST be exactly: Day ${blk.day} - ${blk.focus}:
- Then 5–7 numbered exercise lines in this exact format:
  N. Exercise Name - SetsxReps @ Weight | RestBetweenSetsS | RestBeforeNextS
- Reps must be a single integer, not a range (e.g. "4x8" not "4x6-8").
- For bodyweight exercises, use "@ bodyweight" as the weight.
- For dumbbell exercises, the weight after "@" is PER HAND. Include "(30° incline)" for inclines.
- Use ONLY equipment from the available list above. If empty, bodyweight only.
- NEVER schedule more reps for a bodyweight exercise than its hard cap above.

CONTEXT
Plan name: ${plan.name}
Existing plan details (for tone/scheme reference, do NOT copy verbatim):
${plan.planDetails.slice(0, 1500)}
`;

      const aiText = await chatService.chat(prompt, {
        user: {
          age: user.age,
          weight: user.weight,
          height: user.height,
          fitnessLevel: user.fitnessLevel,
          goals,
          availableEquipment: equipment,
          bodyweightExercises: bodyweight.map((b) => b.name),
        },
      });
      const text = aiText.trim();

      // Strip any prelude before the day header — some models add commentary.
      const headerIdx = text.search(new RegExp(`^Day\\s*${blk.day}\\b`, 'mi'));
      const cleaned = headerIdx > 0 ? text.slice(headerIdx).trim() : text;

      // Verify at least one day parses out of the new block.
      const preview = WorkoutGenerationService.previewParsedWorkouts(cleaned);
      if (preview.length === 0) {
        return res.status(502).json({
          error: `AI output for Day ${blk.day} was unparseable`,
          details: { rawOutput: cleaned.slice(0, 500) },
        });
      }

      // Post-validate bodyweight caps. Rep-based exercises match "NxR"
      // and the rep count must be <= cap. Time-based exercises (Plank etc.)
      // match "NxRs" where the trailing "s" marks seconds; the duration
      // must be <= the cap in seconds.
      for (const line of cleaned.split('\n')) {
        const repMatch = line.match(/^\d+\.\s*(.+?)\s*-\s*(\d+)x(\d+)(s?)\b/i);
        if (!repMatch) continue;
        const [, name, , unitValueStr, secsFlag] = repMatch;
        const unitValue = parseInt(unitValueStr ?? '0', 10);
        const matchedBw = bodyweight.find(
          (b) => b.name && name && name.toLowerCase().includes(b.name.toLowerCase())
        );
        if (!matchedBw) continue;
        const isSecondsInLine = !!secsFlag;
        // If the line and the cap agree on unit, compare directly.
        // If they disagree (e.g. user calibrated Plank in seconds but the
        // AI emitted "Plank - 3x30" without the s), be charitable: skip
        // the check rather than false-positive.
        if (isSecondsInLine !== (matchedBw.unit === 'seconds')) continue;
        if (unitValue > matchedBw.max) {
          const u = matchedBw.unit === 'seconds' ? 'seconds' : 'reps';
          return res.status(502).json({
            error: `AI tried to program ${name?.trim()} at ${unitValue} ${u} but your max is ${matchedBw.max}. Try again.`,
          });
        }
      }

      regenerated.push({ day: blk.day, text: cleaned });
    }

    // Rebuild planDetails preserving completed blocks; replace incomplete with new text.
    const dayToText = new Map<number, string>();
    for (const blk of blocks) dayToText.set(blk.day, blk.text);
    for (const g of regenerated) dayToText.set(g.day, g.text);

    const orderedDays = [...dayToText.keys()].sort((a, b) => a - b);
    const newBody = orderedDays.map((d) => dayToText.get(d)!).join('\n\n');
    const newPlanDetails = (preamble.join('\n').trim() ? preamble.join('\n').trim() + '\n\n' : '') + newBody;

    // Sanity-check the full thing parses to at least the same set of days.
    const fullPreview = WorkoutGenerationService.previewParsedWorkouts(newPlanDetails);
    if (fullPreview.length === 0) {
      return res.status(500).json({
        error: 'Rebuilt planDetails could not be parsed — refusing to save.',
      });
    }

    const updated = await prisma.workoutPlan.update({
      where: { id: planId },
      data: { planDetails: newPlanDetails },
    });

    // Refresh structured workout/exercise tables so the UI picks up new data.
    await WorkoutGenerationService.generateWorkoutsFromPlanDetails(planId, newPlanDetails);

    return res.json({
      regeneratedDays: regenerated.map((g) => g.day),
      skippedDays: [...completedDays],
      plan: {
        ...updated,
        id: updated.id.toString(),
        userId: updated.userId.toString(),
      },
    });
  } catch (err: any) {
    console.error('❌ regenerate-incomplete failed:', err?.message || err);
    return res.status(500).json({
      error: 'Failed to regenerate incomplete workouts',
      details: isDev ? err?.message : undefined,
    });
  }
});

/**
 * POST /api/plans/generate
 *
 * Generates a workout plan from a structured payload assembled by the
 * wizard at /plans/new. Replaces the free-form chat flow for plan
 * creation: the AI receives a typed shape instead of parsing intent
 * from prose, so the prompt is shorter, the output is more consistent,
 * and the post-validation can be strict.
 *
 * On success the plan is created, structured Workout/Exercise rows are
 * generated via WorkoutGenerationService, and (if `activate: true`) any
 * other active plan for the user is paused and this one becomes active.
 *
 * The endpoint does NOT route the user anywhere — the frontend keeps
 * control and shows Step 7 (conversational refinement) before the user
 * commits.
 */
const generatePlanSchema = z.object({
  userId: z.number().int().positive(),
  name: z.string().min(1).max(80),
  focus: z.enum(['strength', 'hypertrophy', 'endurance', 'mobility', 'weight-loss']),
  daysPerWeek: z.number().int().min(2).max(6),
  durationWeeks: z.number().int().min(2).max(24),
  equipment: z.array(z.string()).default([]),
  bodyweight: z
    .array(
      z.object({
        name: z.string().min(1),
        unit: z.enum(['reps', 'seconds']),
        max: z.number().int().positive(),
      })
    )
    .default([]),
  injuries: z.string().max(500).optional(),
  sessionMinutes: z.number().int().min(10).max(180).optional(),
  intensity: z.enum(['easy', 'moderate', 'hard']).default('moderate'),
  activate: z.boolean().default(true),
});

router.post('/generate', async (req: Request, res: Response) => {
  const parsed = generatePlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid plan-generation request',
      details: parsed.error.flatten(),
    });
  }
  const payload = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: BigInt(payload.userId) } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const planDetails = await buildPlanDetailsViaAI(payload);

    // The same parser we use everywhere else — refuses to save a plan
    // whose text doesn't yield at least one structured day.
    const preview = WorkoutGenerationService.previewParsedWorkouts(planDetails);
    if (preview.length === 0) {
      return res.status(502).json({
        error: "Couldn't parse the generated plan — please retry.",
        details: { rawOutput: planDetails.slice(0, 500) },
      });
    }

    // Atomic create: plan -> structured workouts in the same flow. Optionally
    // deactivate any other active plan for the same user so "isActive" stays
    // a single-row property.
    if (payload.activate) {
      await prisma.workoutPlan.updateMany({
        where: { userId: BigInt(payload.userId), isActive: true },
        data: { isActive: false },
      });
    }

    const plan = await prisma.workoutPlan.create({
      data: {
        userId: BigInt(payload.userId),
        name: payload.name,
        planDetails,
        isActive: payload.activate,
        isArchived: false,
        daysPerWeek: payload.daysPerWeek,
        durationWeeks: payload.durationWeeks,
        difficultyLevel: payload.intensity,
        description: describeFromPayload(payload),
      },
    });

    await WorkoutGenerationService.generateWorkoutsFromPlanDetails(plan.id, planDetails);

    return res.json({
      plan: {
        ...plan,
        id: plan.id.toString(),
        userId: plan.userId.toString(),
      },
      previewDays: preview,
    });
  } catch (err: any) {
    console.error('❌ /api/plans/generate failed:', err?.message || err);
    return res.status(500).json({
      error: 'Failed to generate plan',
      details: isDev ? err?.message : undefined,
    });
  }
});

/**
 * Build the planDetails text by sending a strict, typed prompt to Claude.
 * Pulled out of the route handler so the prompt logic is testable and can
 * be reused by Phase D's Step 7 refinement flow.
 */
async function buildPlanDetailsViaAI(payload: z.infer<typeof generatePlanSchema>): Promise<string> {
  const chat = new ChatService();

  const bodyweightCap = payload.bodyweight
    .map((b: BodyweightExercise) => {
      const u = b.unit === 'seconds' ? 'seconds per set' : 'reps per set';
      return `- ${b.name}: ABSOLUTE MAX ${b.max} ${u}.`;
    })
    .join('\n');

  const focusLabel: Record<typeof payload.focus, string> = {
    strength: 'Strength (low reps, heavy load, long rest)',
    hypertrophy: 'Hypertrophy (moderate reps, moderate load)',
    endurance: 'Endurance (high reps, short rest)',
    mobility: 'Mobility / Flexibility',
    'weight-loss': 'Weight Loss (high volume, mixed cardio + strength)',
  };

  const prompt = `Generate a complete ${payload.daysPerWeek}-day workout plan.

PLAN PROFILE
- Name: ${payload.name}
- Focus: ${focusLabel[payload.focus]}
- Days per week: ${payload.daysPerWeek}
- Duration: ${payload.durationWeeks} weeks
- Intensity preference: ${payload.intensity}
${payload.sessionMinutes ? `- Target session length: ${payload.sessionMinutes} minutes` : ''}
${payload.injuries ? `- Injuries / limitations: ${payload.injuries}` : ''}
- Available equipment: ${payload.equipment.length ? payload.equipment.join(', ') : 'bodyweight only'}
${bodyweightCap ? `\nBODYWEIGHT MAX CALIBRATION (HARD CAPS — DO NOT EXCEED):\n${bodyweightCap}` : ''}

OUTPUT RULES
- Output ONLY the plan content. No commentary, preface, or closing remarks.
- Produce exactly ${payload.daysPerWeek} day blocks, numbered Day 1 .. Day ${payload.daysPerWeek}.
- Each day MUST start with: Day N - <Muscle group / focus>:
- Each day MUST contain 5-7 numbered exercise lines in EXACTLY this format:
  N. Exercise Name - SetsxReps @ Weight | RestBetweenSetsS | RestBeforeNextS
- Reps must be a single integer (e.g. "4x8"), not a range.
- For BODYWEIGHT exercises use "@ bodyweight" as the weight.
- For TIME-BASED bodyweight exercises (Plank, Wall Sit, L-sit, etc.) use
  "NxRs" where R is the per-set duration in seconds (e.g. "3x30s @ bodyweight").
- Use ONLY equipment from the available list above.
- NEVER exceed the bodyweight HARD CAPS.

Begin output now:`;

  const text = await chat.chat(prompt, {});
  // Strip a leading commentary paragraph if any — keep from the first day header onward.
  const headerIdx = text.search(/^\*{0,2}Day\s+1\b/im);
  return (headerIdx >= 0 ? text.slice(headerIdx) : text).trim();
}

function describeFromPayload(payload: z.infer<typeof generatePlanSchema>): string {
  const focus = payload.focus.replace('-', ' ');
  return `${payload.daysPerWeek}-day ${focus} plan over ${payload.durationWeeks} weeks (${payload.intensity} intensity).`;
}

export default router;
