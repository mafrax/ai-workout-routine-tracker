import express from 'express';
import { ChatService } from '../services/ChatService';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const chatService = new ChatService();
const prisma = new PrismaClient();

// POST /api/chat - Send a message to the AI coach
router.post('/', async (req, res) => {
  try {
    const { userId, message, sessionId } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId and message are required',
      });
    }

    // Get user's active plan
    let activePlan = null;
    try {
      activePlan = await prisma.workoutPlan.findFirst({
        where: {
          userId: BigInt(userId),
          isActive: true,
          isArchived: false,
        },
      });
    } catch (error) {
      console.log('Could not fetch active plan:', error);
    }

    // Get recent sessions
    let recentSessions: any[] = [];
    try {
      recentSessions = await prisma.workoutSession.findMany({
        where: {
          userId: BigInt(userId),
        },
        orderBy: {
          sessionDate: 'desc',
        },
        take: 3,
      });
    } catch (error) {
      console.log('Could not fetch recent sessions:', error);
    }

    // For now, we don't persist chat history in the backend
    // The frontend manages chat history in localStorage
    const chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Call the AI service
    const response = await chatService.chat(message, {
      activePlan: activePlan ? {
        name: activePlan.name,
        planDetails: activePlan.planDetails,
      } : undefined,
      recentSessions: recentSessions.map(s => ({
        date: s.sessionDate,
        duration: s.durationMinutes,
        exercises: s.exercises,
      })),
      chatHistory,
    });

    return res.json({
      success: true,
      message: response,
      sessionId: sessionId || 'session-' + Date.now(),
    });
  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat request',
    });
  }
});

export default router;
