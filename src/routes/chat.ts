import express from 'express';
import { ChatService } from '../services/ChatService';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const chatService = new ChatService();
const prisma = new PrismaClient();

// POST /api/chat - Send a message to the AI coach
router.post('/', async (req, res) => {
  try {
    console.log('📨 Chat request received:', {
      userId: req.body.userId,
      messageLength: req.body.message?.length || 0,
      sessionId: req.body.sessionId,
      timestamp: new Date().toISOString()
    });

    const { userId, message, sessionId, chatHistory } = req.body;

    if (!userId || !message) {
      console.error('❌ Missing required fields:', { userId, hasMessage: !!message });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId and message are required',
      });
    }

    console.log('💬 Chat history length:', chatHistory?.length || 0);

    // Get user's active plan
    let activePlan = null;
    try {
      console.log('🔍 Fetching active plan for userId:', userId);
      activePlan = await prisma.workoutPlan.findFirst({
        where: {
          userId: BigInt(userId),
          isActive: true,
          isArchived: false,
        },
      });
      console.log('📋 Active plan found:', activePlan ? activePlan.name : 'none');
    } catch (error) {
      console.error('❌ Could not fetch active plan:', error);
    }

    // Get recent sessions
    let recentSessions: any[] = [];
    try {
      console.log('🔍 Fetching recent sessions for userId:', userId);
      recentSessions = await prisma.workoutSession.findMany({
        where: {
          userId: BigInt(userId),
        },
        orderBy: {
          sessionDate: 'desc',
        },
        take: 3,
      });
      console.log('📊 Recent sessions found:', recentSessions.length);
    } catch (error) {
      console.error('❌ Could not fetch recent sessions:', error);
    }

    // Chat history is now sent from the frontend with each request
    // Default to empty array if not provided
    const conversationHistory = chatHistory || [];

    console.log('🤖 Calling AI service...');
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
      chatHistory: conversationHistory,
    });

    console.log('✅ Chat response received, length:', response.length);

    return res.json({
      success: true,
      message: response,
      sessionId: sessionId || 'session-' + Date.now(),
    });
  } catch (error: any) {
    console.error('❌ Error in chat endpoint:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      status: error.status,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat request',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
