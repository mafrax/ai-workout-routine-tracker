import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TelegramSchedulerService } from './services/TelegramSchedulerService';

// Routes
import healthRoutes from './routes/health';
import dailyTaskRoutes from './routes/daily-tasks';
import migrationRoutes from './routes/migration';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/daily-tasks', dailyTaskRoutes);
app.use('/api/migration', migrationRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`🚀 Workout Backend Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start the Telegram scheduler
  if (process.env.NODE_ENV !== 'test') {
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

export default app;