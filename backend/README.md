# Workout Tracker Backend

Spring Boot backend with scheduled Telegram reminders for daily tasks and workout previews.

## Features

- ✅ Daily Tasks CRUD API
- ✅ Workout Plans & Sessions API
- ⏰ Scheduled Telegram Reminders (hourly task reminders)
- 📅 Midnight automatic task reset
- 💬 Workout preview messages at scheduled times
- 🔄 Migration endpoint to import localStorage data

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- Your API keys (Anthropic, OpenAI)

## Setup

1. **Configure API Keys**

Create `src/main/resources/application-local.properties`:

```properties
llm.anthropic.api.key=your_anthropic_key_here
llm.openai.api.key=your_openai_key_here
```

2. **Build the project**

```bash
mvn clean install
```

3. **Run the backend**

```bash
mvn spring-boot:run
```

The server will start on `http://localhost:8080`

## API Endpoints

### Health Check
- `GET /api/health` - Check if backend is running

### Daily Tasks
- `GET /api/daily-tasks/user/{userId}` - Get all user tasks
- `GET /api/daily-tasks/user/{userId}/incomplete` - Get incomplete tasks
- `POST /api/daily-tasks/user/{userId}` - Create new task
- `PUT /api/daily-tasks/{taskId}/toggle` - Toggle task completion
- `DELETE /api/daily-tasks/{taskId}` - Delete task
- `POST /api/daily-tasks/user/{userId}/reset` - Reset all tasks

### Migration
- `POST /api/migration/save` - Migrate localStorage data to backend

### Workout Plans
- `GET /api/plans/user/{userId}` - Get user's workout plans
- `POST /api/plans` - Create new plan
- `PUT /api/plans/{planId}` - Update plan
- `DELETE /api/plans/{planId}` - Delete plan

### Workout Sessions
- `GET /api/sessions/user/{userId}` - Get user's workout sessions
- `POST /api/sessions` - Create new session

## Scheduled Jobs

### Task Reminders
- **Runs**: Every hour (on the hour)
- **Action**: Sends Telegram reminders for incomplete tasks
- **Schedule**: Based on user's start hour (default 9am) with increasing frequency

### Workout Previews
- **Runs**: Every hour (on the hour)
- **Action**: Sends workout preview if plan has scheduled telegram time
- **Condition**: Only for active, non-archived plans

### Midnight Reset
- **Runs**: Every day at midnight
- **Action**: Resets all daily tasks (sets completed=false)

## Database

Using H2 file-based database (`workout.db`) for development. Data persists between restarts.

To view database console:
- URL: http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:file:./workout.db`
- Username: `sa`
- Password: (empty)

## Migration from Local Storage

1. Make sure backend is running
2. Go to `/migration` page in the frontend
3. Click "Start Migration"
4. Your local data will be imported to the backend

## Testing

Test the backend is running:
```bash
curl http://localhost:8080/api/health
```

Expected response:
```json
{
  "status": "UP",
  "service": "Workout Tracker Backend",
  "version": "2.0.0",
  "timestamp": 1234567890
}
```

## Logs

Scheduling logs are enabled. Check console for:
- `Checking for task reminders to send...`
- `Sent task reminder to user X with Y tasks`
- `Checking for workout previews to send...`
- `Resetting all daily tasks at midnight...`
