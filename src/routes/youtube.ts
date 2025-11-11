import express, { Request, Response } from 'express';
import { youtubeService } from '../services/YouTubeService';

const router = express.Router();

/**
 * POST /api/youtube/search-exercise
 * Search for exercise demonstration videos
 *
 * Body: { exerciseName: string, maxResults?: number }
 */
router.post('/search-exercise', async (req: Request, res: Response) => {
  try {
    const { exerciseName, maxResults = 3 } = req.body;

    if (!exerciseName || typeof exerciseName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Exercise name is required and must be a string',
      });
    }

    console.log(`📹 Searching YouTube for exercise: ${exerciseName}`);

    // Check if YouTube service is configured
    if (!youtubeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'YouTube API is not configured. Please add YOUTUBE_API_KEY to environment variables.',
      });
    }

    const videos = await youtubeService.searchExerciseVideos(exerciseName, maxResults);

    console.log(`✅ Found ${videos.length} videos for ${exerciseName}`);

    return res.status(200).json({
      success: true,
      videos,
      count: videos.length,
    });
  } catch (error: any) {
    console.error('❌ Error in YouTube search endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search for exercise videos',
      message: error.message,
    });
  }
});

/**
 * GET /api/youtube/health
 * Check if YouTube API is configured
 */
router.get('/health', (req: Request, res: Response) => {
  const isConfigured = youtubeService.isConfigured();
  return res.status(200).json({
    success: true,
    configured: isConfigured,
    message: isConfigured
      ? 'YouTube API is configured'
      : 'YouTube API key not found in environment variables',
  });
});

export default router;
