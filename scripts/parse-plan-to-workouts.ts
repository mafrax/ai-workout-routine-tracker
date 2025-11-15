import axios from 'axios';

const API_BASE_URL = 'https://workout-marcs-projects-3a713b55.vercel.app/api';

interface ParsedExercise {
  exerciseTitle: string;
  numberOfReps: string;
  isBodyweight: boolean;
  notes?: string | null;
}

interface ParsedWorkout {
  day: number;
  muscleGroup: string;
  exercises: ParsedExercise[];
}

function parsePlanDetails(planDetails: string): ParsedWorkout[] {
  const workouts: ParsedWorkout[] = [];

  // Split by day sections
  const sections = planDetails.split(/(?=Day \d+)/i);

  sections.forEach(section => {
    const trimmedSection = section.trim();
    if (!trimmedSection) return;

    // Extract day number and muscle group
    const dayMatch = trimmedSection.match(/Day (\d+)\s*-\s*([^\n(]+)(?:\s*\(([^)]+)\))?/i);
    if (!dayMatch) return;

    const dayNum = parseInt(dayMatch[1]);
    const muscleGroup = dayMatch[2].trim();

    // Skip rest days
    if (muscleGroup.toLowerCase().includes('rest')) {
      return;
    }

    // Parse exercises (lines starting with -)
    const exerciseLines = trimmedSection
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim());

    const exercises: ParsedExercise[] = [];

    exerciseLines.forEach(line => {
      // Skip warm-up and stretching sections
      if (line.toLowerCase().includes('warm-up') ||
          line.toLowerCase().includes('stretching:')) {
        return;
      }

      // Extract exercise title and reps
      // Format examples:
      // - Push-ups: 3 sets x 10-12 reps
      // - Plank: 3 sets x 20-35 seconds
      // - Cat-cow pose: 3 sets x 8-10 flows

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const title = line.substring(0, colonIndex).trim();
      const repsInfo = line.substring(colonIndex + 1).trim();

      exercises.push({
        exerciseTitle: title,
        numberOfReps: repsInfo,
        isBodyweight: true, // All exercises in this plan are bodyweight
        notes: null
      });
    });

    if (exercises.length > 0) {
      workouts.push({
        day: dayNum,
        muscleGroup,
        exercises
      });
    }
  });

  return workouts;
}

async function createWorkoutsFromPlan(planId: string) {
  try {
    // Get the plan (use active plan endpoint for user 1)
    const planResponse = await axios.get(`${API_BASE_URL}/plans/user/1/active`);
    const plan = planResponse.data;

    console.log(`\n📋 Processing plan: ${plan.name}`);
    console.log(`Plan ID: ${planId}\n`);

    if (!plan.planDetails) {
      console.error('❌ No planDetails found in the plan');
      return;
    }

    // Parse the plan details
    const parsedWorkouts = parsePlanDetails(plan.planDetails);
    console.log(`✅ Parsed ${parsedWorkouts.length} workouts from plan\n`);

    // Create each workout
    for (const workout of parsedWorkouts) {
      console.log(`📝 Creating Day ${workout.day} - ${workout.muscleGroup}...`);
      console.log(`   Exercises: ${workout.exercises.length}`);

      try {
        const response = await axios.post(`${API_BASE_URL}/workouts`, {
          planId: planId,
          day: workout.day,
          muscleGroup: workout.muscleGroup,
          exercises: workout.exercises
        });

        console.log(`✅ Created workout with ${response.data.exercises.length} exercises\n`);
      } catch (error: any) {
        if (error.response?.status === 500 && error.response?.data?.error?.includes('Unique constraint')) {
          console.log(`⚠️  Workout for Day ${workout.day} already exists, skipping...\n`);
        } else {
          console.error(`❌ Error creating workout for Day ${workout.day}:`, error.response?.data || error.message);
        }
      }
    }

    console.log('✅ Finished processing all workouts!');

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Get plan ID from command line argument
const planId = process.argv[2];

if (!planId) {
  console.error('Usage: tsx scripts/parse-plan-to-workouts.ts <planId>');
  process.exit(1);
}

createWorkoutsFromPlan(planId);
