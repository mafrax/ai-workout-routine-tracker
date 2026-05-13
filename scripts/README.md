# Scripts

Reusable database utilities that you may run more than once. All read `DATABASE_URL` from the root `.env` and use the project's Prisma client.

| Script | Purpose | Args |
|---|---|---|
| `reparse-plan.ts` | Re-runs `WorkoutGenerationService.generateWorkoutsFromPlanDetails` for a specific plan. Use after parser changes to refresh the structured `Workout` / `Exercise` rows from the canonical `planDetails` text. | `<planId>` |
| `cap-bodyweight-reps.ts` | Walks every user's bodyweight max-rep caps and clamps any over-cap reps in their plans (both `Exercise.numberOfReps` arrays and the `planDetails` text). Dry-run by default. | `--apply` to write |
| `find-empty-workouts.ts` | Lists every `Workout` row that has zero `Exercise` children. Diagnostic only — useful when the parser silently dropped a day. | — |
| `check-users.ts` | Dumps a JSON summary of every user row's profile fields (age/weight/.../goals). Diagnostic only. | — |

## scripts/archive/

One-shot migrations and historical debugging utilities. **Don't re-run** unless you understand exactly what they did. Kept in git for traceability of past data fixes.
