import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface UserProfile {
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  fitnessLevel?: string | null;
  goals?: string[] | null;
  availableEquipment?: string[] | null;
  bodyweightExercises?: string[] | null;
}

interface ChatContext {
  user?: UserProfile;
  activePlan?: any;
  recentSessions?: any[];
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function renderUserProfile(user?: UserProfile): string {
  if (!user) return '';
  const lines: string[] = ['User Profile:'];
  if (user.age != null) lines.push(`- Age: ${user.age}`);
  if (user.weight != null) lines.push(`- Weight: ${user.weight} kg`);
  if (user.height != null) lines.push(`- Height: ${user.height} cm`);
  if (user.fitnessLevel) lines.push(`- Fitness level: ${user.fitnessLevel}`);
  if (user.goals && user.goals.length > 0) lines.push(`- Goals: ${user.goals.join(', ')}`);
  if (user.availableEquipment && user.availableEquipment.length > 0) {
    lines.push(`- Available equipment: ${user.availableEquipment.join(', ')}`);
  } else {
    lines.push(`- Available equipment: bodyweight only`);
  }
  if (user.bodyweightExercises && user.bodyweightExercises.length > 0) {
    lines.push(`- Comfortable bodyweight movements: ${user.bodyweightExercises.join(', ')}`);
  }
  return lines.join('\n');
}

export class ChatService {
  async chat(message: string, context: ChatContext): Promise<string> {
    const profileBlock = renderUserProfile(context.user);

    const systemPrompt = `You are an expert AI fitness coach. Help users adjust their workout plans.

${profileBlock}

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
   - NEVER recommend exercises not in available equipment
   - Tailor volume, intensity, and exercise selection to the User Profile above (age, weight, fitness level, goals). If a section is missing, infer conservatively.

MANDATORY EXERCISE FORMAT:
Each workout day MUST follow this EXACT format:

Day [number] - [Muscle Group/Focus]:
1. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next exercise]s
2. [Exercise Name] - [Sets]x[Reps] @ bodyweight | [Rest between sets]s | [Rest before next exercise]s

EXAMPLES:
Day 1 - Push (Chest, Shoulders, Triceps):
1. Bench Press - 4x8 @ 60kg | 90s | 120s
2. Incline Dumbbell Press - 3x10 @ 22.5kg (30° incline) | 75s | 90s
3. Push-ups - 3x12 @ bodyweight | 60s | 90s

Day 2 - Pull (Back, Biceps):
1. Pull-ups - 4x6 @ bodyweight | 90s | 120s
2. Barbell Rows - 4x8 @ 50kg | 90s | 120s

EQUIPMENT-SPECIFIC ATTRIBUTES (use when relevant):
- Dumbbell exercises: the weight after "@" is PER HAND (one dumbbell), not total.
- Incline / decline bench: include the angle in parentheses, e.g. "(30° incline)" or "(-15° decline)".
- These details are parsed automatically — emit them whenever they're meaningful, so the app can surface them in the workout UI.

CRITICAL:
- Use numbered lists (1. 2. 3.) NOT bullet points or markdown formatting
- Include exact format: [Exercise] - [SetsxReps] @ [Weight] | [Rest] | [Rest]
- Reps must be a single number, NOT a range. Use "4x8" not "4x6-8".
- For bodyweight exercises, use "@ bodyweight" NOT "@ BW" or variations
- Always include rest times in seconds (e.g., "90s")
- Do NOT use markdown bold (**Day 1**) - use plain text "Day 1 - Focus:"
- NEVER write the substring "Day N" anywhere except as a real day header
  (e.g., do NOT write narrative like "Day 1 and Day 2" or
  "Rotate through Day 1, Day 2, Day 3" — the parser would mis-detect it).
  If you must reference scheduling, use words: "first session", "second session".`;

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
