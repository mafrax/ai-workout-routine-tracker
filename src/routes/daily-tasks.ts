import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DailyTaskService } from '../services/DailyTaskService';
import { DailyTaskDto, CreateDailyTaskRequest, ApiResponse } from '../types';

const router = Router();
const dailyTaskService = new DailyTaskService();

const createTaskSchema = z.object({
  title: z.string().min(1).max(255)
});

const userIdSchema = z.string().transform((val) => BigInt(val));
const taskIdSchema = z.string().transform((val) => BigInt(val));

// Helper to convert BigInt fields to JSON-safe format
const serializeTask = (task: any): DailyTaskDto => ({
  id: Number(task.id),
  userId: Number(task.userId),
  title: String(task.title),
  completed: Boolean(task.completed),
  createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : String(task.createdAt),
  completedAt: task.completedAt ? (task.completedAt instanceof Date ? task.completedAt.toISOString() : String(task.completedAt)) : null,
  currentStreak: task.currentStreak || 0,
  bestStreak: task.bestStreak || 0,
  totalCompletions: task.totalCompletions || 0,
  lastCompletedDate: task.lastCompletedDate || null
});

// GET /api/daily-tasks/user/:userId
router.get('/user/:userId', async (req: Request, res: Response<DailyTaskDto[]>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    
    // Check and reset if needed
    await dailyTaskService.checkAndResetTasksIfNeeded(userId);
    
    const tasks = await dailyTaskService.getUserTasks(userId);
    const taskDtos = tasks.map(serializeTask);

    return res.json(taskDtos);
  } catch (error) {
    console.error('Error getting user tasks:', error);
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// GET /api/daily-tasks/user/:userId/incomplete
router.get('/user/:userId/incomplete', async (req: Request, res: Response<DailyTaskDto[]>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const tasks = await dailyTaskService.getIncompleteTasks(userId);
    const taskDtos = tasks.map(serializeTask);

    return res.json(taskDtos);
  } catch (error) {
    console.error('Error getting incomplete tasks:', error);
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// POST /api/daily-tasks/user/:userId
router.post('/user/:userId', async (req: Request, res: Response<DailyTaskDto>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const { title } = createTaskSchema.parse(req.body);
    
    const task = await dailyTaskService.createTask(userId, title);
    const taskDto = serializeTask(task);

    return res.json(taskDto);
  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data' } as any);
    } else {
      return res.status(500).json({ error: 'Internal server error' } as any);
    }
  }
});

// PUT /api/daily-tasks/:taskId/toggle
router.put('/:taskId/toggle', async (req: Request, res: Response<DailyTaskDto>) => {
  try {
    const taskId = taskIdSchema.parse(req.params.taskId);
    const task = await dailyTaskService.toggleTask(taskId);
    const taskDto = serializeTask(task);

    return res.json(taskDto);
  } catch (error) {
    console.error('Error toggling task:', error);
    return res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// DELETE /api/daily-tasks/:taskId
router.delete('/:taskId', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const taskId = taskIdSchema.parse(req.params.taskId);
    await dailyTaskService.deleteTask(taskId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/daily-tasks/user/:userId/reset
router.post('/user/:userId/reset', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    await dailyTaskService.resetAllTasks(userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error resetting tasks:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/daily-tasks/user/:userId/stats - Get aggregate stats
router.get('/user/:userId/stats', async (req: Request, res: Response) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const stats = await dailyTaskService.calculateAggregateStats(userId);

    res.json(stats);
  } catch (error) {
    console.error('Error getting aggregate stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/daily-tasks/:taskId/stats - Get per-task stats
router.get('/:taskId/stats', async (req: Request, res: Response) => {
  try {
    const taskId = taskIdSchema.parse(req.params.taskId);
    const stats = await dailyTaskService.calculateTaskStats(taskId);

    res.json(stats);
  } catch (error) {
    console.error('Error getting task stats:', error);
    if (error instanceof Error && error.message === 'Task not found') {
      res.status(404).json({ error: 'Task not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/daily-tasks/user/:userId/history - Get completion history
router.get('/user/:userId/history', async (req: Request, res: Response) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const history = await dailyTaskService.getCompletionHistory(userId, days);

    // Serialize the response
    const serializedHistory = history.map(record => ({
      id: Number(record.id),
      userId: Number(record.userId),
      recordDate: record.recordDate,
      tasksTotal: record.tasksTotal,
      tasksCompleted: record.tasksCompleted,
      completionRate: record.completionRate,
      createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt)
    }));

    res.json(serializedHistory);
  } catch (error) {
    console.error('Error getting completion history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;