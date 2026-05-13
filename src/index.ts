// Side-effect import: validates and freezes env BEFORE anything else loads.
// Must come first so passport, services, etc. all see the validated config.
import { env, isDev, isProd } from './config/env';
import express from 'express';
import cors from 'cors';
import passport from './config/passport';
import cookieParser from 'cookie-parser';
import { TelegramSchedulerService } from './services/TelegramSchedulerService';

// Routes
import healthRoutes from './routes/health';
import dailyTaskRoutes from './routes/daily-tasks';
import migrationRoutes from './routes/migration';
import authRoutes from './routes/auth';
import workoutPlanRoutes from './routes/workout-plans';
import workoutSessionRoutes from './routes/workout-sessions';
import workoutRoutes from './routes/workouts';
import telegramConfigRoutes from './routes/telegram-config';
import userRoutes from './routes/users';
import chatRoutes from './routes/chat';
import youtubeRoutes from './routes/youtube';
import fastingRoutes from './routes/fasting';
import equipmentRoutes from './routes/equipment';

// Global BigInt serialization fix for JSON
(BigInt.prototype as any).toJSON = function() {
  return Number(this);
};

const app = express();
const port = env.PORT;

// Middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Health check endpoint
app.use('/api/health', healthRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// API routes
app.use('/api/chat', chatRoutes);
app.use('/api/daily-tasks', dailyTaskRoutes);
app.use('/api/fasting', fastingRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/plans', workoutPlanRoutes);
app.use('/api/sessions', workoutSessionRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/telegram-config', telegramConfigRoutes);
app.use('/api/users', userRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/equipment', equipmentRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: isDev ? err.message : undefined,
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not found',
    details: `Route ${req.originalUrl} not found`,
  });
});

// Start server for local development
if (!isProd) {
  const server = app.listen(port, () => {
    console.log(`🚀 Workout Backend Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);

    // Start the Telegram scheduler
    if (env.NODE_ENV !== 'test') {
      const scheduler = new TelegramSchedulerService();
      scheduler.startScheduler();
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
}

// Export for Vercel serverless deployment
export default app;