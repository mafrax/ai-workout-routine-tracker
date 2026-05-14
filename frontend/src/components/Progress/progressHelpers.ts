/**
 * Pure helper functions used across the Progress page sub-components.
 * Keep these out of components/hooks so they don't carry React state and
 * can be shared between StatsSummary / SessionCard / etc.
 */

export interface ProgressExercise {
  name: string;
  sets: number;
  completedSets: number;
  reps: string;
  weight: string;
}

export interface ProgressSession {
  id?: number;
  sessionDate: string;
  durationMinutes?: number;
  completionRate?: number;
  difficultyRating?: number;
  notes?: string;
  workoutPlanId?: number;
  workoutId?: number;
  workoutPlan?: {
    name: string;
    planDetails?: string;
  };
  workout?: {
    id: number;
    day: number;
    muscleGroup: string;
    exercises: Array<{
      id: number;
      orderIndex: number;
      exerciseTitle: string;
      numberOfReps: number[];
      weight: number | null;
      isBodyweight: boolean;
      restTime: number | null;
      notes: string | null;
    }>;
  };
}

export const formatFullDate = (dateString: string): string => {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) +
    ' at ' +
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
};

export const getDifficultyColor = (rating: number): string => {
  if (rating <= 3) return 'success';
  if (rating <= 6) return 'warning';
  return 'danger';
};

export const getCompletionColor = (rate: number): string => {
  if (rate >= 0.9) return 'success';
  if (rate >= 0.7) return 'warning';
  return 'danger';
};

/**
 * Convert a session's `workout.exercises` rows into the simplified shape
 * the Progress UI renders. Older sessions without a linked workout return
 * an empty list (legacy free-text format is no longer supported).
 */
export const parseExercises = (session: ProgressSession): ProgressExercise[] => {
  if (!session.workout?.exercises) return [];
  return session.workout.exercises.map((ex) => ({
    name: ex.exerciseTitle,
    sets: ex.numberOfReps.length,
    completedSets: ex.numberOfReps.length, // structured rows assume all sets completed
    reps: ex.numberOfReps.join(', '),
    weight: ex.isBodyweight ? 'bodyweight' : ex.weight != null ? `${ex.weight}kg` : '',
  }));
};

/**
 * Resolve a human-readable title for the session card. Prefer an explicit
 * workoutName (from older mock data), then the structured workout (Day N
 * - Focus), then a fuzzy match against planDetails, then the plan name.
 */
export const getWorkoutTitle = (session: ProgressSession): string => {
  const sessionWithName = session as any;
  if (sessionWithName.workoutName) return sessionWithName.workoutName;

  if (session.workout) {
    return `Day ${session.workout.day} - ${session.workout.muscleGroup}`;
  }

  if (session.workoutPlan?.planDetails) {
    const exercises = parseExercises(session);
    if (exercises.length > 0) {
      const planDetails = session.workoutPlan.planDetails;
      const dayPattern = /Day \d+ - ([^:]+):/gi;
      const days: { title: string; content: string }[] = [];
      let match: RegExpExecArray | null;
      while ((match = dayPattern.exec(planDetails)) !== null) {
        const dayTitle = match[1].trim();
        const startIndex = match.index;
        const nextMatch = dayPattern.exec(planDetails);
        const endIndex = nextMatch ? nextMatch.index : planDetails.length;
        dayPattern.lastIndex = startIndex + match[0].length;
        days.push({ title: dayTitle, content: planDetails.substring(startIndex, endIndex) });
      }
      let bestMatch = { title: '', matchCount: 0 };
      for (const day of days) {
        const matchCount = exercises.reduce(
          (n, ex) => n + (day.content.toLowerCase().includes(ex.name.toLowerCase()) ? 1 : 0),
          0
        );
        if (matchCount > bestMatch.matchCount) bestMatch = { title: day.title, matchCount };
      }
      if (bestMatch.matchCount > 0) return bestMatch.title;
    }
  }
  return session.workoutPlan?.name || 'Workout Session';
};
