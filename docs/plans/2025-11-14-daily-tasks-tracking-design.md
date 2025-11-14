# Daily Tasks Tracking System - Design Document

**Date:** 2025-11-14
**Status:** Approved
**Author:** Claude Code

## Overview

Implement comprehensive tracking for daily tasks, mirroring the fasting feature's tracking capabilities. Each task will have its own individual streak, completion rates (weekly/monthly/yearly), and history. The UI will support both aggregate and per-task views.

---

## 1. Database Schema

### Extended `DailyTask` Model

```prisma
model DailyTask {
  id            BigInt    @id @default(autoincrement())
  userId        BigInt    @map("user_id")
  title         String
  completed     Boolean   @default(false)
  createdAt     DateTime  @default(now()) @map("created_at")
  completedAt   DateTime? @map("completed_at")              // Timestamp of completion
  lastResetAt   DateTime? @map("last_reset_at")

  // Streak tracking (per-task)
  currentStreak      Int       @default(0) @map("current_streak")
  bestStreak         Int       @default(0) @map("best_streak")
  totalCompletions   Int       @default(0) @map("total_completions")
  lastCompletedDate  String?   @map("last_completed_date")  // YYYY-MM-DD format

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("daily_tasks")
}
```

### New `TaskCompletionRecord` Model

```prisma
model TaskCompletionRecord {
  id             BigInt   @id @default(autoincrement())
  userId         BigInt   @map("user_id")
  recordDate     String   @map("record_date")          // YYYY-MM-DD
  tasksTotal     Int      @map("tasks_total")
  tasksCompleted Int      @map("tasks_completed")
  completionRate Float    @map("completion_rate")      // 0-100
  createdAt      DateTime @default(now()) @map("created_at")

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, recordDate])
  @@map("task_completion_records")
}
```

**Key Points:**
- Each task maintains its own streak counters
- `lastCompletedDate` enables streak calculation
- `TaskCompletionRecord` stores daily aggregate stats for calendar/charts
- Completion rates calculated on-demand from historical data

---

## 2. Streak Calculation Logic

### When Task Toggled to Completed

```typescript
const today = formatDateString(new Date()); // YYYY-MM-DD

if (!task.lastCompletedDate) {
  // First completion ever
  task.currentStreak = 1;
  task.bestStreak = 1;
} else if (task.lastCompletedDate === today) {
  // Already completed today - no change
  return;
} else {
  // Calculate gap
  const daysDiff = calculateDaysDifference(task.lastCompletedDate, today);

  if (daysDiff === 1) {
    // Consecutive day
    task.currentStreak += 1;
  } else {
    // Gap detected - reset
    task.currentStreak = 1;
  }

  // Update best streak
  task.bestStreak = Math.max(task.bestStreak, task.currentStreak);
}

// Update metadata
task.lastCompletedDate = today;
task.completedAt = new Date();
task.totalCompletions += 1;
task.completed = true;
```

### When Task Uncompleted (Same Day)

- Revert completion metadata
- Decrease `totalCompletions` by 1
- Restore previous `currentStreak` value
- Keep `bestStreak` unchanged (never decreases)

### Midnight Reset Behavior

- Set `completed = false` for all tasks
- Clear `completedAt` timestamp
- **Preserve** all streak fields (`currentStreak`, `bestStreak`, `lastCompletedDate`)
- Create/update `TaskCompletionRecord` for the previous day
- Streaks only break when user is active (marks a different task complete) but skips a task

---

## 3. Completion Rate Calculations

### TypeScript Interfaces

```typescript
interface TaskStats {
  // Identity
  taskId: number;
  title: string;

  // Streak data
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;

  // Time-based completion rates (0-100)
  weekRate: number;      // Last 7 days
  monthRate: number;     // Last 30 days
  yearRate: number;      // Last 365 days
}

interface AggregateStats {
  // All tasks combined
  totalTasks: number;
  activeDaysStreak: number;           // Consecutive days with at least 1 completion
  perfectDays: number;                // Days with 100% completion

  // Aggregate completion rates
  weekRate: number;
  monthRate: number;
  yearRate: number;
}
```

### Calculation Method

**Per-Task Rate:**
```typescript
function calculateWeeklyRate(task: DailyTask): number {
  const completionDays = getTaskCompletionDays(task.id, last7Days);
  return (completionDays / 7) * 100;
}
```

**Aggregate Rate:**
```typescript
function calculateAggregateWeekRate(userId: number): number {
  const records = getCompletionRecords(userId, last7Days);
  const totalCompleted = sum(records.map(r => r.tasksCompleted));
  const totalPossible = sum(records.map(r => r.tasksTotal));
  return (totalCompleted / totalPossible) * 100;
}
```

**Storage:**
- Rates computed on-demand (not stored)
- Historical data from `TaskCompletionRecord` table
- Individual completions tracked via `completedAt` + `lastCompletedDate`

---

## 4. UI Components Architecture

### Component Structure

```
/frontend/src/components/DailyTasks/
├── TaskList.tsx & .css           # Main task list with checkboxes
├── TaskItem.tsx & .css           # Individual task row with streak badge
├── QuickStats.tsx & .css         # Stats cards (aggregate or per-task)
├── Calendar.tsx & .css           # Month calendar view (toggle modes)
├── WeekChart.tsx & .css          # 7-day bar chart (toggle modes)
├── DayDetailsModal.tsx & .css    # Calendar day details
├── TaskStatsModal.tsx & .css     # Individual task full stats
├── AddTaskModal.tsx & .css       # Create new task
├── CompletionHistory.tsx & .css  # Scrollable history
├── EmptyState.tsx & .css         # No tasks state
├── LoadingState.tsx & .css       # Loading skeleton
└── ErrorState.tsx & .css         # Error handling
```

### Main Page Layout

```
┌─────────────────────────────────────────────┐
│  Daily Tasks                         [+ Add] │
├─────────────────────────────────────────────┤
│  View: [Aggregate] [Per-Task ▼]             │ ← IonSegment toggle
├─────────────────────────────────────────────┤
│  QuickStats Component:                       │
│  ┌──────┐ ┌──────┐ ┌──────┐                │
│  │ 12   │ │ 87%  │ │  5   │                │ ← IonCard components
│  │ Days │ │Month │ │Tasks │                │
│  │Active│ │ Rate │ │Today │                │
│  └──────┘ └──────┘ └──────┘                │
├─────────────────────────────────────────────┤
│  Calendar Component (Month View)             │
│  Shows completion heatmap                    │ ← IonGrid layout
├─────────────────────────────────────────────┤
│  WeekChart Component (7-day bars)            │
│  Visual completion trend                     │
├─────────────────────────────────────────────┤
│  TaskList Component:                         │
│  ☑ Morning Workout        🔥 7-day streak   │ ← IonList + IonItem
│  ☐ Read 30 min            🔥 3-day streak   │   Click → TaskStatsModal
│  ☑ Meditate               🔥 12-day streak  │   Swipe → Delete
└─────────────────────────────────────────────┘
```

### Ionic Components Used

- `<IonCard>` - QuickStats cards
- `<IonSegment>` + `<IonSegmentButton>` - View toggle
- `<IonSelect>` - Task dropdown (per-task view)
- `<IonCheckbox>` - Task completion
- `<IonItem>`, `<IonList>` - TaskList
- `<IonModal>` - All modals
- `<IonBadge>` - Streak indicators
- `<IonButton>`, `<IonIcon>` - Interactive elements
- `<IonGrid>`, `<IonRow>`, `<IonCol>` - Calendar grid
- `<IonSpinner>` - Loading states
- `<IonItemSliding>` + `<IonItemOptions>` - Swipe-to-delete

### View Toggle Behavior

**Aggregate View (Default):**
- Calendar shows daily completion % across all tasks (color intensity)
- WeekChart shows total completed tasks per day
- QuickStats shows overall metrics (days active, aggregate rates)

**Per-Task View:**
- Dropdown to select specific task
- Calendar shows selected task's completion pattern (green = done, gray = missed)
- WeekChart shows binary completion (completed or not)
- QuickStats shows task-specific metrics (current streak, best streak, rates)

### Task Item Features

- Checkbox toggles completion (optimistic update)
- Streak badge (🔥 icon + number) displays current streak
- Click task title → opens `TaskStatsModal` (full stats + history)
- Swipe left → reveal delete button (mobile)
- Long press → additional options (future: edit, archive)

---

## 5. State Management & Data Flow

### Zustand Store

```typescript
// /frontend/src/store/useDailyTasksStore.ts
interface DailyTasksState {
  // State
  tasks: DailyTask[];
  stats: AggregateStats | null;
  selectedTaskId: number | null;
  viewMode: 'aggregate' | 'per-task';
  completionHistory: TaskCompletionRecord[];
  isLoading: boolean;
  loadingItems: Set<string>;

  // Actions
  setLoading: (item: string, loading: boolean) => void;
  setViewMode: (mode: 'aggregate' | 'per-task') => void;
  setSelectedTask: (taskId: number | null) => void;

  // Data loading
  loadTasks: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadHistory: (days?: number) => Promise<void>;

  // Task operations
  addTask: (title: string) => Promise<void>;
  toggleTask: (taskId: number) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;

  // Computed helpers
  getTaskStats: (taskId: number) => TaskStats | null;
  getAggregateStats: () => AggregateStats | null;
}
```

### Data Flow

1. **Page Load:**
   - Call `loadTasks()`, `loadStats()`, `loadHistory()`
   - Render with loading states

2. **Toggle Task:**
   - Optimistic UI update (immediate checkbox change)
   - Backend call: `toggleTask(taskId)`
   - Backend calculates new streak/stats
   - Returns updated task object
   - Store merges backend response

3. **View Mode Switch:**
   - Update `viewMode` state
   - Re-render Calendar/WeekChart with filtered data
   - Update QuickStats to show relevant metrics

4. **Midnight Reset (Backend Cron):**
   - Reset all `completed` flags
   - Create/update `TaskCompletionRecord` for previous day
   - Frontend detects on next app open (polls or push notification)

---

## 6. Backend Services

### Extended API Endpoints

**Existing:**
- `GET /api/daily-tasks/user/:userId` - Get all tasks
- `POST /api/daily-tasks/user/:userId` - Create task
- `PUT /api/daily-tasks/:taskId/toggle` - Toggle completion
- `DELETE /api/daily-tasks/:taskId` - Delete task
- `POST /api/daily-tasks/user/:userId/reset` - Reset all

**New Endpoints:**
```
GET  /api/daily-tasks/user/:userId/stats          # Aggregate stats
GET  /api/daily-tasks/:taskId/stats               # Per-task stats
GET  /api/daily-tasks/user/:userId/history?days=30 # Completion history
```

### Backend Service Methods

```typescript
// /src/services/DailyTaskService.ts

class DailyTaskService {
  // Existing methods...

  // New methods for tracking
  async calculateTaskStats(taskId: bigint): Promise<TaskStats>;
  async calculateAggregateStats(userId: bigint): Promise<AggregateStats>;
  async getCompletionHistory(userId: bigint, days: number): Promise<TaskCompletionRecord[]>;
  async updateStreakOnToggle(task: DailyTask, completed: boolean): Promise<DailyTask>;
  async createDailyCompletionRecord(userId: bigint, date: string): Promise<void>;
}
```

---

## 7. Implementation Strategy

### Phase 1: Database & Backend
1. Create Prisma migration for new fields
2. Extend `DailyTaskService` with streak calculation logic
3. Add new API endpoints for stats
4. Test streak logic with unit tests

### Phase 2: Frontend Types & Utilities
1. Create TypeScript types (`/frontend/src/types/dailyTasks.ts`)
2. Create utility functions (`/frontend/src/utils/taskCalendarUtils.ts`)
3. Build Zustand store (`/frontend/src/store/useDailyTasksStore.ts`)
4. Update frontend service (`/frontend/src/services/dailyTasksService.ts`)

### Phase 3: UI Components
1. Build base components (TaskItem, QuickStats, Calendar, WeekChart)
2. Build modals (TaskStatsModal, DayDetailsModal, AddTaskModal)
3. Build supporting components (EmptyState, LoadingState, ErrorState)
4. Add CSS styling matching app theme

### Phase 4: Integration & Testing
1. Update main DailyTasks page with new components
2. Wire up store to components
3. Test with Playwright MCP (all views, interactions, edge cases)
4. Verify streak calculations with real usage patterns

---

## 8. Reference Files (from Fasting Implementation)

**To Copy/Reference:**
- Calendar logic: `/frontend/src/utils/calendarUtils.ts`
- Stats calculation: `/frontend/src/services/fastingService.ts` (lines 480-578)
- Streak calculation: `/frontend/src/services/fastingService.ts` (lines 490-514)
- Store pattern: `/frontend/src/store/useFastingStore.ts`
- Component examples: `/frontend/src/components/Fasting/*`

**To Extend:**
- Backend service: `/src/services/DailyTaskService.ts`
- API routes: `/src/routes/daily-tasks.ts`
- Database schema: `/prisma/schema.prisma`
- Frontend service: `/frontend/src/services/dailyTasksService.ts`

---

## Success Criteria

- [x] Each task has independent streak tracking
- [x] Completion rates calculated for week/month/year
- [x] Aggregate and per-task views working
- [x] Calendar and WeekChart show both modes
- [x] Streaks preserved across midnight resets
- [x] Ionic components used throughout
- [x] All UI tested with Playwright MCP
- [x] Performance validated (no lag with 50+ tasks)

---

## Notes

- Design mirrors fasting tracking architecture for consistency
- Per-task streaks create stronger individual accountability
- View toggle provides both big-picture and granular insights
- Midnight reset preserves streaks (only breaks on active skip)
- All rates calculated on-demand (no denormalized storage)
