import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ParsedExercise {
  orderIndex: number;
  exerciseTitle: string;
  numberOfReps: string;
  weight: number | null;
  isBodyweight: boolean;
  restTime: number | null;
  notes: string | null;
}

export interface ParsedWorkout {
  day: number;
  muscleGroup: string;
  exercises: ParsedExercise[];
}

export class WorkoutParserService {
  /**
   * Parse entire plan text into structured workouts
   */
  parsePlanText(planText: string): ParsedWorkout[] {
    if (!planText || planText.trim() === '') {
      console.warn('⚠️ Empty plan text provided');
      return [];
    }

    try {
      const workouts: ParsedWorkout[] = [];

      // Split by day headers (Day 1, Day 2, etc.)
      // Match patterns: "Day 1", "Day 1:", "Day 1 -", "**Day 1**", "**Day 1 -", "Day 1:**"
      // Handle markdown formatting at start, end, or both
      const dayPattern = /(?:^|\n)\*{0,2}\s*Day\s+(\d+)\s*[-:]\s*([^\n*]+)/gi;
      const matches = [...planText.matchAll(dayPattern)];

      console.log('📝 Found day headers:', matches.length);

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        if (!match || !match[1] || !match[2]) continue;

        const dayNumber = parseInt(match[1], 10);
        const muscleGroup = match[2].trim();

        // Extract text between this day and the next day (or end of text)
        const startIndex = (match.index ?? 0) + match[0].length;
        const nextMatch = i < matches.length - 1 ? matches[i + 1] : null;
        const endIndex = nextMatch ? (nextMatch.index ?? planText.length) : planText.length;
        const dayText = planText.substring(startIndex, endIndex);

        const workout = this.parseDayWorkout(dayNumber, muscleGroup, dayText);
        workouts.push(workout);
      }

      console.log('✅ Parsed workouts:', { count: workouts.length, days: workouts.map(w => w.day) });
      return workouts;
    } catch (error) {
      console.error('❌ Error parsing plan text:', error);
      throw new Error(`Failed to parse workout plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse single day's workout
   */
  parseDayWorkout(dayNumber: number, muscleGroup: string, dayText: string): ParsedWorkout {
    const exercises: ParsedExercise[] = [];

    // Split into lines and find exercise lines
    const lines = dayText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    for (const line of lines) {
      // Match exercise lines that start with a number followed by a period
      // Example: "1. Bench Press - 4x8 @ 60kg | 90s | 120s"
      const exercisePattern = /^(\d+)\.\s+(.+)/;
      const match = line.match(exercisePattern);

      if (match && match[1] && match[2]) {
        const orderIndex = parseInt(match[1], 10);
        const exerciseContent = match[2];

        try {
          const exercise = this.parseExerciseLine(exerciseContent, orderIndex);
          exercises.push(exercise);
        } catch (error) {
          console.warn(`⚠️ Failed to parse exercise line: "${line}"`, error);
          // Continue parsing other exercises
        }
      }
    }

    return {
      day: dayNumber,
      muscleGroup,
      exercises,
    };
  }

  /**
   * Parse individual exercise line
   * Format: "Exercise Name - SetsxReps @ Weight | Rest between sets | Rest before next"
   * Example: "Bench Press - 4x8 @ 60kg | 90s | 120s"
   */
  parseExerciseLine(line: string, orderIndex: number): ParsedExercise {
    // Split by common separators: - | ,
    // Pattern: [Exercise] - [SetsxReps] @ [Weight] | [Rest] | [Rest]

    let exerciseTitle = '';
    let numberOfReps = '';
    let weight: number | null = null;
    let isBodyweight = false;
    let restTime: number | null = null;
    let notes: string | null = null;

    // First split by '-' to separate exercise name from details
    const dashParts = line.split('-').map(p => p.trim());

    if (dashParts.length < 2) {
      throw new Error(`Invalid exercise format: "${line}"`);
    }

    exerciseTitle = dashParts[0]?.trim() || '';
    const details = dashParts.slice(1).join('-').trim();

    // Split details by '|' or ','
    const detailParts = details.split(/[|,]/).map(p => p.trim());

    // First part should contain SetsxReps and optionally weight
    if (detailParts.length > 0 && detailParts[0]) {
      const firstPart = detailParts[0];

      // Extract SetsxReps pattern (e.g., "4x8", "3x10-12")
      const repsMatch = firstPart.match(/(\d+x\d+(?:-\d+)?)/i);
      if (repsMatch && repsMatch[1]) {
        numberOfReps = repsMatch[1];
      }

      // Extract weight (e.g., "@ 60kg", "@ bodyweight", "@ BW")
      const weightMatch = firstPart.match(/@\s*(\d+(?:\.\d+)?)\s*kg/i);
      const bodyweightMatch = firstPart.match(/@\s*(?:bodyweight|BW)\b/i);

      if (weightMatch && weightMatch[1]) {
        weight = parseFloat(weightMatch[1]);
        isBodyweight = false;
      } else if (bodyweightMatch || firstPart.toLowerCase().includes('bodyweight')) {
        weight = null;
        isBodyweight = true;
      }
    }

    // Second part is rest time between sets (in seconds)
    if (detailParts.length > 1 && detailParts[1]) {
      const restMatch = detailParts[1].match(/(\d+)\s*s/i);
      if (restMatch && restMatch[1]) {
        restTime = parseInt(restMatch[1], 10);
      }
    }

    // Third part could be rest before next exercise (optional, store in notes)
    if (detailParts.length > 2 && detailParts[2]) {
      const restBeforeNext = detailParts[2].match(/(\d+)\s*s/i);
      if (restBeforeNext && restBeforeNext[1]) {
        notes = `Rest before next: ${restBeforeNext[1]}s`;
      }
    }

    return {
      orderIndex,
      exerciseTitle,
      numberOfReps,
      weight,
      isBodyweight,
      restTime,
      notes,
    };
  }

  /**
   * Save parsed workouts to database
   */
  async saveWorkoutsToDatabase(planId: bigint, workouts: ParsedWorkout[]): Promise<void> {
    try {
      console.log('💾 Saving workouts to database:', { planId, count: workouts.length });

      // Delete existing workouts for this plan
      await prisma.workout.deleteMany({
        where: { planId },
      });

      // Create new workouts with exercises
      for (const workout of workouts) {
        const workoutRecord = await prisma.workout.create({
          data: {
            planId,
            day: workout.day,
            muscleGroup: workout.muscleGroup,
          },
        });

        // Create exercises for this workout
        if (workout.exercises.length > 0) {
          await prisma.exercise.createMany({
            data: workout.exercises.map(ex => ({
              workoutId: workoutRecord.id,
              orderIndex: ex.orderIndex,
              exerciseTitle: ex.exerciseTitle,
              numberOfReps: ex.numberOfReps,
              weight: ex.weight,
              isBodyweight: ex.isBodyweight,
              restTime: ex.restTime,
              notes: ex.notes,
            })),
          });
        }
      }

      console.log('✅ Workouts saved successfully');
    } catch (error) {
      console.error('❌ Error saving workouts to database:', error);
      throw new Error(`Failed to save workouts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract muscle group from day header
   */
  extractMuscleGroup(dayHeader: string): string {
    // Remove "Day X" prefix and clean up
    const cleaned = dayHeader.replace(/Day\s+\d+\s*[-:]\s*/i, '').trim();
    return cleaned || 'Full Body';
  }
}

export const workoutParserService = new WorkoutParserService();
