import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { WorkoutPlan } from '../types';

// API keys are loaded from environment variables
// See .env.example for how to set up your .env file
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// API Base URL for backend services
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://workout-marcs-projects-3a713b55.vercel.app/api';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Helper function to make HTTP requests (works in both web and native)
async function makeHttpRequest(url: string, headers: Record<string, string>, data: any): Promise<any> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // Use CapacitorHttp for native platforms
    const response: HttpResponse = await CapacitorHttp.post({
      url,
      headers,
      data,
    });
    return { status: response.status, data: response.data };
  } else {
    // Use fetch for web
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    return { status: response.status, data: responseData };
  }
}

export const aiService = {
  async generateWorkoutPlans(userProfile: any): Promise<string[]> {
    const prompt = `You are an expert personal trainer. Create 3 different workout plans for a user with the following profile:

Age: ${userProfile.age}
Gender: ${userProfile.gender}
Fitness Level: ${userProfile.fitnessLevel}
Goals: ${userProfile.goals.join(', ')}
Days per week: ${userProfile.daysPerWeek}
Available Equipment: ${userProfile.availableEquipment.join(', ')}
${userProfile.injuries ? `Injuries/Limitations: ${userProfile.injuries}` : ''}

For each plan, provide:
1. A catchy plan name
2. Brief description (2-3 sentences)
3. Full 4-day workout breakdown with exercises, sets, reps, and weights

Format each day as:
Day 1: [Focus]
1. Exercise Name - SetsxReps @ Weight | Rest between sets | Rest before next
Example: Chest Press - 4x10 @ 50-60kg | 60s | 90s

Provide 3 complete plans separated by "---PLAN---"`;

    try {
      console.log('Making API call to:', ANTHROPIC_API_URL);
      console.log('API key exists:', !!ANTHROPIC_API_KEY);
      console.log('Platform:', Capacitor.getPlatform());

      const response = await makeHttpRequest(
        ANTHROPIC_API_URL,
        {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        {
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 8000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }
      );

      console.log('API Response status:', response.status);
      console.log('API Response data:', JSON.stringify(response.data).substring(0, 500));

      if (response.status !== 200) {
        console.error('API Error:', response.data);
        throw new Error(`API Error: ${response.data.error?.message || 'Unknown error'}`);
      }

      const content = response.data.content[0].text;

      // Split into 3 plans
      const plans = content.split('---PLAN---').filter((p: string) => p.trim());
      return plans.slice(0, 3);
    } catch (error: any) {
      console.error('Error generating workout plans:', error.message || error);
      console.error('Full error:', JSON.stringify(error));
      throw new Error('Failed to generate workout plans: ' + (error.message || 'Unknown error'));
    }
  },

  async chat(message: string, context: {
    activePlan?: WorkoutPlan;
    recentSessions?: any[];
    chatHistory?: ClaudeMessage[];
  }): Promise<string> {
    try {
      console.log('🤖 Sending chat request to backend...');
      console.log('📝 Message history length:', context.chatHistory?.length || 0);

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 1, // TODO: Get from auth context
          message: message,
          sessionId: 'session-' + Date.now(),
        }),
      });

      console.log('✅ Chat API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Chat API Error:', errorData);
        throw new Error(errorData.error || `Backend returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.message) {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Invalid response from backend - no message returned');
      }

      return data.message;
    } catch (error: any) {
      console.error('❌ Error in AI chat:', error.message || error);
      console.error('📋 Full chat error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: error.response
      });

      // Provide more specific error messages
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        throw new Error('Network error: Unable to reach Claude API. Check your internet connection.');
      } else if (error.message?.includes('401') || error.message?.includes('authentication')) {
        throw new Error('Authentication error: Invalid API key. Please check your VITE_ANTHROPIC_API_KEY.');
      } else if (error.message?.includes('429')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else {
        throw new Error(error.message || 'Failed to get response from AI coach');
      }
    }
  },

  async searchExerciseVideos(exerciseName: string): Promise<Array<{ id: string; title: string; description: string; thumbnailUrl: string; embedUrl: string }>> {
    try {
      console.log('🎥 Searching YouTube for exercise videos:', exerciseName);

      const response = await fetch(`${API_BASE_URL}/youtube/search-exercise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseName,
          maxResults: 3,
        }),
      });

      console.log('✅ YouTube API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ YouTube API Error:', errorData);
        throw new Error(errorData.error || `Backend returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.videos) {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Invalid response from backend - no videos returned');
      }

      console.log(`📹 Retrieved ${data.videos.length} videos for ${exerciseName}`);

      return data.videos;
    } catch (error: any) {
      console.error('❌ Error searching YouTube videos:', error);
      throw new Error('Failed to load exercise videos: ' + (error.message || 'Unknown error'));
    }
  },
};
