# AI-Powered Workout App

An intelligent workout application that integrates with Claude AI or ChatGPT to create personalized workout plans and track user progress.

## 🏗️ Architecture

### Backend (Spring Boot + Java)
- **Database**: H2 (development), PostgreSQL (production-ready)
- **LLM Integration**: Claude AI (Anthropic) and ChatGPT (OpenAI)
- **API**: RESTful endpoints for chat, workouts, and progress tracking

### Frontend (React + Ionic)
- **Framework**: React with TypeScript
- **Mobile**: Ionic for cross-platform mobile support
- **State Management**: Zustand
- **API Client**: Axios

## 📁 Project Structure

```
workout/
├── backend/                    # Spring Boot backend
│   ├── src/main/java/com/workout/app/
│   │   ├── entity/            # JPA entities (User, WorkoutPlan, WorkoutSession, etc.)
│   │   ├── repository/        # Spring Data repositories
│   │   ├── service/           # Business logic & LLM integration
│   │   ├── controller/        # REST API controllers
│   │   ├── dto/               # Data Transfer Objects
│   │   └── config/            # Configuration classes
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml
│
└── frontend/                   # React + Ionic frontend
    ├── src/
    │   ├── components/
    │   │   ├── Chat/          # AI chat interface
    │   │   ├── Workout/       # Workout logging
    │   │   └── Progress/      # Progress tracking
    │   ├── services/          # API client
    │   ├── store/             # Zustand state management
    │   ├── types/             # TypeScript interfaces
    │   └── pages/             # Main pages
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- Maven
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Configure your API keys in `application.properties`:
```properties
# For Claude AI
llm.anthropic.api.key=your-anthropic-api-key

# For ChatGPT (optional)
llm.openai.api.key=your-openai-api-key
```

Or set them as environment variables:
```bash
export ANTHROPIC_API_KEY=your-key-here
export OPENAI_API_KEY=your-key-here
```

3. Build and run:
```bash
mvn clean install
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:8100`

## 🔑 Key Features

### 1. **AI-Powered Coaching**
- Chat with Claude AI or ChatGPT
- Get personalized workout plans based on:
  - Available equipment
  - Fitness level
  - Goals
  - Past progress

### 2. **Progress Tracking**
- The LLM remembers your workout history
- Automatically adjusts difficulty based on:
  - Completion rates
  - Difficulty ratings
  - Workout frequency
  - Performance trends

### 3. **Workout Logging**
- Log exercises, sets, reps
- Rate workout difficulty
- Track completion rate
- Add notes

### 4. **Progress Analytics**
- Total sessions & training time
- Average completion rate
- Difficulty trends
- Performance insights

## 🧠 How It Works

### Memory & Context Management

The app uses a sophisticated context injection system:

1. **User Profile**: Stores equipment, fitness level, goals
2. **Conversation History**: Maintains chat context in database
3. **Progress Summary**: Calculates metrics from workout sessions
4. **Context Injection**: Before each LLM call, builds a context containing:
   - User profile
   - Recent workout history
   - Performance trends
   - Current fitness level

This allows the LLM to:
- Remember previous conversations
- Adapt recommendations based on progress
- Increase difficulty when workouts become too easy
- Reduce difficulty if completion rates drop

## 🔌 API Endpoints

### Chat
- `POST /api/chat` - Send message to AI coach

### Users
- `GET /api/users` - Get all users
- `GET /api/users/{id}` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user

### Workout Plans
- `GET /api/plans/user/{userId}` - Get user's plans
- `GET /api/plans/user/{userId}/active` - Get active plan
- `POST /api/plans` - Create plan
- `PUT /api/plans/{id}/activate` - Activate plan

### Workout Sessions
- `GET /api/sessions/user/{userId}` - Get user's sessions
- `POST /api/sessions` - Log workout session
- `GET /api/sessions/user/{userId}/progress` - Get progress summary

## 📱 Mobile Deployment

To build for mobile:

### iOS
```bash
cd frontend
ionic capacitor add ios
ionic capacitor build ios
ionic capacitor open ios
```

### Android
```bash
cd frontend
ionic capacitor add android
ionic capacitor build android
ionic capacitor open android
```

## 🛠️ Development

### Database
- Development uses H2 in-memory database
- Access H2 console: `http://localhost:8080/h2-console`
- For production, switch to PostgreSQL in `application.properties`

### CORS
- Configured for `http://localhost:8100` and `http://localhost:3000`
- Update `cors.allowed.origins` in `application.properties` for production

## 🎯 Next Steps

1. **Add authentication** (JWT, OAuth)
2. **Implement workout plan persistence** (save LLM-generated plans)
3. **Add workout templates** (quick-start options)
4. **Exercise library** (with videos/images)
5. **Social features** (share workouts, challenges)
6. **Push notifications** (workout reminders)
7. **Advanced analytics** (charts, graphs)

## 📄 License

MIT License
