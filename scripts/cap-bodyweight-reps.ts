/**
 * Retroactively cap reps for bodyweight exercises in existing plans.
 *
 * For every user with bodyweight max-rep entries on their profile, scan
 * each of their plans and rewrite any exercise that:
 *   - is a structured Exercise row whose title matches one of the user's
 *     bodyweight exercises (case-insensitive substring match), AND
 *   - has at least one rep value in numberOfReps > the user's cap.
 *
 * For each match: clamp every element of numberOfReps to the cap, AND
 * rewrite the matching line in WorkoutPlan.planDetails so the text stays
 * in sync with the structured data.
 *
 * Usage:
 *   npx tsx scripts/cap-bodyweight-reps.ts            # dry-run, report only
 *   npx tsx scripts/cap-bodyweight-reps.ts --apply    # actually update
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();
import { parseBodyweightColumn } from '../src/utils/bodyweight';
import type { BodyweightExercise } from '../src/types';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

type BodyweightCap = BodyweightExercise;

const parseBodyweight = parseBodyweightColumn;

function matchedCap(exerciseTitle: string, caps: BodyweightCap[]): BodyweightCap | null {
  const lower = exerciseTitle.toLowerCase();
  for (const cap of caps) {
    if (lower.includes(cap.name.toLowerCase())) return cap;
  }
  return null;
}

/** Cap an exercise line in planDetails text. */
function capTextLine(line: string, cap: number): { newLine: string; changed: boolean } {
  // Match: "1. Pull-ups - 4x6 @ bodyweight | ..."
  const m = line.match(/^(\s*\d+\.\s*.+?\s*-\s*)(\d+)x(\d+)(\b.*)$/i);
  if (!m) return { newLine: line, changed: false };
  const [, prefix, setsStr, repsStr, tail] = m;
  if (!setsStr || !repsStr) return { newLine: line, changed: false };
  const reps = parseInt(repsStr, 10);
  if (reps <= cap) return { newLine: line, changed: false };
  return { newLine: `${prefix}${setsStr}x${cap}${tail}`, changed: true };
}

interface Plan {
  id: bigint;
  name: string;
  planDetails: string | null;
}

async function processUser(user: { id: bigint; email: string | null; bodyweightExercises: string | null }) {
  const caps = parseBodyweight(user.bodyweightExercises);
  if (caps.length === 0) return { user: user.email, plansTouched: 0, exercisesTouched: 0 };

  const plans: Plan[] = await prisma.workoutPlan.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, planDetails: true },
  });

  let plansTouched = 0;
  let exercisesTouched = 0;

  for (const plan of plans) {
    // Structured-side update: scan Exercise rows for over-cap reps.
    const exercises = await prisma.exercise.findMany({
      where: { workout: { planId: plan.id } },
      select: { id: true, exerciseTitle: true, numberOfReps: true },
    });

    const updates: Array<{ id: bigint; oldArr: number[]; newArr: number[]; cap: number; title: string }> = [];
    for (const ex of exercises) {
      const cap = matchedCap(ex.exerciseTitle, caps);
      if (!cap) continue;
      let arr: number[];
      try {
        const parsed = JSON.parse(ex.numberOfReps);
        if (!Array.isArray(parsed)) continue;
        arr = parsed.map((n) => (typeof n === 'number' ? n : parseInt(String(n), 10) || 0));
      } catch {
        continue;
      }
      if (!arr.some((n) => n > cap.max)) continue;
      const newArr = arr.map((n) => Math.min(n, cap.max));
      updates.push({ id: ex.id, oldArr: arr, newArr, cap: cap.max, title: ex.exerciseTitle });
    }

    // Text-side update: rewrite planDetails so the source-of-truth text matches.
    let newPlanDetails = plan.planDetails;
    let textChanges = 0;
    if (plan.planDetails) {
      const outLines: string[] = [];
      for (const line of plan.planDetails.split('\n')) {
        // Identify the exercise name from this numbered line, see if it matches a cap.
        const nameMatch = line.match(/^\s*\d+\.\s*(.+?)\s*-/);
        const ttl = nameMatch?.[1];
        if (!ttl) {
          outLines.push(line);
          continue;
        }
        const cap = matchedCap(ttl, caps);
        if (!cap) {
          outLines.push(line);
          continue;
        }
        const { newLine, changed } = capTextLine(line, cap.max);
        if (changed) textChanges += 1;
        outLines.push(newLine);
      }
      newPlanDetails = outLines.join('\n');
    }

    if (updates.length === 0 && textChanges === 0) continue;

    plansTouched += 1;
    exercisesTouched += updates.length;

    for (const u of updates) {
      console.log(
        `  ${plan.name} (plan ${plan.id})  ex#${u.id}  "${u.title}"  cap=${u.cap}  ${JSON.stringify(u.oldArr)} -> ${JSON.stringify(u.newArr)}`
      );
    }
    if (textChanges > 0) {
      console.log(`  ${plan.name} (plan ${plan.id})  planDetails text rewrites: ${textChanges}`);
    }

    if (APPLY) {
      // Apply structured updates one by one (small N, simpler than a transaction)
      for (const u of updates) {
        await prisma.exercise.update({
          where: { id: u.id },
          data: { numberOfReps: JSON.stringify(u.newArr) },
        });
      }
      if (textChanges > 0 && newPlanDetails && newPlanDetails !== plan.planDetails) {
        await prisma.workoutPlan.update({
          where: { id: plan.id },
          data: { planDetails: newPlanDetails },
        });
      }
    }
  }

  return { user: user.email, plansTouched, exercisesTouched };
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will write changes)' : 'DRY-RUN (no writes)'}\n`);

  const users = await prisma.user.findMany({
    select: { id: true, email: true, bodyweightExercises: true },
  });

  let totalPlans = 0;
  let totalExercises = 0;

  for (const user of users) {
    const caps = parseBodyweight(user.bodyweightExercises);
    if (caps.length === 0) continue;
    console.log(`\nUser ${user.email}  caps: ${caps.map((c) => `${c.name}=${c.max}`).join(', ')}`);
    const result = await processUser(user);
    totalPlans += result.plansTouched;
    totalExercises += result.exercisesTouched;
  }

  console.log(
    `\nDone. plans touched=${totalPlans}, exercises capped=${totalExercises}. ${APPLY ? '' : '(re-run with --apply to write)'}`
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
