import { Router, Request, Response } from 'express';
import prisma from '../lib/database';

const router = Router();

// GET /api/telegram-config/user/:userId
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.params.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const userId = BigInt(req.params.userId);

    const config = await prisma.telegramConfig.findUnique({
      where: { userId }
    });

    if (!config) {
      return res.json({ botToken: null, chatId: null });
    }

    return res.json({
      botToken: config.botToken,
      chatId: config.chatId,
      dailyTasksStartHour: config.dailyTasksStartHour
    });
  } catch (error) {
    console.error('Error getting telegram config:', error);
    return res.status(500).json({ error: 'Failed to get telegram config' });
  }
});

// POST /api/telegram-config/user/:userId
router.post('/user/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.params.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const userId = BigInt(req.params.userId);
    const { botToken, chatId, dailyTasksStartHour } = req.body;

    const config = await prisma.telegramConfig.upsert({
      where: { userId },
      create: {
        userId,
        botToken,
        chatId,
        dailyTasksStartHour: dailyTasksStartHour || 9
      },
      update: {
        botToken,
        chatId,
        dailyTasksStartHour: dailyTasksStartHour || 9
      }
    });

    return res.json({
      botToken: config.botToken,
      chatId: config.chatId,
      dailyTasksStartHour: config.dailyTasksStartHour
    });
  } catch (error) {
    console.error('Error saving telegram config:', error);
    return res.status(500).json({ error: 'Failed to save telegram config' });
  }
});

export default router;
