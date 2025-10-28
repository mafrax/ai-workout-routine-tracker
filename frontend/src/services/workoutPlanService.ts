import { chatApi, workoutPlanApi } from './api';
import { aiService } from './aiService';
import type { User } from '../types';

export interface GeneratedPlan {
  name: string;
  description: string;
  durationWeeks: number;
  daysPerWeek: number;
  difficultyLevel: string;
  planDetails: string;
}

export const generateWorkoutPlans = async (user: User): Promise<GeneratedPlan[]> => {
  const prompt = buildPlanGenerationPrompt(user);

  console.log('Calling aiService.chat to generate plans');
  const response = await aiService.chat(prompt, {});

  // Parse the LLM response to extract 3 workout plans
  const plans = parsePlansFromResponse(response);

  return plans;
};

const buildPlanGenerationPrompt = (user: User): string => {
  const bodyweightExercises = user.bodyweightExercises || [];
  const bodyweightInfo = bodyweightExercises.length > 0
    ? `
BODYWEIGHT EXERCISES (with max reps):
${bodyweightExercises.map(ex => `- ${ex.name}: Max ${ex.maxReps} reps`).join('\n')}

CRITICAL INSTRUCTION: You MUST incorporate bodyweight exercises into EVERY workout day. Program them based on max reps:
- For strength: 40-60% of max reps
- For hypertrophy: 60-80% of max reps
- For endurance: 80-100% of max reps
Mix bodyweight exercises with equipment exercises throughout each workout.
`
    : '';

  const bodyweightRequirement = bodyweightExercises.length > 0
    ? `\n7. MANDATORY: Include at least ${Math.min(2, bodyweightExercises.length)} bodyweight exercises in EVERY workout day`
    : '';

  return `IMPORTANT: Generate 3 complete workout plans immediately. Do NOT ask any clarifying questions. Use the information provided below to create the plans directly.

Based on my profile, please create 3 different personalized workout plan options for me to choose from. Each plan should be distinct and cater to different approaches or intensities.

MY PROFILE:
- Fitness Level: ${user.fitnessLevel || 'Intermediate'}
- Goals: ${user.goals?.join(', ') || 'General fitness'}
- Available Equipment: ${user.availableEquipment?.join(', ') || 'Bodyweight only'}
- Age: ${user.age || 30}
- Gender: ${user.gender || 'Not specified'}
- Weight: ${user.weight || 'Not specified'} kg
- Height: ${user.height || 'Not specified'} cm
${bodyweightInfo}

REQUIREMENTS:
1. Create exactly 3 different workout plans
2. Each plan should have:
   - A clear, descriptive name
   - Duration in weeks (4-12 weeks)
   - Training days per week (3-6 days)
   - Difficulty level (Beginner/Intermediate/Advanced)
   - A brief description (2-3 sentences)
   - DETAILED FIRST WEEK with COMPLETE exercise information

3. Make the plans varied:
   - Plan 1: Conservative/Beginner-friendly approach
   - Plan 2: Moderate/Balanced approach
   - Plan 3: Aggressive/Advanced approach

4. Only use equipment I have access to
5. Consider my fitness level and goals
6. For bodyweight exercises, use "bodyweight" as the weight${bodyweightRequirement}

CRITICAL: For the Weekly Structure, provide COMPLETE details for WEEK 1 including:
- Exercise name
- Sets x Reps (e.g., 3x10, 4x8-12)
- Recommended weight range (e.g., "12-15kg", "60% bodyweight", "Moderate")
- Rest time between sets (in seconds, e.g., "60s", "90s")
- Rest time between exercises (in seconds, e.g., "120s", "90s")

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

PLAN 1:
Name: [Plan Name]
Duration: [X] weeks
Days Per Week: [X]
Difficulty: [Beginner/Intermediate/Advanced]
Description: [Brief description]
Weekly Structure - Week 1:

Day 1 - [Muscle Group/Focus]:
1. [Exercise Name] - [Sets]x[Reps] @ [Weight] | [Rest between sets]s | [Rest before next]s
2. [Exercise Name] - [Sets]x[Reps] @ [Weight] | [Rest between sets]s | [Rest before next]s
...

Day 2 - [Muscle Group/Focus]:
1. [Exercise Name] - [Sets]x[Reps] @ [Weight] | [Rest between sets]s | [Rest before next]s
...

[Continue for all training days]

PLAN 2:
[Same exact format]

PLAN 3:
[Same exact format]

EXAMPLE of correct format (WITH bodyweight exercises mixed in):
Day 1 - Chest & Triceps:
1. Push-ups - 3x12 @ bodyweight | 60s | 90s
2. Technogym Chest Press - 4x10 @ 40-50kg | 90s | 120s
3. Dips - 3x8 @ bodyweight | 60s | 90s
4. Dumbbell Flyes - 3x12 @ 12-15kg | 60s | 120s
5. Diamond Push-ups - 3x10 @ bodyweight | 60s | 90s

EXAMPLE of correct format (WITHOUT bodyweight exercises - only if none selected):
Day 1 - Chest & Triceps:
1. Technogym Chest Press - 4x10 @ 40-50kg | 90s | 120s
2. Dumbbell Flyes - 3x12 @ 12-15kg | 60s | 120s
3. Cable Tricep Pushdowns - 3x15 @ 20-25kg | 45s | 90s`;
};

const parsePlansFromResponse = (response: string): GeneratedPlan[] => {
  const plans: GeneratedPlan[] = [];

  // Split response by "PLAN X:" markers
  const planSections = response.split(/PLAN \d+:/i).filter(s => s.trim());

  for (const section of planSections.slice(0, 3)) {
    try {
      const nameMatch = section.match(/Name:\s*(.+)/i);
      const durationMatch = section.match(/Duration:\s*(\d+)\s*weeks?/i);
      const daysMatch = section.match(/Days Per Week:\s*(\d+)/i);
      const difficultyMatch = section.match(/Difficulty:\s*(Beginner|Intermediate|Advanced)/i);
      const descriptionMatch = section.match(/Description:\s*(.+?)(?=Weekly Structure|$)/is);
      const structureMatch = section.match(/Weekly Structure:\s*(.+?)(?=PLAN \d+:|$)/is);

      if (nameMatch && durationMatch && daysMatch && difficultyMatch && descriptionMatch) {
        plans.push({
          name: nameMatch[1].trim(),
          description: descriptionMatch[1].trim(),
          durationWeeks: parseInt(durationMatch[1]),
          daysPerWeek: parseInt(daysMatch[1]),
          difficultyLevel: difficultyMatch[1],
          planDetails: structureMatch ? structureMatch[1].trim() : section,
        });
      }
    } catch (error) {
      console.error('Error parsing plan section:', error);
    }
  }

  // Fallback: if parsing failed, create default plans
  if (plans.length === 0) {
    return createFallbackPlans(response);
  }

  return plans;
};

const createFallbackPlans = (rawResponse: string): GeneratedPlan[] => {
  // If parsing fails, split the response into 3 roughly equal parts
  const chunks = rawResponse.split('\n\n').filter(c => c.trim());
  const chunkSize = Math.ceil(chunks.length / 3);

  return [
    {
      name: 'Beginner-Friendly Program',
      description: 'A gentle introduction to structured training.',
      durationWeeks: 8,
      daysPerWeek: 3,
      difficultyLevel: 'Beginner',
      planDetails: chunks.slice(0, chunkSize).join('\n\n') || rawResponse,
    },
    {
      name: 'Balanced Progression Program',
      description: 'A well-rounded approach to fitness.',
      durationWeeks: 10,
      daysPerWeek: 4,
      difficultyLevel: 'Intermediate',
      planDetails: chunks.slice(chunkSize, chunkSize * 2).join('\n\n') || rawResponse,
    },
    {
      name: 'Intensive Training Program',
      description: 'A challenging program for dedicated athletes.',
      durationWeeks: 12,
      daysPerWeek: 5,
      difficultyLevel: 'Advanced',
      planDetails: chunks.slice(chunkSize * 2).join('\n\n') || rawResponse,
    },
  ];
};

export const saveWorkoutPlan = async (userId: number, plan: GeneratedPlan) => {
  return await workoutPlanApi.create({
    userId,
    name: plan.name,
    description: plan.description,
    durationWeeks: plan.durationWeeks,
    daysPerWeek: plan.daysPerWeek,
    planDetails: plan.planDetails,
    difficultyLevel: plan.difficultyLevel,
    isActive: false,
  });
};

export const generateCustomWorkoutPlan = async (
  user: User,
  name: string,
  description: string,
  focus: string,
  equipment: string[],
  daysPerWeek: number,
  durationWeeks: number
): Promise<GeneratedPlan> => {
  const bodyweightExercises = user.bodyweightExercises || [];
  const bodyweightInfo = bodyweightExercises.length > 0
    ? `
BODYWEIGHT EXERCISES (with max reps):
${bodyweightExercises.map(ex => `- ${ex.name}: Max ${ex.maxReps} reps`).join('\n')}

Program bodyweight exercises based on max reps:
- For strength: 40-60% of max reps
- For hypertrophy: 60-80% of max reps
- For endurance: 80-100% of max reps
`
    : '';

  const prompt = `Generate a complete ${daysPerWeek}-day per week workout plan for ${durationWeeks} weeks.

PLAN DETAILS:
- Name: ${name}
- Description: ${description}
- Main Focus: ${focus}
- Days per week: ${daysPerWeek}
- Duration: ${durationWeeks} weeks
- Fitness Level: ${user.fitnessLevel || 'Intermediate'}

AVAILABLE EQUIPMENT:
${equipment.join(', ')}

${bodyweightInfo}

${bodyweightExercises.length > 0 ? 'MANDATORY: Include bodyweight exercises in the workouts.' : ''}

REQUIRED FORMAT (VERY IMPORTANT - Follow this EXACT structure):

PLAN NAME: ${name}

Day 1 - [Workout Focus]:
1. [Exercise Name] - [Sets]x[Reps] @ [Weight] | [Rest between sets in seconds]s | [Rest before next in seconds]s
2. [Exercise Name] - [Sets]x[Reps] @ [Weight] | [Rest between sets in seconds]s | [Rest before next in seconds]s
[Continue for all exercises - aim for 5-6 exercises per day]

Day 2 - [Workout Focus]:
[Same format as Day 1]

[Continue for all ${daysPerWeek} days]

EXAMPLE:
Day 1 - Chest & Triceps:
1. Bench Press - 4x10 @ 60kg | 90s | 120s
2. Incline Dumbbell Press - 3x12 @ 25kg | 60s | 90s
3. Cable Flyes - 3x15 @ 15kg | 60s | 90s
4. Push-ups - 3x12 @ bodyweight | 60s | 90s
5. Tricep Dips - 3x10 @ bodyweight | 60s | 90s

Make it a comprehensive, effective plan focused on ${focus}.`;

  const response = await aiService.chat(prompt, {});

  return {
    name,
    description,
    durationWeeks,
    daysPerWeek,
    difficultyLevel: user.fitnessLevel || 'intermediate',
    planDetails: response,
  };
};
