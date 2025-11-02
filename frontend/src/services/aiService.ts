import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { WorkoutPlan } from '../types';

// API keys are loaded from environment variables
// See .env.example for how to set up your .env file
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Perplexity API configuration
// Get your API key from: https://www.perplexity.ai/settings/api
const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

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
    const systemPrompt = `You are an expert AI fitness coach. Help users adjust their workout plans.

${context.activePlan ? `Current Active Plan: ${context.activePlan.name}\n${context.activePlan.planDetails}` : ''}

${context.recentSessions && context.recentSessions.length > 0 ? `Recent workout sessions:\n${JSON.stringify(context.recentSessions.slice(0, 3))}` : ''}

CRITICAL RULES FOR WORKOUT MODIFICATIONS:
1. ALWAYS ask clarifying questions BEFORE making changes if the request is vague
2. When providing a modified workout plan:
   - Start with a brief explanation
   - Provide the COMPLETE workout plan starting with 'Day 1'
   - ALWAYS include ALL days (Day 1, Day 2, Day 3, Day 4) with EVERY exercise
   - NEVER use placeholders like '(same as before)'
   - End with: 'The updated plan is ready. Click "Apply Changes" to save it.'
3. Safety guardrails:
   - NEVER increase weights by more than 20% in a single change
   - NEVER recommend exercises not in available equipment`;

    const messages: ClaudeMessage[] = [
      ...(context.chatHistory || []),
      {
        role: 'user',
        content: message,
      },
    ];

    try {
      console.log('🤖 Sending chat request to Claude API...');
      console.log('📝 Message history length:', messages.length);
      console.log('🔑 API key configured:', !!ANTHROPIC_API_KEY);

      if (!ANTHROPIC_API_KEY) {
        throw new Error('VITE_ANTHROPIC_API_KEY not configured in .env file');
      }

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
          system: systemPrompt,
          messages: messages,
        }
      );

      console.log('✅ Chat API Response status:', response.status);
      console.log('📦 Response data preview:', JSON.stringify(response.data).substring(0, 500));

      if (response.status !== 200) {
        console.error('❌ Chat API Error:', response.data);
        const errorMsg = response.data?.error?.message || response.data?.error?.type || 'Unknown API error';
        throw new Error(`Claude API returned ${response.status}: ${errorMsg}`);
      }

      if (!response.data?.content?.[0]?.text) {
        console.error('❌ Invalid response structure:', response.data);
        throw new Error('Invalid response from Claude API - no content returned');
      }

      return response.data.content[0].text;
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

  async searchExerciseInfo(exerciseName: string): Promise<{ content: string; sources: Array<{ title: string; url: string }> }> {
    const prompt = `Provide a concise guide for the exercise "${exerciseName}" including:
1. Proper form and technique (3-4 key points)
2. Common mistakes to avoid (2-3 points)
3. Muscles worked
4. Safety tips
5. Include links to helpful YouTube videos demonstrating proper form

Keep it brief and practical for someone currently working out.`;

    try {
      console.log('Calling Perplexity API for exercise:', exerciseName);

      const response = await makeHttpRequest(
        PERPLEXITY_API_URL,
        {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        },
        {
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a knowledgeable fitness coach providing clear, concise exercise guidance with video references.'
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 1000,
          return_citations: true,
        }
      );

      console.log('Perplexity API Response status:', response.status);

      if (response.status !== 200) {
        console.error('Perplexity API Error:', response.data);
        throw new Error(`API Error: ${response.data.error?.message || 'Unknown error'}`);
      }

      const content = response.data.choices[0].message.content;
      const searchResults = response.data.search_results || [];

      const sources = searchResults.map((result: any) => ({
        title: result.title || 'Source',
        url: result.url || ''
      }));

      console.log('Retrieved sources:', sources);

      return { content, sources };
    } catch (error: any) {
      console.error('Error searching exercise info:', error);
      throw new Error('Failed to get exercise information: ' + (error.message || 'Unknown error'));
    }
  },
};
