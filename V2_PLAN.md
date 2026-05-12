# V2 Plan — daily-use overhaul

## Context

After v1 (phases 1–3 — data reliability, equipment photo, exercise attributes), real usage exposed three classes of problem:

1. **Drift** — the codebase has duplicate plumbing for the same things (two `chat()` functions, two profile fetch paths, two day-header parsers). Easy to add features that work, hard to keep them coherent.
2. **State sprawl** — the Zustand store, react-query cache, localStorage, and Capacitor Preferences all hold pieces of user state. No single source of truth, no documented ownership.
3. **Unstructured AI input** — the plan-creation flow is a free-form chat. The AI guesses what the user wants from open-ended answers. We could give it a JSON-shaped request and get tighter output.

Plus UI polish has gone untouched since v1 — several screens visibly break at 375 px width.

The goal of v2 is to consolidate, not add. Most of the work is deletion and structural cleanup.

## Phases

Each phase is mergeable. Each phase ends with `npm run build`, `tsc --noEmit`, and a Playwright MCP smoke at 375 × 812.

### Phase B — Audit (read-only, ~2h)

Produce a single document, `V2_AUDIT.md`, with three sections:

**B.1 Mobile UI report (per route, 375 × 812):**
For each of: `/home`, `/today`, `/today` mid-workout, `/chat`, `/profile`, `/progress`, `/tasks`, `/fasting`, `/auth/callback`. Screenshot + bullet list of issues:
- Overflowing text / clipped buttons
- Hit-target size violations (<44 px)
- Layout that requires horizontal scroll
- Contrast or color usage issues
- Loading state blanks vs skeletons

**B.2 Memory map:**
Walk every persistence layer and document where each piece of user state lives:

| Concept | Zustand | react-query | localStorage | Preferences | DB | Should be (target) |
|---|---|---|---|---|---|---|
| user (auth slice) | ✓ | | `auth_user` | | | react-query only |
| user (full profile) | | `useCurrentUser` | | | ✓ | unchanged |
| active workout plan | ✓ | partial | mock fallback | | ✓ | react-query only |
| in-progress workout | local state | | | | | unchanged (Browser overlay) |
| chat history | ✓ | | `chatStorage` | | | one place — decide |
| etc... |

This is the input to the refactor decisions in Phase C.

**B.3 Code smells inventory:**
Grep-and-list:
- Duplicated functions (e.g. `aiService.chat` vs `ChatService.chat`).
- Dead components (`PlanCreationChat.tsx` is one — defined, never rendered).
- Files >500 LOC (Profile.tsx, TodaysWorkout.tsx, WorkoutExecution.tsx) — flag for splitting.
- `(error) => { console.error(...) }` silent-fail patterns.
- `as any` casts and `// @ts-ignore` markers.
- Direct `axios` use that should go through `api_backend.ts`.

Output is the punch list for Phase C.

### Phase C — Refactor (~1 day)

Drive every change off Phase B's punch list. Order by impact:

1. **Delete what's not used.** `PlanCreationChat.tsx` and any other orphans. Old migration scripts that ran once and shouldn't be re-run.
2. **Consolidate AI plumbing.** Frontend should never construct prompts. Backend `ChatService.chat` is the single source of truth for talking to Claude. Frontend just sends `{ message, threadId }` and renders the response. Removes ~150 lines of duplicate prompt construction in `Profile.tsx` and `aiService.ts`.
3. **Single source of truth for user.** `useCurrentUser` is the only way to read the full profile. Profile.tsx form state stays for editing but hydrates from `useCurrentUser.data` only. Remove the Zustand `user` slice's redundant fields, keep only `{id, email, name}` for auth.
4. **Single source of truth for active plan.** `useActivePlan` react-query hook replaces the Zustand `activeWorkoutPlan` slice. All mutations invalidate it.
5. **Split big files.** Profile.tsx (~1000 LOC) splits into `Profile.tsx` (shell), `ProfileBasicInfo.tsx`, `ProfileEquipment.tsx`, `ProfileBodyweight.tsx`, `ProfileTelegram.tsx`. Same for TodaysWorkout / WorkoutExecution.
6. **Surface every failure.** Replace silent `catch { console.error }` with toast + structured logging.

### Phase D — Structured plan-creation flow (~half day)

Replace `/chat`-as-plan-creator with a wizard at `/plans/new`:

```
Step 1: Plan name + main focus
        (Strength / Hypertrophy / Endurance / Mobility / Weight loss)
Step 2: Schedule
        (Days per week: 2/3/4/5/6, Duration weeks: 4/8/12)
Step 3: Equipment
        (Manual / Photo / Skip — already built)
Step 4: Constraints
        (Injuries free-text, time per session, intensity preference)
Step 5: Review payload + Generate
```

Backend gets a structured POST body — no parsing required:

```ts
POST /api/plans/generate
{
  userId, name, focus, daysPerWeek, durationWeeks,
  equipment: string[], injuries?, sessionMinutes?, intensity
}
```

The backend builds the prompt from this typed shape, calls Claude, validates with the same parser used everywhere else (`WorkoutGenerationService.previewParsedWorkouts`), creates the plan + structured workouts atomically. No free-form chat needed for plan birth.

Existing `/chat` stays — it becomes a coach for modifying an existing plan, which is what it's actually good at.

### Phase E — UI fixes (~half day)

Implement everything in Phase B.1, in priority order:
1. Blocker: anything that prevents using the app on mobile.
2. High: overflowing buttons, clipped text, missing loading states.
3. Medium: hit-target sizes, contrast.
4. Nitpicks.

Verified screen-by-screen with Playwright MCP. Two screenshots per page: before / after.

## Decisions to confirm

Before starting Phase C, surface these for explicit answer:

1. **Chat history persistence** — keep in localStorage like today, move to backend `ConversationHistory` table (already in schema, unused?), or drop entirely after each session?
2. **`workoutPlan` mock data** — the `localStorage.getItem('mock_workout_plans')` path in `useWorkoutPlans` is a dev-time hack. Delete?
3. **Two API clients** — `services/api.ts` and `services/api_backend.ts` both exist. Pick one, delete the other.
4. **Onboarding vs Profile** — the gate redirects to `/profile`. Should it route to a dedicated `/onboarding` wizard instead, so first-run feels different from "edit my profile"?

## Out of scope for v2

Keep this list honest — when scope-creep tempts, push the new idea here instead of expanding the plan:

- Workout history analytics / charts.
- Social features.
- Multiple-user / family accounts.
- Native iOS / Android packaging beyond what Capacitor already gives.
- Replacing Anthropic with another LLM provider.
- A "marketing" landing page.

## Verification checklist for v2 done

- [ ] `V2_AUDIT.md` exists and was the input to every C/E change
- [ ] `npm run build` clean (root + frontend)
- [ ] `npx tsc --noEmit` clean
- [ ] No file >500 LOC outside `package-lock.json` and generated code
- [ ] One way to do each thing (no `aiService.chat` AND `chatService.chat`)
- [ ] Mobile audit pass: every route screenshots cleanly at 375 × 812
- [ ] Plan-creation wizard works end-to-end on Android device
- [ ] Regenerate-incomplete still passes the strict bodyweight cap test
- [ ] Profile edits invalidate `useCurrentUser` and update everywhere immediately
