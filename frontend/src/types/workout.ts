export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  restBetweenSets: number; // in seconds
  restBeforeNext: number; // in seconds
}

export interface DailyWorkout {
  dayNumber: number;
  focus: string;
  exercises: Exercise[];
}

export interface ParsedWorkoutPlan {
  name: string;
  weeklyWorkouts: DailyWorkout[];
}

export function parseWorkoutPlan(planDetails: string): ParsedWorkoutPlan {
  const workouts: DailyWorkout[] = [];
  const lines = planDetails.split('\n');

  let currentDay: DailyWorkout | null = null;

  console.log('=== PARSING WORKOUT PLAN ===');
  console.log('Plan details:', planDetails.substring(0, 500));

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match "Day X - Focus" or "Day X: Focus" or "**Day X** - Focus"
    const dayMatch = trimmed.match(/^[\*]*Day (\d+)[\*]*[\s:-]+(.+)/i);
    if (dayMatch) {
      if (currentDay) {
        workouts.push(currentDay);
      }
      currentDay = {
        dayNumber: parseInt(dayMatch[1]),
        focus: dayMatch[2].replace(/[\*]/g, '').trim(),
        exercises: [],
      };
      console.log(`Found day: ${currentDay.dayNumber} - ${currentDay.focus}`);
      continue;
    }

    // Remove invisible characters and normalize the line
    const cleanLine = trimmed.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '').trim();

    // Match exercise line - try new format first: "1. Exercise Name - 4x10 @ 40-50kg | 90s | 120s"
    // Also handles: "1. Exercise - 2x1 @ bodyweight | 120s rest" or "1. Exercise - 2x1 @ bodyweight | 120s rest (notes)"
    let exerciseMatch = cleanLine.match(/^\d+[a-z]?\.\s*(.+?)\s*-\s*(\d+)(?:x|X)([\d-]+)\s+(?:@|reps @)\s+(.+?)(?:\s*\|\s*(\d+)s(?:\s+rest)?)?(?:\s*\|\s*(\d+)s)?(?:\s*\([^)]*\))?$/i);

    // Try old format with rest and optional per side/each direction:
    // "1. Exercise Name - 2 sets x 10 reps each direction @ Body Weight (10s rest)"
    if (!exerciseMatch) {
      exerciseMatch = cleanLine.match(/^\d+[a-z]?\.\s*(.+?)\s*-\s*(\d+)\s+sets?\s+x\s+([\d-]+)\s+reps?(?:\s+(?:each\s+direction|per\s+side|each\s+side|per\s+leg))?\s+@\s+(.+?)\s*(?:\((\d+)s?\s+rest\))?$/i);
    }

    // Try old format without rest: "1. Exercise Name - 2 sets x 10 reps @ Body Weight"
    if (!exerciseMatch) {
      exerciseMatch = cleanLine.match(/^\d+[a-z]?\.\s*(.+?)\s*-\s*(\d+)\s+sets?\s+x\s+([\d-]+)\s+reps?(?:\s+(?:each\s+direction|per\s+side|each\s+side|per\s+leg))?\s+@\s*(.+?)$/i);
    }

    // Try format with seconds and optional per side: "1. Plank Hold - 3 sets x 30 seconds @ Body Weight (30s rest)"
    if (!exerciseMatch) {
      exerciseMatch = cleanLine.match(/^\d+[a-z]?\.\s*(.+?)\s*-\s*(\d+)\s+sets?\s+x\s+([\d-]+)\s+seconds?(?:\s+(?:each\s+direction|per\s+side|each\s+side))?\s+@\s*(.+?)(?:\s*\((\d+)s?\s+rest\))?$/i);
    }

    if (exerciseMatch && currentDay) {
      const [, name, sets, reps, weight, restSets, restNext] = exerciseMatch;

      // Clean up weight - remove "% 1RM" suffix, handle ranges
      let cleanWeight = weight.trim();

      // Normalize "Body Weight" to "bodyweight"
      cleanWeight = cleanWeight.replace(/body\s+weight/gi, 'bodyweight');

      // Handle "50-60% 1RM" -> "50-60kg"
      cleanWeight = cleanWeight.replace(/\s*%\s*1RM/gi, 'kg');

      // Remove any trailing text in parentheses or pipes
      cleanWeight = cleanWeight.replace(/\s*\([^)]*\).*$/,'').replace(/\s*\|.*$/,'').trim();

      // Handle "bodyweight-15kg" format
      if (!cleanWeight.includes('kg') && !cleanWeight.toLowerCase().includes('bodyweight')) {
        cleanWeight += 'kg';
      }

      cleanWeight = cleanWeight.replace(/\s+/g, ' ').trim();

      currentDay.exercises.push({
        name: name.trim(),
        sets: parseInt(sets),
        reps: reps.trim(),
        weight: cleanWeight,
        restBetweenSets: restSets ? parseInt(restSets) : 60,
        restBeforeNext: restNext ? parseInt(restNext) : (restSets ? parseInt(restSets) : 90),
      });
      console.log(`  Added exercise: ${name.trim()} @ ${cleanWeight}`);
    }
  }

  if (currentDay) {
    workouts.push(currentDay);
  }

  console.log(`Total workouts parsed: ${workouts.length}`);
  workouts.forEach((workout, idx) => {
    console.log(`  Day ${workout.dayNumber}: ${workout.exercises.length} exercises`);
  });
  console.log('=== END PARSING ===');

  return {
    name: 'Workout Plan',
    weeklyWorkouts: workouts,
  };
}
