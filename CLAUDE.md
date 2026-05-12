# AI Workout Routine Tracker - Development Documentation

## Project Overview

An AI-powered workout tracking application with integrated Telegram reminders, built with React/Ionic frontend and Node.js/TypeScript backend.

## Engineering Principles (read this first)

These are the rules Claude applies to every change in this repo. They override personal preference and unspoken conventions. If a request conflicts with one of them, surface the conflict before acting.

### DRY — Don't Repeat Yourself
- **Look before you write.** Before adding a function, hook, service, or type, grep for an existing one with the same job. The codebase has `useCurrentUser`, `useStartPlanCreation`, `WorkoutGenerationService`, `parseExerciseAttributes`, etc. — reuse them.
- **Three identical lines is a smell, not a pattern.** Extract.
- **One source of truth per piece of data.** User profile lives in `useCurrentUser` (react-query cache). Active plan lives in Zustand. Don't fork them into local component state — read directly.
- **Don't have two ways to do the same thing.** The codebase had `aiService.chat` (frontend → backend chat endpoint) AND `chatService.chat` (backend internal) duplicating prompt construction. Pick one path, route everything through it.

### KISS / STUPID — Keep It Simple
- **Default to no abstraction.** Helpers earn their keep by having ≥3 real callers. A "future-proof" interface with one caller is dead weight.
- **No premature feature flags, fallbacks, or compatibility shims.** Change the code.
- **No defensive try/catch for things that can't fail.** Trust your types and framework guarantees. Only validate at system boundaries (HTTP body, AI output, file uploads).
- **Don't paper over bugs.** If a parser fails on a real input, fix the parser — don't add a fallback that silently masks the failure (see the `parseWorkoutPlan` text-fallback regression we shipped earlier).

### SOLID (the practical bits)
- **Single Responsibility:** a route handles HTTP. A service handles business logic. A hook handles React lifecycle. Don't let services import `axios` for HTTP-to-self calls — call the function directly.
- **Open/Closed:** when adding a new exercise attribute kind (dumbbells, incline, cable…), extend the discriminated union and add a renderer in `AttributeStrip.tsx`. Don't fork a parallel pipeline.
- **Dependency direction:** UI → hooks → services → routes/db. Never bottom-up. A service must not import from `pages/` or `components/`.
- **Interface Segregation:** don't pass a 30-field "anyData" object to functions that need three fields. Pass the three fields.

### YAGNI — You Aren't Gonna Need It
- **Don't write for hypothetical futures.** No "we might want to support multiple users", no "this could be extended to support X". Ship the concrete need.
- **No dead code.** If a component isn't imported anywhere (`PlanCreationChat.tsx` was a recent example), delete it. Git remembers.
- **No commented-out blocks.** Delete or rewrite.
- **No `// TODO: someday` markers.** Either do it now, file an issue, or accept it and move on.

### Boundaries & data shape
- **One canonical type per concept.** `ExerciseAttributes` is defined in both `src/types/exercise.ts` and `frontend/src/types/workout.ts` because Node and Vite don't share a build. Keep them in lock-step — when you change one, update the other in the same commit.
- **Validate at the seam.** HTTP bodies → Zod. AI output → Zod + post-checks. Anything reading from `JSON` Prisma columns → safe parse with a typed return.
- **Don't leak internal types across the wire.** `BigInt` IDs become strings in responses; arrays come back as arrays, not JSON strings; Json-null is `null`, not `Prisma.JsonNull`.

### Workflow rules for Claude in this repo
- **Verify before recommending.** When suggesting a file/function exists, grep first. Memory of "I wrote it last session" is not proof.
- **Prefer editing existing files over creating new ones.** Especially `CLAUDE.md` (this file), `package.json`, `schema.prisma`.
- **Test what you change.** Type-check both ends after every meaningful edit (`npm run build` in root for backend; `npx tsc --noEmit` in `frontend/`). Run Playwright MCP for UI changes.
- **Surface failure modes.** When wiring AI calls, always have a clear error path that reaches the UI as an actionable toast — never a silent log.
- **Commit messages describe the why.** Title states what changed. Body explains the reason (a missing constraint, a user-reported bug, a phase of work).

## Visual Development & Testing


### Quick Visual Check

**IMMEDIATELY after implementing any front-end change:**

1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** - Review any provided context files or requirements
6. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** - Run `mcp__playwright__browser_console_messages` ⚠️

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review

For significant UI changes or before merging PRs, use the design review agent:

```bash
# Option 1: Use the slash command
/design-review

# Option 2: Invoke the agent directly
@agent-design-review
```

The design review agent will:

- Test all interactive states and user flows
- Verify responsiveness (desktop/tablet/mobile)
- Check accessibility (WCAG 2.1 AA compliance)
- Validate visual polish and consistency
- Test edge cases and error states
- Provide categorized feedback (Blockers/High/Medium/Nitpicks)

### Playwright MCP Integration

#### Essential Commands for UI Testing

```javascript
// Navigation & Screenshots
mcp__playwright__browser_navigate(url); // Navigate to page
mcp__playwright__browser_take_screenshot(); // Capture visual evidence
mcp__playwright__browser_resize(
  width,
  height
); // Test responsiveness

// Interaction Testing
mcp__playwright__browser_click(element); // Test clicks
mcp__playwright__browser_type(
  element,
  text
); // Test input
mcp__playwright__browser_hover(element); // Test hover states

// Validation
mcp__playwright__browser_console_messages(); // Check for errors
mcp__playwright__browser_snapshot(); // Accessibility check
mcp__playwright__browser_wait_for(
  text / element
); // Ensure loading
```

### Design Compliance Checklist

When implementing UI features, verify:

- [ ] **Visual Hierarchy**: Clear focus flow, appropriate spacing
- [ ] **Consistency**: Uses design tokens, follows patterns
- [ ] **Responsiveness**: Works on mobile (375px), tablet (768px), desktop (1440px)
- [ ] **Accessibility**: Keyboard navigable, proper contrast, semantic HTML
- [ ] **Performance**: Fast load times, smooth animations (150-300ms)
- [ ] **Error Handling**: Clear error states, helpful messages
- [ ] **Polish**: Micro-interactions, loading states, empty states

## When to Use Automated Visual Testing

### Use Quick Visual Check for:

- Every front-end change, no matter how small
- After implementing new components or features
- When modifying existing UI elements
- After fixing visual bugs
- Before committing UI changes

### Use Comprehensive Design Review for:

- Major feature implementations
- Before creating pull requests with UI changes
- When refactoring component architecture
- After significant design system updates
- When accessibility compliance is critical

### Skip Visual Testing for:

- Backend-only changes (API, database)
- Configuration file updates
- Documentation changes
- Test file modifications
- Non-visual utility functions



## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Mobile**: Ionic Framework + Capacitor
- **State Management**: Zustand
- **Storage**: localStorage (migrating to backend)
- **AI Integration**: Claude API (Anthropic) + Perplexity API
- **Notifications**: Capacitor Local Notifications + Telegram Bot API

### Backend
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js 18+
- **Database**: SQLite (file-based with Prisma ORM)
- **ORM**: Prisma Client
- **Scheduling**: node-cron
- **Messaging**: Telegram Bot API via Axios
- **Deployment**: Vercel Serverless Functions

## Key Features

### 1. Workout Management
- AI-generated personalized workout plans
- Multiple active plans support
- Progress tracking with calendar view
- Exercise execution with real-time logging
- Completed workout filtering

### 2. AI Coach
- Chat interface for workout modifications
- Context-aware responses using workout history
- Plan adjustments and exercise substitutions
- Powered by Claude 3.5 Sonnet

### 3. Daily Tasks
- Task CRUD operations
- Automatic midnight reset (unchecks all tasks)
- Local notifications (scheduled throughout the day)
- Telegram reminders with increasing pressure levels:
  - **Morning (< 12pm)**: 💪 Gentle - "Good morning! Time to get things done."
  - **Afternoon (12-3pm)**: ⚡ Moderate - "Hey! Don't forget about your tasks today."
  - **Evening (3-6pm)**: 🔥 Urgent - "Time is running out! Complete your tasks now!"
  - **Night (6pm+)**: 🚨 Critical - "⚠️ URGENT: Complete your tasks before the day ends!"

### 4. Telegram Integration
- Scheduled task reminders (hourly checks with cooldown)
- Workout preview messages at custom times
- AI-generated personalized messages
- Auto-send on app resume (phone unlock detection)

### 5. Progress Tracking
- Calendar view of workout history
- Session statistics and trends
- Click-to-scroll workout details
- Completion rate tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Ionic/React)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Today's    │  │  Daily Tasks │  │    Plans     │      │
│  │   Workout    │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Progress   │  │  AI Coach    │  │   Profile    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Express.js/TypeScript)             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                Routes (REST APIs)                     │   │
│  │  • /api/daily-tasks  • /api/migration                │   │
│  │  • /api/health                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Services                             │   │
│  │  • DailyTaskService    • TelegramService             │   │
│  │  • TelegramSchedulerService (node-cron)              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Database Layer (Prisma)                   │   │
│  │  • Daily Tasks  • Telegram Config  • Workout Plans   │   │
│  │  • Workout Sessions  • Users                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Database (SQLite File-based)                │
│  • daily_tasks  • telegram_config  • workout_plans          │
│  • workout_sessions  • users                                 │
└─────────────────────────────────────────────────────────────┘

                  External Integrations
┌──────────────────────┐      ┌──────────────────────┐
│   Telegram Bot API   │      │  Anthropic Claude    │
│  (Scheduled Messages)│      │  (AI Coach Responses)│
└──────────────────────┘      └──────────────────────┘
```

[Rest of the document remains unchanged]

## Memory Notes

### Development Workflow Updates
- Implemented a comprehensive design review process for UI changes
- Added detailed steps for visual testing and verification
- Created a structured approach to design compliance and testing

### New Workflow Guidance
- Introduced a systematic method for verifying front-end changes
- Detailed the process of using Playwright for visual testing
- Added specific scenarios for when to use quick and comprehensive design reviews
- test features with playwright mcp