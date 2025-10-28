import React, { useState, useRef, useEffect } from 'react';
import {
  IonContent,
  IonFooter,
  IonToolbar,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/react';
import { send, sparkles } from 'ionicons/icons';
import { aiService } from '../../services/aiService';
import type { User } from '../../types';
import './PlanCreationChat.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PlanCreationChatProps {
  user: User;
  onPlanGenerated: (planDetails: {
    name: string;
    description: string;
    goals: string[];
    equipment: string[];
    focus: string;
  }) => void;
  onCancel: () => void;
}

const PlanCreationChat: React.FC<PlanCreationChatProps> = ({ user, onPlanGenerated, onCancel }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const contentRef = useRef<HTMLIonContentElement>(null);

  useEffect(() => {
    // Start conversation
    startConversation();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (contentRef.current) {
      contentRef.current.scrollToBottom(300);
    }
  }, [messages]);

  const startConversation = async () => {
    const initialMessage: Message = {
      role: 'assistant',
      content: `Hey ${user.name}! 👋 I'm here to help you create a personalized workout plan.

Let me ask you a few questions to understand your goals better:

**What's the main focus of this workout plan?**
For example:
- Building strength
- Muscle growth (hypertrophy)
- Losing weight
- Improving endurance
- Sport-specific training
- Recovery/rehabilitation
- Travel workout (minimal equipment)

Tell me what you're aiming for!`
    };

    setMessages([initialMessage]);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history
      const conversationHistory = [...messages, userMessage];

      // Build the full prompt with system instructions and conversation
      const fullMessage = `You are a professional fitness coach helping create a personalized workout plan.

Current user profile:
- Name: ${user.name}
- Fitness Level: ${user.fitnessLevel || 'Not specified'}
- Current Goals: ${user.goals?.join(', ') || 'Not specified'}
- Available Equipment: ${user.availableEquipment?.join(', ') || 'None specified'}
- Age: ${user.age || 'Not specified'}
- Weight: ${user.weight ? user.weight + 'kg' : 'Not specified'}

Your role:
1. Ask focused questions to understand their new workout plan goals
2. Identify what equipment they need (suggest adding new equipment if needed)
3. Understand their schedule (days per week, duration)
4. Clarify the main focus (strength, hypertrophy, endurance, etc.)
5. After 3-5 exchanges, when you have enough information, respond with EXACTLY this format:

PLAN_READY
Name: [Short catchy name]
Description: [One sentence description]
Focus: [Main focus area]
Goals: [goal1, goal2, goal3]
Equipment: [equipment1, equipment2, equipment3]
Days: [number]
Duration: [number of weeks]

Be conversational, friendly, and guide them through the process naturally. Don't ask all questions at once - have a conversation.

${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;

      const response = await aiService.chat(fullMessage, {
        chatHistory: conversationHistory.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      // Check if plan is ready
      if (response.includes('PLAN_READY')) {
        setConversationComplete(true);
        parsePlanDetails(response);
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const parsePlanDetails = (response: string) => {
    try {
      const lines = response.split('\n');
      const planData: any = {};

      lines.forEach(line => {
        if (line.startsWith('Name:')) {
          planData.name = line.replace('Name:', '').trim();
        } else if (line.startsWith('Description:')) {
          planData.description = line.replace('Description:', '').trim();
        } else if (line.startsWith('Focus:')) {
          planData.focus = line.replace('Focus:', '').trim();
        } else if (line.startsWith('Goals:')) {
          const goalsStr = line.replace('Goals:', '').trim();
          planData.goals = goalsStr.split(',').map(g => g.trim()).filter(g => g);
        } else if (line.startsWith('Equipment:')) {
          const equipStr = line.replace('Equipment:', '').trim();
          planData.equipment = equipStr.split(',').map(e => e.trim()).filter(e => e);
        } else if (line.startsWith('Days:')) {
          planData.days = parseInt(line.replace('Days:', '').trim()) || 3;
        } else if (line.startsWith('Duration:')) {
          planData.duration = parseInt(line.replace('Duration:', '').trim()) || 8;
        }
      });

      // Show completion message
      const completionMessage: Message = {
        role: 'assistant',
        content: `Perfect! I've got everything I need. 🎉

I'll create a **${planData.name}** plan for you focusing on ${planData.focus}.

Generating your personalized workout plan now...`
      };
      setMessages(prev => [...prev, completionMessage]);

      // Notify parent component
      setTimeout(() => {
        onPlanGenerated(planData);
      }, 2000);

    } catch (error) {
      console.error('Error parsing plan details:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I had trouble understanding the plan details. Let me try again with the information you provided.'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <IonContent ref={contentRef} className="plan-chat-content" scrollEvents={true}>
        <div className="plan-chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`plan-chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              {message.role === 'assistant' && (
                <div className="message-icon">
                  <IonIcon icon={sparkles} />
                </div>
              )}
              <div className="message-content">
                <div className="message-text">{message.content}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="plan-chat-message assistant-message">
              <div className="message-icon">
                <IonIcon icon={sparkles} />
              </div>
              <div className="message-content">
                <IonSpinner name="dots" />
              </div>
            </div>
          )}
        </div>
      </IonContent>

      {!conversationComplete && (
        <IonFooter className="plan-chat-footer">
          <IonToolbar>
            <div className="plan-chat-input-container">
              <IonInput
                value={inputValue}
                onIonInput={(e) => setInputValue(e.detail.value!)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                disabled={isLoading || conversationComplete}
                className="plan-chat-input"
              />
              <IonButton
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading || conversationComplete}
                className="plan-chat-send-button"
              >
                <IonIcon icon={send} slot="icon-only" />
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      )}
    </>
  );
};

export default PlanCreationChat;
