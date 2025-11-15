import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatContext {
  activePlan?: any;
  recentSessions?: any[];
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class ChatService {
  async chat(message: string, context: ChatContext): Promise<string> {
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

    const messages: Anthropic.MessageParam[] = [
      ...(context.chatHistory || []).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    try {
      console.log('🤖 Sending chat request to Claude API...');
      console.log('📝 Message history length:', messages.length);
      console.log('🔑 API Key present:', !!process.env.ANTHROPIC_API_KEY);
      console.log('🔑 API Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...');

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        messages: messages,
      });

      console.log('✅ Chat API Response received');
      console.log('📊 Response content blocks:', response.content?.length || 0);

      if (!response.content?.[0]) {
        console.error('❌ Invalid response structure:', JSON.stringify(response, null, 2));
        throw new Error('Invalid response from Claude API - no content returned');
      }

      const content = response.content[0];
      if (content.type !== 'text') {
        console.error('❌ Unexpected content type:', content.type);
        throw new Error('Unexpected content type from Claude API');
      }

      console.log('✅ Returning text response, length:', content.text.length);
      return content.text;
    } catch (error: any) {
      console.error('❌ Error in AI chat:', {
        message: error.message,
        status: error.status,
        type: error.type,
        name: error.name,
        hasApiKey: !!process.env.ANTHROPIC_API_KEY,
        timestamp: new Date().toISOString()
      });

      // Provide more specific error messages
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        throw new Error('Network error: Unable to reach Claude API. Check your internet connection.');
      } else if (error.status === 401 || error.message?.includes('authentication') || error.message?.includes('api_key')) {
        throw new Error('Authentication error: Invalid API key. Please check your ANTHROPIC_API_KEY.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (error.status === 400) {
        throw new Error(`Bad request: ${error.message || 'Invalid request to Claude API'}`);
      } else {
        throw new Error(error.message || 'Failed to get response from AI coach');
      }
    }
  }
}
