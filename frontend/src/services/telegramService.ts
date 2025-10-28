import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

class TelegramService {
  private config: TelegramConfig | null = null;

  async loadConfig(): Promise<void> {
    const botToken = await Preferences.get({ key: 'telegram_bot_token' });
    const chatId = await Preferences.get({ key: 'telegram_chat_id' });

    if (botToken.value && chatId.value) {
      this.config = {
        botToken: botToken.value,
        chatId: chatId.value,
      };
    }
  }

  async saveConfig(botToken: string, chatId: string): Promise<void> {
    await Preferences.set({ key: 'telegram_bot_token', value: botToken });
    await Preferences.set({ key: 'telegram_chat_id', value: chatId });
    this.config = { botToken, chatId };
  }

  async clearConfig(): Promise<void> {
    await Preferences.remove({ key: 'telegram_bot_token' });
    await Preferences.remove({ key: 'telegram_chat_id' });
    this.config = null;
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.botToken !== '' && this.config.chatId !== '';
  }

  async sendMessage(message: string): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.isConfigured()) {
      console.warn('Telegram not configured');
      return false;
    }

    try {
      const response: HttpResponse = await CapacitorHttp.post({
        url: `${TELEGRAM_API_URL}${this.config!.botToken}/sendMessage`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          chat_id: this.config!.chatId,
          text: message,
          parse_mode: 'HTML',
        },
      });

      if (response.status === 200 && response.data.ok) {
        console.log('Telegram message sent successfully');
        return true;
      } else {
        console.error('Telegram API error:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.isConfigured()) {
      return { success: false, error: 'Telegram not configured' };
    }

    try {
      const response: HttpResponse = await CapacitorHttp.get({
        url: `${TELEGRAM_API_URL}${this.config!.botToken}/getMe`,
      });

      if (response.status === 200 && response.data.ok) {
        return { success: true };
      } else {
        return { success: false, error: response.data.description || 'Invalid bot token' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Connection failed' };
    }
  }

  formatWorkoutCompletionMessage(
    workoutName: string,
    duration: number,
    exercisesCompleted: number,
    totalExercises: number,
    completionRate: number
  ): string {
    const emoji = completionRate >= 0.9 ? '💪' : completionRate >= 0.7 ? '👍' : '✅';

    return `${emoji} <b>Workout Completed!</b>

📋 <b>${workoutName}</b>
⏱ Duration: ${duration} minutes
🏋️ Exercises: ${exercisesCompleted}/${totalExercises}
✅ Completion: ${Math.round(completionRate * 100)}%

Keep crushing it! 🔥`;
  }

  formatDailyRecapMessage(stats: {
    workoutsThisWeek: number;
    totalMinutesThisWeek: number;
    lastWorkoutDate?: string;
    currentStreak: number;
    lastWeight?: number;
    lastWeightDate?: string;
  }): string {
    const { workoutsThisWeek, totalMinutesThisWeek, lastWorkoutDate, currentStreak, lastWeight, lastWeightDate } = stats;

    const streakEmoji = currentStreak >= 7 ? '🔥🔥🔥' : currentStreak >= 3 ? '🔥' : '💪';
    const lastWorkout = lastWorkoutDate
      ? new Date(lastWorkoutDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : 'Never';

    const weightInfo = lastWeight && lastWeightDate
      ? `\n⚖️ Last weight: ${lastWeight}kg (${new Date(lastWeightDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
      : '\n⚖️ No weight recorded yet';

    return `🌅 <b>Good Morning! Daily Fitness Update</b>

📊 <b>Last 7 Days Progress:</b>
🏋️ Workouts: ${workoutsThisWeek}
⏱ Total time: ${totalMinutesThisWeek} minutes
📅 Last workout: ${lastWorkout}
${streakEmoji} Current streak: ${currentStreak} day${currentStreak !== 1 ? 's' : ''}
${weightInfo}

⚖️ <b>Don't forget to weigh yourself today!</b>

${workoutsThisWeek === 0 ? '⚡️ Time to start crushing it this week!' : '💯 Keep up the great work!'}`;
  }

  formatTaskReminderMessage(incompleteTasks: { title: string }[]): string {
    const taskList = incompleteTasks.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n');

    return `📋 <b>Daily Tasks Reminder</b>

You have ${incompleteTasks.length} task(s) to complete:

${taskList}

✅ Check them off in the app when done!`;
  }

  async generatePersonalizedTaskReminder(
    incompleteTasks: { title: string }[],
    currentHour: number,
    userName?: string
  ): Promise<string> {
    // Determine pressure level based on time of day
    const pressureLevel = this.getPressureLevel(currentHour);

    const taskList = incompleteTasks.map(t => t.title).join(', ');
    const name = userName || 'there';

    const prompt = `You are a motivational AI assistant sending a Telegram reminder about daily tasks.

Current time: ${currentHour}:00
User's name: ${name}
Incomplete tasks: ${taskList}
Number of tasks: ${incompleteTasks.length}

Pressure level: ${pressureLevel}

Generate a ${pressureLevel} reminder message in HTML format that:
${this.getPressureInstructions(pressureLevel)}

Keep it under 200 characters. Use <b> for bold. Include relevant emojis. Be direct and motivating.
Do not use markdown, only HTML tags.

Example gentle: "Hey ${name}! 🌅 Quick reminder about your ${incompleteTasks.length} tasks: ${taskList}. Let's crush them! 💪"
Example moderate: "${name}, time check! ⏰ You still have ${incompleteTasks.length} tasks waiting. Get them done! 🎯"
Example urgent: "${name}! ⚠️ URGENT: ${incompleteTasks.length} tasks left! ${taskList}. DO THEM NOW! 🔥"`;

    try {
      const { aiService } = await import('./aiService');
      const response = await aiService.chat(prompt, {});
      return response.trim();
    } catch (error) {
      console.error('Error generating personalized message:', error);
      // Fallback to generic message
      return this.formatTaskReminderMessage(incompleteTasks);
    }
  }

  private getPressureLevel(hour: number): 'gentle' | 'moderate' | 'urgent' | 'critical' {
    if (hour < 12) return 'gentle';
    if (hour < 15) return 'moderate';
    if (hour < 18) return 'urgent';
    return 'critical';
  }

  private getPressureInstructions(level: 'gentle' | 'moderate' | 'urgent' | 'critical'): string {
    switch (level) {
      case 'gentle':
        return `- Be friendly and encouraging
- Use positive language
- Gentle reminder tone
- Make it feel easy and achievable`;
      case 'moderate':
        return `- More assertive tone
- Add a sense of urgency
- Remind them time is passing
- Use motivational language`;
      case 'urgent':
        return `- Strong, direct language
- Create urgency
- Use commanding tone
- Emphasize importance of completing NOW`;
      case 'critical':
        return `- VERY urgent and pressing
- Use all caps for emphasis
- Maximum pressure
- Make them feel like they MUST act immediately
- Use fire, warning, and urgent emojis`;
    }
  }

  formatWorkoutPreview(planName: string, workoutDay: string, exercises: string[]): string {
    const exerciseList = exercises.map(ex => `  ${ex}`).join('\n');

    return `💪 <b>${planName}</b>

<b>${workoutDay}</b>

${exerciseList}

🔥 Let's crush it!`;
  }

  async sendWorkoutPreview(planName: string, workoutDay: string, exercises: string[]): Promise<boolean> {
    const message = this.formatWorkoutPreview(planName, workoutDay, exercises);
    return await this.sendMessage(message);
  }
}

export const telegramService = new TelegramService();
