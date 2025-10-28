# AI Workout Routine Tracker - Development Documentation

## Project Overview

An AI-powered workout tracking application with integrated Telegram reminders, built with React/Ionic frontend and Node.js/TypeScript backend.

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

## Database Schema

### daily_tasks
```sql
CREATE TABLE daily_tasks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    last_reset_at TIMESTAMP
);
```

### telegram_config
```sql
CREATE TABLE telegram_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    bot_token VARCHAR(255),
    chat_id VARCHAR(255),
    daily_tasks_start_hour INT DEFAULT 9,
    last_task_reminder_sent TIMESTAMP,
    created_at TIMESTAMP
);
```

### workout_plans
```sql
CREATE TABLE workout_plans (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    plan_details TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    completed_workouts TEXT, -- JSON array
    telegram_preview_hour INT,
    created_at TIMESTAMP
);
```

### workout_sessions
```sql
CREATE TABLE workout_sessions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    plan_id BIGINT,
    day_number INT,
    session_date VARCHAR(50),
    duration_minutes INT,
    completion_rate DOUBLE,
    notes TEXT,
    created_at TIMESTAMP
);
```

## Scheduled Jobs

### Task Reminders (Hourly)
**Cron**: `0 0 * * * *` (Every hour on the hour)

**Logic**:
1. Iterate through all users with Telegram configured
2. Check if current hour is in user's reminder schedule
3. Verify > 55 minutes since last reminder (cooldown)
4. Get incomplete tasks for user
5. Generate AI-powered message with time-based pressure
6. Send via Telegram Bot API
7. Update `last_task_reminder_sent`

**Reminder Schedule** (configurable start hour, default 9am):
```
Hour 9:  First reminder (gentle)
Hour 11: Second reminder (+2h)
Hour 13: Third reminder (+2h)
Hour 14: Fourth reminder (+1h, increasing frequency)
Hour 15: Fifth reminder (+1h)
Hour 16: Sixth reminder (+1h)
Hour 17: Seventh reminder (+1h)
Hour 18: Eighth reminder (+1h)
Hour 19: Ninth reminder (+1h)
Hour 20: Final reminder (+1h)
```

### Workout Previews (Hourly)
**Cron**: `0 0 * * * *` (Every hour on the hour)

**Logic**:
1. Find all active workout plans with `telegram_preview_hour` set
2. Filter plans where `telegram_preview_hour == current_hour`
3. Parse next workout from `plan_details`
4. Format message: Plan name + Day + Exercise list
5. Send via Telegram Bot API

### Midnight Reset (Daily)
**Cron**: `0 0 0 * * *` (Every day at midnight)

**Logic**:
1. Get all daily tasks for all users
2. Set `completed = false`
3. Update `last_reset_at = now()`
4. Save to database

## API Endpoints

### Daily Tasks
- **GET** `/api/daily-tasks/user/{userId}` - Get all user tasks (auto-resets if needed)
- **GET** `/api/daily-tasks/user/{userId}/incomplete` - Get incomplete tasks only
- **POST** `/api/daily-tasks/user/{userId}` - Create task
  ```json
  {
    "title": "Drink 8 glasses of water"
  }
  ```
- **PUT** `/api/daily-tasks/{taskId}/toggle` - Toggle completion
- **DELETE** `/api/daily-tasks/{taskId}` - Delete task
- **POST** `/api/daily-tasks/user/{userId}/reset` - Manual reset

### Migration
- **POST** `/api/migration/save` - Import localStorage data
  ```json
  {
    "userId": 123,
    "tasks": [...],
    "workoutPlans": [...],
    "workoutSessions": [...],
    "telegramConfig": {
      "botToken": "...",
      "chatId": "...",
      "startHour": 9
    }
  }
  ```

### Health
- **GET** `/api/health` - Backend health check

## Frontend Data Flow

### Daily Tasks (Pre-Migration)
```
User Action → DailyTasks.tsx → localStorage
                              ↓
                     LocalNotifications.schedule()
                              ↓
                     App State Listener (on resume)
                              ↓
                     telegramService.sendMessage()
```

### Daily Tasks (Post-Migration)
```
User Action → DailyTasks.tsx → Backend API
                              ↓
                         Database
                              ↓
                    TelegramSchedulerService (automatic)
```

### Workout Execution
```
TodaysWorkout.tsx → Select Workout
       ↓
WorkoutExecution.tsx → Log Sets/Reps/Weight
       ↓
Save Session → workoutSessionStorage.save()
       ↓
Update Plan → Mark day complete
```

### AI Coach Chat
```
User Message → ChatInterface.tsx
       ↓
chatApi.sendMessage()
       ↓
aiService.chat() → Claude API
       ↓
Parse Response → Apply Changes (if plan update)
       ↓
workoutPlanApi.update()
```

## Configuration Files

### Frontend `.env`
```env
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_PERPLEXITY_API_KEY=pplx-...
```

### Backend `application-local.properties`
```properties
llm.anthropic.api.key=sk-ant-...
llm.openai.api.key=sk-proj-...
```

### Backend `application.properties` (Main)
```properties
server.port=8080
spring.datasource.url=jdbc:h2:file:./workout.db
spring.jpa.hibernate.ddl-auto=update
cors.allowed.origins=*
```

## Local Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Xcode (for iOS) or Android Studio

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Browser: http://localhost:5173

# For mobile
npm run build
npx cap sync ios    # or android
npx cap open ios    # or android
```

### Backend Setup
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Generate Prisma client and setup database
npx prisma generate
npx prisma db push

# Build and run
npm run build
npm run dev  # Runs on http://localhost:8080
```

## Testing

### Frontend
```bash
npm run test         # Unit tests
npm run test.e2e     # Cypress E2E tests
```

### Backend
```bash
npm test             # Unit tests (when implemented)
npm run dev          # Manual testing
```

### Test Telegram Integration
```bash
# Send test reminder
curl -X POST http://localhost:8080/api/daily-tasks/user/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task"}'

# Check logs for:
# "Checking for task reminders to send..."
# "Sent task reminder to user 1 with 1 tasks"
```

## Deployment

### Frontend (iOS)
1. Build: `npm run build && npx cap sync ios`
2. Open Xcode: `npx cap open ios`
3. Select device/simulator
4. Click Run (⌘R)

### Backend (Production)
```bash
# Deploy to Vercel
git push origin vercel-deploy-root
# Or use Vercel CLI
vercel deploy

# Local production build
npm run build
npm start
```

## Key Implementation Details

### Stale Closure Bug Fix (Daily Tasks)
**Problem**: Midnight reset was using stale `tasks` state from component mount time, resulting in empty array.

**Solution**: Read directly from localStorage in `resetAllTasks()`:
```typescript
const resetAllTasks = () => {
  const storedTasks = localStorage.getItem('dailyTasks');
  if (storedTasks) {
    const currentTasks = JSON.parse(storedTasks);
    const updatedTasks = currentTasks.map((task: DailyTask) =>
      ({ ...task, completed: false })
    );
    saveTasks(updatedTasks);
  }
};
```

### App State Listener Setup
**Challenge**: Capacitor listeners need proper cleanup and async handling.

**Solution**: Separate useEffect with cleanup function:
```typescript
useEffect(() => {
  let cleanup: (() => void) | undefined;

  setupAppStateListener().then((cleanupFn) => {
    cleanup = cleanupFn;
  });

  return () => {
    if (cleanup) cleanup();
  };
}, []);
```

### Workout Plan Updates Not Showing
**Problem**: Chat-based plan updates weren't reflecting in Today's Workout page.

**Solution**: Watch `activeWorkoutPlan?.planDetails` and refresh from API:
```typescript
useEffect(() => {
  if (user?.id && activeWorkoutPlan) {
    const refreshPlans = async () => {
      const allPlans = await workoutPlanApi.getUserPlans(user.id!);
      const activePlans = allPlans.filter(p => p.isActive && !p.isArchived);
      setActiveWorkoutPlans(activePlans);
    };
    refreshPlans();
  }
}, [activeWorkoutPlan?.planDetails]);
```

### Telegram Message Pressure Escalation
```typescript
const getPressureLevel = (hour: number): string => {
  if (hour < 12) return 'gentle';   // Morning: encouraging
  if (hour < 15) return 'moderate'; // Afternoon: assertive
  if (hour < 18) return 'urgent';   // Evening: strong
  return 'critical';                 // Night: maximum pressure
};
```

## Environment Variables

### Required
- `VITE_ANTHROPIC_API_KEY` - Claude API key (frontend)
- Telegram bot token (stored per user in database)
- Telegram chat ID (stored per user in database)

### Optional
- `VITE_PERPLEXITY_API_KEY` - Perplexity API (if using)
- `llm.anthropic.api.key` - Backend Claude key (for future AI features)

## Security Notes

### API Keys
- Frontend: Environment variables (`.env` - gitignored)
- Backend: `application-local.properties` (gitignored)
- Never commit actual keys
- Use `.env.example` files as templates

### CORS
- Development: `*` (allow all)
- Production: Configure specific origins in `application.properties`

### Telegram Security
- Bot tokens stored encrypted in database (TODO)
- Chat IDs validated before sending
- Rate limiting on scheduled messages (55-minute cooldown)

## Common Issues

### Tasks Disappeared at Midnight
**Cause**: Stale closure in `resetAllTasks()`
**Fix**: Read from localStorage instead of state (see above)

### Telegram Messages Not Sending
**Causes**:
1. Backend not running
2. Incorrect bot token/chat ID
3. Outside reminder schedule hours
4. Too soon since last reminder (< 55 min)

**Debug**: Check backend logs for scheduling activity

### Plan Updates Not Showing
**Cause**: Local state not refreshing
**Fix**: Added useEffect watching `activeWorkoutPlan?.planDetails`

### LocalNotifications Error
**Cause**: Called `.cancel()` with empty array
**Fix**: Get pending notifications first, filter, then cancel

## Migration Checklist

- [x] Backend built and compiling
- [x] Daily Tasks API implemented
- [x] Telegram scheduler service created
- [x] Migration endpoint working
- [x] Frontend migration page created
- [ ] Start backend locally
- [ ] Test health endpoint
- [ ] Run migration from phone
- [ ] Verify scheduled reminders working
- [ ] Update frontend to use backend API
- [ ] Deploy backend to production server

## Future Enhancements

### Backend
- [ ] PostgreSQL for production
- [ ] User authentication (JWT)
- [ ] Rate limiting
- [ ] Encrypted Telegram credentials
- [ ] Webhook support for Telegram
- [ ] REST API for workout plan CRUD
- [ ] GraphQL API option

### Frontend
- [ ] Offline support with sync
- [ ] Push notifications (in addition to Telegram)
- [ ] Dark mode toggle
- [ ] Exercise video library
- [ ] Social features (share workouts)
- [ ] Advanced analytics dashboard

### Features
- [ ] Workout plan templates marketplace
- [ ] Exercise form checker (AI vision)
- [ ] Nutrition tracking
- [ ] Integration with fitness wearables
- [ ] Voice commands for workout logging
- [ ] Progressive overload recommendations

## Resources

- [Ionic Documentation](https://ionicframework.com/docs)
- [Node.js Cron Jobs](https://www.npmjs.com/package/node-cron)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)

## Project Stats

- **Total Files**: 169
- **Lines of Code**: ~25,000+
- **Frontend Components**: 15+
- **Backend Endpoints**: 8
- **Scheduled Jobs**: 3
- **Database Tables**: 5

---

**Last Updated**: October 28, 2025
**Version**: 2.0.0
**Author**: Built with Claude Code 🤖
