# Workout Plan Database Migration Design

**Date:** 2025-01-15
**Status:** Ready for Implementation
**Migration Strategy:** Dual Write with Fallback Pattern

## Overview

Migrate workout plan storage from text-based (`WorkoutPlan.plan_details`) to structured database tables (`Workout` and `Exercise`), while maintaining backward compatibility during transition.

## Current State

- Workout plans stored as AI-generated text in `WorkoutPlan.plan_details`
- Frontend parses text on every render (`TodaysWorkout.tsx`)
- `generateNextWorkout()` runs in frontend, generates AI text
- No structured data for individual exercises

## Target State

- **Dual-write system:** Save to both `plan_details` AND `Workout`/`Exercise` tables
- **Centralized parsing:** `WorkoutParserService` handles all text parsing
- **Backend generation:** Workout generation moved to backend API
- **Fallback pattern:** Frontend reads structured data first, falls back to text parsing

## Architecture

### 1. WorkoutParserService

**Location:** `src/services/WorkoutParserService.ts`

**Responsibilities:**
- Parse AI-generated workout text into structured data
- Extract day number, muscle group, exercises
- Parse exercise details (sets, reps, weight, rest times)
- Handle format variations
- Save parsed data to database

**Key Methods:**

```typescript
class WorkoutParserService {
  // Parse entire plan text into workouts
  parsePlanText(planText: string): ParsedWorkout[]

  // Parse single day's workout
  parseDayWorkout(dayText: string): ParsedWorkout

  // Parse individual exercise line
  parseExerciseLine(line: string, index: number): ParsedExercise

  // Extract muscle group from day header
  extractMuscleGroup(dayHeader: string): string

  // Save parsed workouts to database
  async saveWorkoutsToDatabase(planId: bigint, workouts: ParsedWorkout[]): Promise<void>
}
```

**Input Format:**
```
Day 1 - Chest & Triceps:
1. Bench Press - 4x8 @ 60kg | 90s | 120s
2. Incline Dumbbell Press - 3x10 @ 25kg | 60s | 90s
3. Tricep Dips - 3x12 @ bodyweight | 45s | 60s

Day 2 - Back & Biceps:
1. Pull-ups - 4x8 @ bodyweight | 90s | 120s
...
```

**Output Structure:**
```typescript
interface ParsedWorkout {
  day: number
  muscleGroup: string
  exercises: ParsedExercise[]
}

interface ParsedExercise {
  orderIndex: number
  exerciseTitle: string
  numberOfReps: string      // "4x8"
  weight: number | null
  isBodyweight: boolean
  restTime: number | null   // seconds between sets
  notes: string | null
}
```

### 2. Database Operations (Dual Write)

**Transaction Flow:**

```typescript
async function saveWorkoutPlan(planData) {
  return await prisma.$transaction(async (tx) => {
    // 1. Save/update WorkoutPlan with plan_details text
    const plan = await tx.workoutPlan.upsert({
      where: { id: planData.id || -1 },
      update: { planDetails: planData.planDetails, ...otherFields },
      create: { planDetails: planData.planDetails, ...otherFields }
    });

    // 2. Delete existing workouts for this plan (on update)
    await tx.workout.deleteMany({
      where: { planId: plan.id }
    });

    // 3. Parse plan_details text
    const parsedWorkouts = workoutParser.parsePlanText(plan.planDetails);

    // 4. Create Workout records
    for (const workout of parsedWorkouts) {
      const workoutRecord = await tx.workout.create({
        data: {
          planId: plan.id,
          day: workout.day,
          muscleGroup: workout.muscleGroup,
        }
      });

      // 5. Create Exercise records
      await tx.exercise.createMany({
        data: workout.exercises.map(ex => ({
          workoutId: workoutRecord.id,
          orderIndex: ex.orderIndex,
          exerciseTitle: ex.exerciseTitle,
          numberOfReps: ex.numberOfReps,
          weight: ex.weight,
          isBodyweight: ex.isBodyweight,
          restTime: ex.restTime,
          notes: ex.notes,
        }))
      });
    }

    return plan;
  });
}
```

**Benefits:**
- Atomic operation (all or nothing)
- Both data sources stay synchronized
- Easy rollback if parsing fails
- Existing queries still work during migration

### 3. Backend API Endpoints

#### Create Workout Plan
**Endpoint:** `POST /api/workout-plans`

```typescript
// Request
{
  userId: number,
  name: string,
  planDetails: string,  // AI-generated text
  daysPerWeek?: number,
  durationWeeks?: number,
  difficultyLevel?: string,
  isActive?: boolean
}

// Response
{
  success: true,
  plan: WorkoutPlan,
  workoutsCreated: number
}
```

#### Update Workout Plan
**Endpoint:** `PUT /api/workout-plans/:id`

```typescript
// Request
{
  planDetails?: string,  // triggers re-parse if provided
  name?: string,
  // ... other updatable fields
}

// Response
{
  success: true,
  plan: WorkoutPlan,
  workoutsCreated: number
}
```

#### Generate Next Workout
**Endpoint:** `POST /api/workouts/generate-next`

Replaces frontend `generateNextWorkout()` function.

```typescript
// Request
{
  planId: number,
  dayNumber: number,
  userId: number
}

// Backend Process:
// 1. Fetch existing plan and workouts
// 2. Call AI to generate next day workout
// 3. Parse AI response
// 4. Create Workout + Exercise records
// 5. Append to plan_details (dual write)

// Response
{
  success: true,
  workout: Workout & { exercises: Exercise[] },
  generatedText: string
}
```

#### Get Plan Workouts
**Endpoint:** `GET /api/workouts/by-plan/:planId`

```typescript
// Response
{
  success: true,
  workouts: Array<{
    id: number,
    day: number,
    muscleGroup: string,
    exercises: Exercise[]
  }>
}
```

### 4. Frontend Integration

#### TodaysWorkout Component

**Current Behavior:**
- Parses `plan_details` on every render
- Uses `parseWorkoutPlan()` utility

**New Behavior (Fallback Pattern):**

```typescript
const [workouts, setWorkouts] = useState<Workout[]>([]);
const [loadingWorkouts, setLoadingWorkouts] = useState(true);

useEffect(() => {
  if (!currentPlan) return;
  loadWorkouts();
}, [currentPlan]);

const loadWorkouts = async () => {
  try {
    // 1. Try fetching structured workouts first
    const response = await fetch(`/api/workouts/by-plan/${currentPlan.id}`);
    const data = await response.json();

    if (data.success && data.workouts.length > 0) {
      // Use structured data
      setWorkouts(data.workouts);
    } else {
      // 2. Fallback: parse plan_details
      const parsed = parseWorkoutPlan(currentPlan.planDetails);
      setWorkouts(parsed.weeklyWorkouts);
    }
  } catch (error) {
    // 3. Error fallback: parse plan_details
    const parsed = parseWorkoutPlan(currentPlan.planDetails);
    setWorkouts(parsed.weeklyWorkouts);
  } finally {
    setLoadingWorkouts(false);
  }
};

// Replace parsedPlan.weeklyWorkouts with workouts state
// Exercise data from Exercise[] relation instead of parsing
```

**Benefits:**
- Graceful degradation for old plans
- No breaking changes
- Gradual migration as plans are updated
- Better performance with structured data

#### ChatInterface Component

**Changes Required:**
- **None!** Backend handles parsing transparently
- Same API calls, enhanced backend behavior
- Error handling remains unchanged

**Existing Flow (No Changes):**
```typescript
const applyPlanChanges = async () => {
  // ... existing code

  if (activeWorkoutPlan) {
    // Backend will re-parse and update Workouts/Exercises
    resultPlan = await workoutPlanApi.updatePlan(activeWorkoutPlan.id!, {
      planDetails: cleanedPlan
    });
  } else {
    // Backend will parse and create Workouts/Exercises
    resultPlan = await workoutPlanApi.create(newPlan);
  }

  // ... existing code
};
```

### 5. Code Cleanup

**Files to Clean Up:**

**Frontend:**
- `TodaysWorkout.tsx`:
  - Remove `generateNextWorkout()` function (~100 lines)
  - Remove AI API calls from component
  - Keep `parseWorkoutPlan()` for fallback only

- Unused imports:
  - Remove AI service imports if only used for workout generation
  - Clean up duplicate parsing utilities

**Backend:**
- Replace any existing parsing code with `WorkoutParserService`
- Remove duplicate parsing logic

**Dead Code:**
```typescript
// DELETE from TodaysWorkout.tsx:
const generateNextWorkout = async (plan: any, dayNumber: number, existingWorkouts: DailyWorkout[]): Promise<string> => {
  // Entire function moves to backend
}

// DELETE old inline parsing (replace with API fetch):
const parsedPlan = parseWorkoutPlan(currentPlan.planDetails);

// DELETE unused AI service imports:
import { aiService } from '../../services/aiService';
```

**Migration Comments:**
```typescript
// TODO: Remove after all plans migrated (fallback pattern)
if (!data.workouts || data.workouts.length === 0) {
  // Legacy fallback: parse plan_details text
  const parsed = parseWorkoutPlan(currentPlan.planDetails);
}
```

### 6. Error Handling & Edge Cases

#### Parsing Failures

```typescript
try {
  const workouts = this.parsePlanText(planDetails);
  await this.saveWorkoutsToDatabase(planId, workouts);
} catch (parseError) {
  console.error('Failed to parse workout plan:', parseError);
  // Strategy: Save plan_details anyway, log error
  // User can still see text version
  // Admin can review and fix parser
  throw new Error('Plan saved but parsing failed. Please review format.');
}
```

#### Edge Cases

1. **Inconsistent AI Format:**
   - Day headers: "Day 1", "Day 1:", "Day 1 -", "**Day 1**"
   - Exercise separators: variations (|, -, ,)
   - Solution: Regex patterns with multiple variants

2. **Bodyweight Exercises:**
   - Text: "@ bodyweight", "@ BW", no weight specified
   - Parse as: `weight: null, isBodyweight: true`

3. **Missing Rest Times:**
   - Some exercises may not have rest times
   - Parse as: `restTime: null`

4. **Partial Plans:**
   - AI generates 3 days instead of 4
   - Solution: Save what we can parse, log warning

5. **Empty/Null plan_details:**
   - Check before parsing
   - Skip workout creation, just save plan metadata

6. **Database Transaction Failures:**
   - Rollback entire operation
   - Return error to frontend
   - User sees helpful error message

#### Validation Rules

- Day number: positive integer
- Muscle group: non-empty string
- Exercise title: non-empty
- Sets/reps: validate format (e.g., "3x10", "4x8-12")
- Weight: nullable number or "bodyweight"

#### Logging Strategy

```typescript
console.log('📝 Parsing workout plan:', { planId, textLength });
console.log('✅ Parsed workouts:', { count: workouts.length, days });
console.error('❌ Parsing failed:', { planId, error: parseError.message });
```

## Implementation Checklist

- [ ] Create `WorkoutParserService` with parsing logic
- [ ] Create backend API route: `POST /api/workout-plans`
- [ ] Create backend API route: `PUT /api/workout-plans/:id`
- [ ] Create backend API route: `POST /api/workouts/generate-next`
- [ ] Create backend API route: `GET /api/workouts/by-plan/:planId`
- [ ] Update `TodaysWorkout.tsx` with fallback pattern
- [ ] Remove `generateNextWorkout()` from frontend
- [ ] Clean up unused imports and parsing code
- [ ] Test plan creation flow end-to-end
- [ ] Test workout generation flow end-to-end
- [ ] Test fallback pattern with old plans
- [ ] Test error handling and edge cases

## Testing Strategy

### Unit Tests
- `WorkoutParserService.parsePlanText()` with various formats
- `WorkoutParserService.parseExerciseLine()` edge cases
- Database transaction rollback on failures

### Integration Tests
- Create plan → verify both `plan_details` and `Workout`/`Exercise` records
- Update plan → verify old workouts deleted, new ones created
- Generate next workout → verify AI call, parsing, and database save

### E2E Tests
1. Create workout plan via chat interface
2. Verify plan displays in `TodaysWorkout`
3. Generate next workout day
4. Verify new workout appears
5. Test with old plan (fallback pattern)

## Rollback Plan

If issues occur:
1. Frontend can fall back to `plan_details` parsing (already built-in)
2. Disable dual-write in backend (comment out Workout/Exercise creation)
3. System continues to function with text-based storage
4. Fix parser issues and re-enable

## Future Enhancements

- Background migration script to parse all existing plans
- Remove `plan_details` field after full migration
- Add workout modification API (edit individual exercises)
- Workout template system (reusable workout patterns)
- Exercise library with videos and instructions

## Success Criteria

- ✅ New plans create structured `Workout`/`Exercise` records
- ✅ Old plans still display correctly (fallback works)
- ✅ Chat interface creates plans successfully
- ✅ Workout generation works end-to-end
- ✅ No breaking changes for existing users
- ✅ Zero data loss during migration
- ✅ Performance improvement (no parsing on render)
