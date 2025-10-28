# Backend Migration Guide

## 🎯 Overview

Your backend has been completely reworked to:
- ✅ Remove unnecessary LLM/chat code (frontend handles AI directly)
- ✅ Add Daily Tasks API with database persistence
- ✅ Add automated Telegram scheduled reminders
- ✅ Add migration endpoint to import your phone's localStorage data
- ✅ Simplified architecture focusing on what you actually use

## 🏗️ What Was Built

### New Entities
1. **DailyTask** - Stores your daily tasks with completion status
2. **TelegramConfig** - Stores user Telegram settings (bot token, chat ID, start hour)
3. **WorkoutPlan** (updated) - Added `telegramPreviewHour` field
4. **WorkoutSession** (simplified) - Matches frontend structure

### New APIs

#### Daily Tasks (`/api/daily-tasks`)
- `GET /user/{userId}` - Get all tasks (auto-resets at midnight)
- `GET /user/{userId}/incomplete` - Get incomplete tasks only
- `POST /user/{userId}` - Create new task
- `PUT /{taskId}/toggle` - Toggle completion
- `DELETE /{taskId}` - Delete task
- `POST /user/{userId}/reset` - Manually reset all tasks

#### Migration (`/api/migration`)
- `POST /save` - Import all localStorage data (tasks, plans, sessions, telegram config)

#### Health Check (`/api`)
- `GET /health` - Check if backend is running

### Scheduled Services

#### 1. Task Reminders (Hourly)
```java
@Scheduled(cron = "0 0 * * * *") // Every hour
```
- Checks incomplete tasks for each user
- Sends Telegram messages based on schedule:
  - 9am (or user's start hour): First reminder
  - Then every 2 hours (9, 11, 13)
  - Then every 1 hour (14, 15, 16, 17, 18, 19, 20)
- Messages have increasing pressure:
  - **Morning (< 12pm)**: 💪 Gentle encouragement
  - **Afternoon (12-3pm)**: ⚡ Moderate urgency
  - **Evening (3-6pm)**: 🔥 Urgent tone
  - **Night (6pm+)**: 🚨 Critical/maximum pressure
- Only sends if > 55 minutes since last reminder

#### 2. Workout Previews (Hourly)
```java
@Scheduled(cron = "0 0 * * * *") // Every hour
```
- Checks active workout plans with `telegramPreviewHour` set
- Sends workout details at scheduled time
- Format: Plan name, day, exercise list

#### 3. Midnight Task Reset (Daily)
```java
@Scheduled(cron = "0 0 0 * * *") // Every day at midnight
```
- Unchecks all tasks for all users
- Prepares tasks for the new day
- Tasks are NOT deleted, just reset to incomplete

## 📦 Migration Steps

### Step 1: Start the Backend

```bash
cd backend
mvn spring-boot:run
```

Backend runs on: `http://localhost:8080`

### Step 2: Verify Backend is Running

Open browser: http://localhost:8080/api/health

Should see:
```json
{
  "status": "UP",
  "service": "Workout Tracker Backend",
  "version": "2.0.0"
}
```

### Step 3: Run Migration from Phone

1. Make sure your phone and computer are on the same WiFi
2. Get your computer's local IP address:
   ```bash
   # On Mac
   ipconfig getifaddr en0

   # On Windows
   ipconfig | findstr IPv4
   ```

3. Open the app on your phone
4. Navigate to `/migration` page
5. Update `API_BASE_URL` in `Migration.tsx` to your computer's IP:
   ```typescript
   const API_BASE_URL = 'http://YOUR_COMPUTER_IP:8080/api';
   ```
6. Click "Start Migration"
7. Your data will be imported to the backend!

### Step 4: Configure Telegram in Backend

The migration will automatically import your Telegram config. The backend will start sending scheduled reminders immediately.

## 🔧 Configuration

### API Keys

Create `backend/src/main/resources/application-local.properties`:

```properties
llm.anthropic.api.key=your_key_here
llm.openai.api.key=your_key_here
```

(Only needed if you add AI features to backend later)

### Database

- **Development**: H2 file database (`workout.db`)
- **Console**: http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:file:./workout.db`
  - Username: `sa`
  - Password: (empty)

### Telegram Settings

Stored per user in `telegram_config` table:
- `bot_token` - Your Telegram bot token
- `chat_id` - Your Telegram chat ID
- `daily_tasks_start_hour` - When to start sending reminders (default: 9)
- `last_task_reminder_sent` - Tracks cooldown

## 📊 Data Structure

### Daily Tasks
```json
{
  "id": 1,
  "userId": 123,
  "title": "Drink 8 glasses of water",
  "completed": false,
  "createdAt": "2025-10-28T10:00:00"
}
```

### Workout Plans
```json
{
  "id": 1,
  "userId": 123,
  "name": "Hypertrophy Max",
  "planDetails": "Day 1: Push\n- Bench Press...",
  "isActive": true,
  "isArchived": false,
  "completedWorkouts": [1, 2, 3],
  "telegramPreviewHour": 8
}
```

## 🧪 Testing

### Test Task Reminder Scheduling

```bash
# Create a task
curl -X POST http://localhost:8080/api/daily-tasks/user/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task"}'

# Wait for the next hour - check backend logs for:
# "Checking for task reminders to send..."
# "Sent task reminder to user 1 with 1 tasks"
```

### Test Migration

```bash
curl -X POST http://localhost:8080/api/migration/save \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "tasks": [{"id": 1, "title": "Test", "completed": false, "createdAt": "2025-10-28T10:00:00"}],
    "workoutPlans": [],
    "workoutSessions": [],
    "telegramConfig": {"botToken": "your_token", "chatId": "your_chat_id", "startHour": 9}
  }'
```

## 🚀 Next Steps

1. **Start Backend**: `cd backend && mvn spring-boot:run`
2. **Update Frontend**: Change `api.ts` to use backend API instead of localStorage
3. **Run Migration**: Transfer your phone data to backend
4. **Enjoy Automated Reminders**: Backend will send Telegram messages automatically!

## 📝 Notes

- Backend persists data in `workout.db` file
- Scheduled jobs run automatically when backend is running
- Logs show scheduling activity (check console)
- Frontend migration page helps transfer localStorage data
- No data is lost - migration is safe and non-destructive

## 🐛 Troubleshooting

**Backend won't start:**
- Check Java version: `java -version` (need 17+)
- Check if port 8080 is available

**No Telegram messages:**
- Check bot token and chat ID are correct
- Verify incomplete tasks exist
- Check backend logs for scheduling activity
- Ensure current hour is in reminder schedule

**Migration fails:**
- Verify backend is running on correct IP/port
- Check CORS is enabled (should be by default)
- Look at browser console for errors
- Check backend logs for migration errors

## 📚 Architecture

```
Frontend (React/Ionic)
  ↓ HTTP Requests
Backend (Spring Boot)
  ↓
Database (H2)

Scheduled Jobs (Background)
  → Check tasks every hour
  → Send Telegram messages
  → Reset tasks at midnight
```

Your backend is now lean, focused, and does exactly what you need! 🎉
