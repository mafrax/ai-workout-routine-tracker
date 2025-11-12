# Intermittent Fasting Timer - Design Document

**Date**: 2025-11-12
**Status**: Design Complete - Ready for Implementation

## Overview

Add a comprehensive intermittent fasting timer feature to the workout tracking app. Users can track their fasting sessions with customizable goal presets, view detailed statistics and history, and receive motivational notifications via both local alerts and Telegram messages.

## User Flow

### Starting a Fast
1. User navigates to new "Fasting" tab in bottom navigation
2. Selects a goal preset (e.g., "16 Hours", "Weekday Fast")
3. Taps large green "START FAST" button
4. Button turns red, timer begins counting from 00:00:00
5. Milestone notifications are scheduled

### During a Fast
- Timer displays live elapsed time (HH:MM:SS)
- Progress shown as "14h 32m / 16h" with percentage
- When goal is reached: "Goal met ✓" badge appears
- Timer continues running beyond goal (tracking actual duration)
- App can be closed/reopened - timer persists via stored start timestamp

### Stopping a Fast
1. User taps red button
2. Confirmation dialog appears:
   - "End your fast?"
   - Current duration vs goal
   - Goal met status (✓ or ✗)
   - "Cancel" and "End Fast" buttons
3. On confirmation:
   - Session saved to history
   - Button returns to green
   - Success animation if goal was met

## Core Features

### 1. Timer Interface

**New Tab in Bottom Navigation**
- Position: Between "Tasks" and "Progress"
- Icon: `time` or `timer` from ionicons
- Label: "Fasting"

**Main Screen Layout:**

**Top Section - Goal Presets**
- Horizontally scrollable chips showing saved presets
- Each preset: name + duration (e.g., "Weekday 16h", "Deep Fast 24h")
- Active preset highlighted
- "+ Add Preset" button
- Tapping preset sets it as current goal (only when not fasting)

**Center Section - Timer Button**
- Large circular button (60-70% screen width)
- **Green State (Not Fasting):**
  - Green gradient background
  - Center text: "START FAST"
  - Below: "Goal: 16h 0m"
- **Red State (Fasting):**
  - Red gradient background
  - Center: Live timer "HH:MM:SS"
  - Below: Progress "14h 32m / 16h" with percentage
  - "Goal met ✓" badge when duration >= goal

**Bottom Section - Quick Stats**
- Current streak (consecutive successful fasts)
- Last fast duration
- This week's success rate

### 2. Preset Management

**Default Presets (First Launch):**
- "12 Hours" (720 min)
- "16 Hours" (960 min)
- "18 Hours" (1080 min)
- "24 Hours" (1440 min)

**Add Preset Modal:**
- Name field (text input)
- Duration picker (hours/minutes wheels or steppers)
- Save button

**Edit/Delete Presets:**
- Settings icon on preset chip → edit modal
- OR swipe-to-delete gesture
- Can't delete if used in active fast
- Deleting doesn't affect historical data

### 3. Statistics Dashboard

**Key Metrics Cards (2x2 Grid):**
- **Current Streak**: Days with successful fasts
- **Total Fasts**: Lifetime completed count
- **Success Rate**: % meeting goal (last 30 days)
- **Average Duration**: Mean fasting time

**This Week Overview:**
- 7-day bar chart of fast durations
- Color coding:
  - Green: Goal met
  - Orange: Partial (didn't meet goal)
  - Gray: No fast
- Tap bar for day details

**Monthly Calendar:**
- Green dot: Successful fast
- Yellow dot: Partial fast
- Empty: No fast
- Pulsing red: Active fast
- Tap day to see all fasts on that date

**History List:**
- Most recent first, scrollable
- Each entry shows:
  - Date & time started
  - Duration (e.g., "16h 23m")
  - Goal preset name
  - Status badge: "✓ Goal Met" or "Partial"
- Tap to expand: start/end timestamps, notes
- Infinite scroll/pagination

### 4. Smart Notifications

**During Active Fast (Local + Telegram):**
- "2 hours left until your goal! Hang in there! 💪"
- "1 hour left! You're almost there! 🔥"
- "30 minutes left! Stay strong! ⏰"
- "Goal reached! You did it! ✅"

**Reminder to Start Fasting:**
- User sets preferred start time (e.g., "8:00 PM")
- 30 mins before: "You should start fasting in 30 minutes ⏰"
- At time: "Time to start your fast! Ready? 🌙"
- Only sent if not currently fasting

**Notification Settings:**
- Toggle: "Enable fasting notifications"
- Toggle: "Send to Telegram"
- Milestone alerts: Choose which (2h, 1h, 30m, goal)
- Daily reminder: Time picker for start time
- Motivational style: Tone selection (encouraging, neutral, intense)

## Technical Architecture

### Frontend Structure

```
frontend/src/
├── pages/
│   └── Fasting.tsx              # Main fasting tab page
├── components/
│   └── Fasting/
│       ├── TimerButton.tsx      # Big red/green circular button
│       ├── PresetSelector.tsx   # Horizontal preset chips
│       ├── PresetModal.tsx      # Add/edit preset dialog
│       ├── StopFastModal.tsx    # Confirmation dialog
│       ├── FastingStats.tsx     # Statistics dashboard
│       ├── FastingCalendar.tsx  # Monthly calendar view
│       └── FastingHistory.tsx   # Scrollable history list
├── services/
│   └── fastingService.ts        # Business logic & storage
└── store/
    └── useFastingStore.ts       # Zustand store (or extend useStore)
```

### Backend API Routes

```typescript
// src/routes/fasting.ts
POST   /api/fasting/sessions/start    # Start new fast
POST   /api/fasting/sessions/stop     # End current fast
GET    /api/fasting/sessions/active   # Get active session
GET    /api/fasting/sessions/history  # Get past sessions (paginated)
GET    /api/fasting/stats              # Get dashboard statistics

POST   /api/fasting/presets           # Create preset
GET    /api/fasting/presets           # List presets
PUT    /api/fasting/presets/:id       # Update preset
DELETE /api/fasting/presets/:id       # Delete preset
```

### Database Schema (Prisma)

```prisma
model FastingPreset {
  id              String   @id @default(cuid())
  userId          Int
  user            User     @relation(fields: [userId], references: [id])
  name            String
  durationMinutes Int
  createdAt       DateTime @default(now())

  @@index([userId])
}

model FastingSession {
  id              String    @id @default(cuid())
  userId          Int
  user            User      @relation(fields: [userId], references: [id])
  startTime       DateTime
  endTime         DateTime?
  goalMinutes     Int
  presetName      String
  createdAt       DateTime  @default(now())

  @@index([userId, startTime])
}
```

### Data Models

```typescript
interface FastingPreset {
  id: string;
  name: string;
  durationMinutes: number; // e.g., 960 for 16h
}

interface FastingSession {
  id: string;
  startTime: Date;
  endTime: Date | null; // null if still active
  goalMinutes: number;
  presetName: string;
  goalMet: boolean; // calculated: actualDuration >= goalMinutes
}

interface FastingState {
  activeSession: FastingSession | null;
  presets: FastingPreset[];
  selectedPresetId: string;
  sessions: FastingSession[]; // history
}

interface NotificationSettings {
  enabled: boolean;
  sendToTelegram: boolean;
  milestones: {
    twoHours: boolean;
    oneHour: boolean;
    thirtyMinutes: boolean;
    goalReached: boolean;
  };
  dailyReminderTime: string | null; // e.g., "20:00"
  motivationalStyle: 'encouraging' | 'neutral' | 'intense';
}
```

### Services

**FastingNotificationService.ts**
```typescript
class FastingNotificationService {
  // Schedule milestone notifications when fast starts
  scheduleMilestones(session: FastingSession, settings: NotificationSettings): void

  // Cancel notifications when fast ends early
  cancelMilestones(sessionId: string): void

  // Daily cron job to send start reminders
  scheduleStartReminders(): void

  // Send to both local + Telegram
  async sendNotification(message: string, userId: number): Promise<void>
}
```

**FastingService.ts**
```typescript
class FastingService {
  // Session management
  async startFast(userId: number, presetId: string): Promise<FastingSession>
  async stopFast(userId: number, sessionId: string): Promise<FastingSession>
  async getActiveSession(userId: number): Promise<FastingSession | null>

  // History & stats
  async getHistory(userId: number, page: number, limit: number): Promise<FastingSession[]>
  async getStats(userId: number): Promise<FastingStats>

  // Preset management
  async createPreset(userId: number, preset: Omit<FastingPreset, 'id'>): Promise<FastingPreset>
  async updatePreset(userId: number, id: string, data: Partial<FastingPreset>): Promise<FastingPreset>
  async deletePreset(userId: number, id: string): Promise<void>
  async getPresets(userId: number): Promise<FastingPreset[]>
}
```

## Key Technical Decisions

1. **Timer Accuracy**: Use `setInterval` with drift correction (compare actual elapsed time vs counted time every update)

2. **Persistence**:
   - Start with localStorage for rapid development
   - Easy migration path to backend API later
   - Key: `fasting_state`, `fasting_presets`, `fasting_sessions`

3. **Timezone Handling**:
   - Store all timestamps in UTC
   - Display in user's local timezone

4. **Offline Support**:
   - Queue Telegram messages if offline
   - Send when connection restored

5. **Background Timer**:
   - On mobile, timer continues via stored start timestamp
   - Not dependent on app being open
   - Calculate elapsed time on app resume

6. **Notification Integration**:
   - Reuse existing `TelegramService` from daily tasks
   - Capacitor Local Notifications (already in use)
   - Store notification preferences in user settings

## Implementation Phases

### Phase 1: Core Timer (MVP)
- [ ] Create Fasting page with timer button
- [ ] Implement start/stop with confirmation
- [ ] Timer persistence across app restarts
- [ ] Basic preset management (CRUD)
- [ ] localStorage for all data

### Phase 2: History & Stats
- [ ] Session history list
- [ ] Statistics dashboard
- [ ] Calendar view
- [ ] Success tracking logic

### Phase 3: Notifications
- [ ] Local milestone notifications
- [ ] Telegram integration for milestones
- [ ] Daily start reminders
- [ ] Notification settings UI

### Phase 4: Backend Migration
- [ ] Database schema migration
- [ ] API routes implementation
- [ ] Frontend migration to API calls
- [ ] Data sync from localStorage

### Phase 5: Polish
- [ ] Animations and transitions
- [ ] Empty states
- [ ] Error handling
- [ ] Performance optimization
- [ ] Visual design review

## Success Criteria

- [ ] User can start/stop fasting with single tap
- [ ] Timer persists across app restarts accurately
- [ ] Goal presets are easy to create and manage
- [ ] Statistics provide meaningful insights
- [ ] Notifications are timely and motivational
- [ ] No performance impact on other app features
- [ ] Works offline with data sync when online
- [ ] Passes visual design review checklist

## Edge Cases & Error Handling

1. **App closed during fast**: Calculate elapsed time from stored start timestamp
2. **Phone time changes**: Use server time for calculations (when backend exists)
3. **Notification permissions denied**: Gracefully degrade, show in-app alerts only
4. **Deleting preset during active fast**: Prevent deletion, show error message
5. **Network failure during Telegram send**: Queue message, retry with exponential backoff
6. **Duplicate fast start**: Check for active session, prevent multiple concurrent fasts
7. **Fast longer than 7 days**: Handle display of large hour values (e.g., "168h 23m")

## Future Enhancements (Not in Scope)

- Social features (share achievements)
- Integration with health apps (Apple Health, Google Fit)
- Custom notification message templates
- Fasting insights powered by AI
- Weekly/monthly fasting schedules
- Water intake tracking during fasts
- Export fasting data (CSV, PDF reports)
