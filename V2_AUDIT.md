# V2 Audit — read-only findings

Input to Phase C (refactor) and Phase E (UI fixes) of [V2_PLAN.md](V2_PLAN.md). No code changes made during this audit.

---

## B.1 — Mobile UI audit (375 × 812)

Routes walked logged-in. Severity: **🔴 blocker** = breaks the screen, **🟠 high** = clearly wrong, **🟡 medium** = polish, **⚪ nitpick**.

### `/login`
| | Finding |
|---|---|
| 🟠 | Bottom tab bar (Home / Today / Tasks / Fasting / Progress / Profile) renders on the login screen. Unauthenticated users shouldn't see the app's nav. |

### `/home`
| | Finding |
|---|---|
| 🟠 | Unlabeled red trash icon top-right is "Reset App" (`clearAllData`). Destructive action with no label and no confirmation copy in the icon — only the alert that fires on tap saves it. |
| 🟡 | "Welcome back, Marc!" hero block is decorative-only; eats ~25% of the first viewport with no actionable content. Could be tighter. |

### `/today` (no active plan)
| | Finding |
|---|---|
| 🟠 | Empty-state CTA reads `FINISH PROFILE TO CREATE A PLAN` — wraps onto two lines, button looks awkward. Either shorten the label (e.g. `Set up profile →`) or widen the button. |
| 🟡 | "No Active Plans" / "You don't have any active workout plans yet." copy is generic. No mention that the user must finish onboarding first, or that they can browse archived plans. |

### `/today` (with active plan, day list — already screenshotted earlier in the session)
| | Finding |
|---|---|
| 🟡 | Plan carousel "1 of N" pill at top-left of carousel — small text, low contrast. Hard to spot. |
| 🟡 | "VIEW DETAILS / PAUSE / ARCHIVE" buttons inside the active-plan card crowd together at 375 px; on long plan names the card title wraps and pushes them down. |

### `/today` mid-workout (WorkoutExecution)
| | Finding |
|---|---|
| 🟡 | Set indicator currently shows e.g. `Set 1/4` — looks OK now after the earlier fix. But the chip is on the right edge of the row and doesn't break onto a new line, so if reps display widens (e.g. `30s`) it gets close. |
| ⚪ | "REST: 120s" — units feel tacked on; could be `120 s` or `2 min` for longer rests. |

### `/chat`
| | Finding |
|---|---|
| 🟡 | The equipment banner (USE PHOTO / ADD MANUALLY / SKIP FOR NOW) consumes the top third of the viewport on every fresh conversation. The "Workout Coach" title above is wasted space — could fold the banner into the empty state. |
| 🟡 | Trash + copy icons in the toolbar are too close together (single tap target each, but visually merged). |
| ⚪ | Empty content area below the banner is plain grey — no "say hi" prompt or starter suggestions to help the user know what to type. |

### `/profile` (top)
| | Finding |
|---|---|
| 🔴 | "ADD EQUIPMENT" header button is **partially clipped on the right** at 375 px. The header row now has `Available Equipment` + `DETECT FROM PHOTO` + `ADD EQUIPMENT` — too much horizontal content. |
| 🟠 | "DETECT FROM PHOTO" wraps across 3 lines (`DETEC / T FROM / PHOTO`) on small screens because of the fixed-width header layout. |
| 🟡 | Personal Information fields all start at `0` for unset numbers. Should be empty placeholder text (`Add your age`) instead of misleading zero. |

### `/profile` (mid — bodyweight / fitness goals / telegram / migration)
| | Finding |
|---|---|
| 🟠 | "Backend Migration" card with "OPEN MIGRATION PAGE" button is exposed to end users. This is an admin/dev affordance — should be removed or behind a hidden flag. |
| 🟡 | "Fitness Goals" card shows only a title with no body, no action. Looks like an unfinished section. |
| 🟡 | "ADD EXERCISE" button in the Bodyweight Exercises card wraps to 2 lines. |
| 🟡 | SAVE PROFILE sticky-ish button at the bottom isn't actually sticky — scrolls with content. On long forms users have to scroll back up after editing to find Save. |

### `/progress` (empty)
| | Finding |
|---|---|
| 🟡 | Empty state is OK but very tall blank card. Could include a `→ Today` CTA so a user with no workouts knows where to go. |

### `/tasks`
| | Finding |
|---|---|
| 🟠 | Three blank grey squares at top stay grey forever — likely a stats summary that never loads. Looks broken on first impression. |
| 🟡 | "Last 7 Days" / calendar months both stuck on `Loading…` for >3 s — same data-readiness race we addressed elsewhere but the Tasks page was not migrated. |

### `/fasting`
| | Finding |
|---|---|
| 🟠 | Preset chips overflow horizontally — "18 Hours" is clipped, only first two fit comfortably at 375 px. Should be horizontally scrollable (with snap), or wrap. |
| 🟠 | Large circle button: "START FAST" wraps onto two lines and "Goal: 12h" overlaps the right edge of the circle. Layout assumes >375 px width. |
| 🟡 | Streak / Success / Failed / Success Rate stat tiles at 0 / 0 / 0 / 0% — fine numerically, but identical 4-tile layout duplicates the same "no data" signal four times. |

### `/workout` (Log Workout)
| | Finding |
|---|---|
| 🟡 | "LOG WORKOUT" CTA renders disabled-looking (pale lavender). Either the button is disabled until form is touched (good — but state needs a tooltip) or the contrast is just wrong. |
| 🟡 | "Exercises Performed" placeholder `Push-ups: 3x10, Squats: 3x15...` is a raw textarea — should use the structured Exercise UI we already built. |

---

## B.2 — Memory map

Five layers exist: Zustand store, react-query cache, browser `localStorage`, Capacitor `Preferences`, and Postgres via Prisma.

### Where each concept lives today

| # | Concept | Zustand | RQ | localStorage | Preferences | DB | Divergence risk |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| 1 | OAuth identity (`auth_token`, `auth_user`) | ✓ (reduced) | — | ✓ | — | — | Zustand has `{id,email,name}` only; full profile fetched separately. Drift unlikely but redundant write paths. |
| 2 | Full user profile | — | ✓ `useCurrentUser` | — | — | ✓ | Backend `/api/chat` route ALSO reads user directly from Prisma — duplicate hot path. |
| 3 | Active plan | ✓ `activeWorkoutPlan` | partial via `useWorkoutPlans` | mock fallback | — | ✓ | Two readers can disagree after a mutation; we manually `setActiveWorkoutPlan` in many places. |
| 4 | All plans for user | — | ✓ `useWorkoutPlans` | mock fallback (`mock_workout_plans`) | — | ✓ | Mock-data fallback was a dev hack and is still checked first. |
| 5 | Structured workouts / exercises | — | per-call only (`workoutApi.getByPlan` direct axios call, not cached) | — | — | ✓ | Refetched every plan switch. Worth a real `useWorkouts(planId)` hook. |
| 6 | In-progress workout state | — | — | — | — | — | React local in `WorkoutExecution.tsx` only. Correct (transient). |
| 7 | Chat history | ✓ `chatHistory` | — | ✓ via `chatStorage` | — | `ConversationHistory` table exists but is **unused** | Three layers for the same thing. Backend table has zero callers. |
| 8 | Session ID | ✓ `sessionId` | — | — | — | — | Used as a tag only; not a foreign key. |
| 9 | Progress summary | ✓ `progress` | — | — | — | — | Set somewhere in Progress.tsx; readers unclear. |
| 10 | UI prefs (`hideCompletedWorkouts`) | — | — | — | ✓ | — | OK — device-local toggle. |
| 11 | Daily tasks | ✓ `useDailyTasksStore` | — | — | — | ✓ | Zustand mirrors DB through a service; no react-query wrapper. |
| 12 | Telegram config | — | — | — | ✓ (token, chatId) | ✓ | Dual-write: DB AND Preferences. No sync. |
| 13 | Fasting state | ✓ `useFastingStore` | — | — | — | ✓ | Zustand mirrors DB through a service; same shape as daily tasks. |
| 14 | Workout sessions | — | ✓ `useWorkoutSessions` | — | offline backup only | ✓ | `workoutSessionStorage` Preferences entry is written but never read in current flow. |

### Loose state not in the table
- Component-local UI state (modals, form drafts, toast text) in TodaysWorkout / WorkoutExecution / Profile / Fasting — fine to keep local; no need to lift.
- `authReady` flag in Zustand — bootstrap signal, not domain state. Keep.
- Exercise reorder state in `WorkoutExecution.tsx` — ephemeral per-session; correct as local state.

### Recommendations (drive Phase C targets)
1. **Drop `chatStorage` (localStorage) entirely**, use `ConversationHistory` Prisma table OR drop chat persistence entirely. Cannot keep three layers.
2. **Replace Zustand `user`, `activeWorkoutPlan`, `progress`** with react-query reads. Zustand keeps only `authReady`, `sessionId`, `chatHistory` (the truly transient bits).
3. **Delete `mock_workout_plans` fallback path** from `useWorkoutPlans` — dev hack with no current need.
4. **Stop dual-writing telegram config to Preferences AND DB** — pick DB, read once on app start.
5. **Add a real `useWorkouts(planId)` react-query hook** — currently each `TodaysWorkout` mount re-fetches via direct axios with no caching.

---

## B.3 — Code smells inventory

### A. Duplicate functions / parallel pipelines
| Finding | Files | Action |
|---|---|---|
| `userApi` AND `workoutPlanApi` exported twice with the same name | [frontend/src/services/api.ts:30,57](frontend/src/services/api.ts) vs [frontend/src/services/api_backend.ts:29,40](frontend/src/services/api_backend.ts) | Delete `api.ts`. User chose `api.ts` in V2_PLAN decisions, but `api_backend.ts` is the one currently in active use — re-confirm before deleting. |
| Day-header regex defined in 3 places | [src/services/WorkoutGenerationService.ts:22](src/services/WorkoutGenerationService.ts) (`/^\*{0,2}Day\s+(\d+)/`), [src/services/WorkoutParserService.ts:37](src/services/WorkoutParserService.ts) (different pattern), [frontend/src/types/workout.ts:50](frontend/src/types/workout.ts) | Extract a single `src/lib/planParser.ts` re-export both ends import. |
| Exercise-line regex defined in 2 ways, 4 fallback shapes in the frontend | [src/services/WorkoutGenerationService.ts:25-26](src/services/WorkoutGenerationService.ts), [frontend/src/types/workout.ts:70-85](frontend/src/types/workout.ts) | Same as above. Frontend should never parse text once the structured API is reliable. |
| Two AI-call code paths | [frontend/src/services/aiService.ts](frontend/src/services/aiService.ts) `chat()` AND `generateWorkoutPlans()` AND [src/services/ChatService.ts](src/services/ChatService.ts) `chat()` | All AI calls should go through backend `ChatService.chat`; remove frontend prompt construction. |

### B. Dead code
| Finding | Files | Action |
|---|---|---|
| `PlanCreationChat.tsx` never imported | [frontend/src/components/Plans/PlanCreationChat.tsx](frontend/src/components/Plans/PlanCreationChat.tsx) | Delete. |
| `localStorage.ts` mostly unused — `chatStorage` export has zero readers after our auth changes | [frontend/src/services/localStorage.ts](frontend/src/services/localStorage.ts) | Delete `chatStorage`, audit the rest. |
| `ConversationHistory` Prisma model never queried | [prisma/schema.prisma:140-149](prisma/schema.prisma) | Either start using it (chat history persistence decision from V2_PLAN) or drop. |
| ~16 one-shot migration scripts mixed with utilities in `scripts/` | `scripts/migrate-*.ts`, `scripts/sync-*.ts`, `scripts/test-*.ts`, `scripts/populate-*.js`, `scripts/parse-plan-*.ts` | Move one-shots to `scripts/archive/`; keep `reparse-plan*.ts`, `find-empty-workouts.ts`, `check-users.ts`, `check-plans-user-2.ts`, `cap-bodyweight-reps.ts` as ongoing utilities. |

### C. Files over 500 LOC
| File | LOC | Natural splits |
|---|---|---|
| [frontend/src/components/Workout/WorkoutExecution.tsx](frontend/src/components/Workout/WorkoutExecution.tsx) | ~1030 | TimerUI, WeightModal, VideoModal, ExerciseReorder, core state. |
| [frontend/src/components/Workout/TodaysWorkout.tsx](frontend/src/components/Workout/TodaysWorkout.tsx) | ~1020 | WorkoutCard, SessionRecap, HistoryList, PlanCarousel. |
| [frontend/src/pages/Profile.tsx](frontend/src/pages/Profile.tsx) | ~1010 | ProfileBasicInfo, ProfileEquipment, ProfileBodyweight, ProfileTelegram, ProfileDangerZone. |
| [frontend/src/components/Progress/Progress.tsx](frontend/src/components/Progress/Progress.tsx) | ~790 | ChartSection, StatsPanel. |
| [frontend/src/services/fastingService.ts](frontend/src/services/fastingService.ts) | ~614 | PresetManager, SessionCalculator, NotificationLogic. |
| [src/routes/workouts.ts](src/routes/workouts.ts) | ~580 | GET/POST/PATCH/DELETE handlers grouped. |
| [src/routes/workout-plans.ts](src/routes/workout-plans.ts) | ~540 | Same approach. |
| [frontend/src/components/Onboarding/OnboardingQuestionnaire.tsx](frontend/src/components/Onboarding/OnboardingQuestionnaire.tsx) | ~503 | Field-set components per step (Equipment, Goals, Profile, Metrics). |

### D. Silent-failure patterns (top 5)
| Site | Pattern | Action |
|---|---|---|
| [src/routes/chat.ts:76](src/routes/chat.ts) | `try { recentSessions = await … } catch (error) { console.error(…) }` — generic 500 to client, no detail | Surface error in response body. |
| [frontend/src/services/workoutSessionService.ts:87](frontend/src/services/workoutSessionService.ts) | Falls back to localStorage on backend error without telling user | Toast on backend failure. |
| [frontend/src/components/Workout/TodaysWorkout.tsx:142-154](frontend/src/components/Workout/TodaysWorkout.tsx) | `parseWorkoutPlan` text fallback can silently render approximate data — partially fixed but still firing on API errors | Make text-parse path opt-in for debug only. |
| [frontend/src/components/Workout/WorkoutExecution.tsx:75](frontend/src/components/Workout/WorkoutExecution.tsx) | `.catch(console.error)` on KeepAwake calls | Acceptable but document. |
| [src/routes/fasting.ts](src/routes/fasting.ts), [src/routes/daily-tasks.ts](src/routes/daily-tasks.ts) | Validation failures collapsed into 500 with generic message | Return Zod error details. |

### E. Type-safety leaks (top 5)
| Site | Cast | Risk |
|---|---|---|
| [src/routes/workouts.ts](src/routes/workouts.ts) — 5× `(exercise as any).attributes` | High | Add `Prisma.ExerciseGetPayload` type to scope. |
| [frontend/src/components/Plans/PlanCreationChat.tsx:238](frontend/src/components/Plans/PlanCreationChat.tsx) | `(user as any).availableEquipment = equipment` — direct mutation of a prop | High (dead code; deleting solves this) |
| [frontend/src/hooks/useStartPlanCreation.ts:35](frontend/src/hooks/useStartPlanCreation.ts) | `const value = (user as any)?.[f]` | Medium |
| [frontend/src/hooks/useWorkoutQueries.ts:73](frontend/src/hooks/useWorkoutQueries.ts) | `JSON.parse(plan.completedWorkouts as any)` | Medium |
| Multiple route handlers return `{ error: … } as any` | Medium | Define `ApiErrorResponse` type and remove casts. |

### F. Direct HTTP-to-self violations
None found. Backend services use Prisma directly. ✓

### G. Inconsistent error response shapes
~75 routes return `{ error }`; ~8 return `{ success: false, error }`; 1 returns `{ ok: true, … }`. Standardise on `{ error, details? }`.

### H. Surprising patterns
- `process.env.*` accessed across 10 files — no central config module. Action: create `src/config/env.ts` with validated schema, import once at startup.
- `Math.random()` for `difficultyRating` in `workoutSessionService.ts` — mock seed only, acceptable.
- `setInterval`/`setTimeout` cleanup is correct everywhere checked. ✓

---

## Phase C priority order (driven by this audit)

1. 🔴 **Delete dead code first** (zero risk, immediate clarity): `PlanCreationChat.tsx`, `chatStorage`, `ConversationHistory` model (or wire it up — pick one), `mock_workout_plans` fallback, one-shot scripts → `scripts/archive/`.
2. 🟠 **Collapse the two frontend API clients** (`api.ts` + `api_backend.ts` → one). High-impact, low risk after grep audit.
3. 🟠 **One shared parser**: extract `planParser.ts`, remove the four divergent regex pairs.
4. 🟠 **Trim Zustand** to `{ authReady, sessionId, chatHistory }`. Move `user`, `activeWorkoutPlan`, `progress` to react-query.
5. 🟠 **Split the four 1000-LOC files** into logical sub-components.
6. 🟡 **Standardise error responses** + create `ApiErrorResponse` type; remove the `as any` casts in routes.
7. 🟡 **Central `src/config/env.ts`**.
8. 🟡 **UI fixes from B.1** in priority order (Phase E).
