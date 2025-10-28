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

// GET /api/daily-tasks/user/:userId
router.get('/user/:userId', async (req: Request, res: Response<DailyTaskDto[]>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    
    // Check and reset if needed
    await dailyTaskService.checkAndResetTasksIfNeeded(userId);
    
    const tasks = await dailyTaskService.getUserTasks(userId);
    const taskDtos = tasks.map(task => ({
      id: task.id,
      userId: task.userId,
      title: task.title,
      completed: task.completed,
      createdAt: task.createdAt
    }));
    
    res.json(taskDtos);
  } catch (error) {
    console.error('Error getting user tasks:', error);
    res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// GET /api/daily-tasks/user/:userId/incomplete
router.get('/user/:userId/incomplete', async (req: Request, res: Response<DailyTaskDto[]>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const tasks = await dailyTaskService.getIncompleteTasks(userId);
    
    const taskDtos = tasks.map(task => ({
      id: task.id,
      userId: task.userId,
      title: task.title,
      completed: task.completed,
      createdAt: task.createdAt
    }));
    
    res.json(taskDtos);
  } catch (error) {
    console.error('Error getting incomplete tasks:', error);
    res.status(500).json({ error: 'Internal server error' } as any);
  }
});

// POST /api/daily-tasks/user/:userId
router.post('/user/:userId', async (req: Request, res: Response<DailyTaskDto>) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const { title } = createTaskSchema.parse(req.body);
    
    const task = await dailyTaskService.createTask(userId, title);
    
    const taskDto: DailyTaskDto = {
      id: task.id,
      userId: task.userId,
      title: task.title,
      completed: task.completed,
      createdAt: task.createdAt
    };
    
    res.json(taskDto);
  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data' } as any);
    } else {
      res.status(500).json({ error: 'Internal server error' } as any);
    }
  }
});

// PUT /api/daily-tasks/:taskId/toggle
router.put('/:taskId/toggle', async (req: Request, res: Response<DailyTaskDto>) => {
  try {
    const taskId = taskIdSchema.parse(req.params.taskId);
    const task = await dailyTaskService.toggleTask(taskId);
    
    const taskDto: DailyTaskDto = {
      id: task.id,
      userId: task.userId,
      title: task.title,
      completed: task.completed,
      createdAt: task.createdAt
    };
    
    res.json(taskDto);
  } catch (error) {
    console.error('Error toggling task:', error);
    res.status(500).json({ error: 'Internal server error' } as any);
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

export default router;