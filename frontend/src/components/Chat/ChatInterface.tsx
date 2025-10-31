import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonInput,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonIcon,
  IonToast,
} from '@ionic/react';
import { checkmarkCircle, refresh, copy } from 'ionicons/icons';
import { useStore } from '../../store/useStore';
import { chatApi } from '../../services/api_backend';
import { frontchatApi } from '../../services/api';
import { workoutPlanApi } from '../../services/api';
import './ChatInterface.css';

const ChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const { user, sessionId, chatHistory, isLoading, setSessionId, addChatMessage, setLoading, activeWorkoutPlan, setActiveWorkoutPlan } = useStore();
  const contentRef = useRef<HTMLIonContentElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [lastSuggestedPlan, setLastSuggestedPlan] = useState<string | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    contentRef.current?.scrollToBottom(300);
  };

  const sendMessage = async () => {
    if (!message.trim() || !user) return;

    const userMessage = message;
    setMessage('');
    setLoading(true);

    // Add user message to chat
    addChatMessage({ role: 'user', content: userMessage });

    try {
      const response = await frontchatApi.sendMessage(user.id!, userMessage, sessionId || undefined);

      // Set session ID if this is a new conversation
      if (!sessionId) {
        setSessionId(response.sessionId);
      }

      // Add assistant response to chat
      addChatMessage({ role: 'assistant', content: response.message });

      // Check if the response contains a complete workout plan (Day 1, Day 2, Day 3, Day 4)
      const hasDay1 = response.message.includes('Day 1');
      const hasDay2 = response.message.includes('Day 2');
      const hasDay3 = response.message.includes('Day 3');
      const hasDay4 = response.message.includes('Day 4');

      if (hasDay1 && hasDay2 && hasDay3 && hasDay4) {
        setLastSuggestedPlan(response.message);
        // Auto-scroll to show the Apply Changes button
        setTimeout(() => scrollToBottom(), 300);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addChatMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const extractWorkoutPlan = (text: string): string => {
    // Find the first "Day 1" and extract everything from there
    const dayOneIndex = text.search(/Day 1[\s:-]/i);
    if (dayOneIndex === -1) return text;

    return text.substring(dayOneIndex).trim();
  };

  const applyPlanChanges = async () => {
    if (!lastSuggestedPlan || !activeWorkoutPlan) return;

    setLoading(true);
    try {
      // Extract only the workout plan portion (remove conversational text)
      const cleanedPlan = extractWorkoutPlan(lastSuggestedPlan);

      const updatedPlan = await workoutPlanApi.updatePlan(activeWorkoutPlan.id!, {
        planDetails: cleanedPlan
      });

      setActiveWorkoutPlan(updatedPlan);
      setToastMessage('Workout plan updated successfully! ✅');
      setShowToast(true);
      setLastSuggestedPlan(null);
    } catch (error) {
      console.error('Error updating plan:', error);
      setToastMessage('Failed to update workout plan');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyChatToClipboard = async () => {
    const chatText = chatHistory
      .map(msg => `${msg.role === 'user' ? 'You' : 'Coach'}: ${msg.content}`)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(chatText);
      setToastMessage('Chat copied to clipboard! 📋');
      setShowToast(true);
    } catch (error) {
      console.error('Failed to copy chat:', error);
      setToastMessage('Failed to copy chat');
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Workout Coach</IonTitle>
          <IonButton slot="end" fill="clear" onClick={copyChatToClipboard} disabled={chatHistory.length === 0}>
            <IonIcon icon={copy} slot="icon-only" />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} className="chat-content">
        <IonList>
          {chatHistory.map((msg, index) => (
            <IonItem
              key={index}
              className={`chat-message ${msg.role}`}
              lines="none"
            >
              <div className="message-container">
                <div className={`message-bubble ${msg.role}`}>
                  <IonLabel className="message-text">{msg.content}</IonLabel>
                </div>
              </div>
            </IonItem>
          ))}
          {isLoading && (
            <IonItem className="chat-message assistant" lines="none">
              <div className="message-container">
                <div className="message-bubble assistant">
                  <IonSpinner name="dots" />
                </div>
              </div>
            </IonItem>
          )}
          {lastSuggestedPlan && !isLoading && (
            <IonCard className="apply-changes-card">
              <IonCardContent>
                <p className="apply-prompt">
                  <IonIcon icon={refresh} /> The coach has suggested updates to your workout plan.
                </p>
                <IonButton
                  expand="block"
                  color="success"
                  onClick={applyPlanChanges}
                >
                  <IonIcon icon={checkmarkCircle} slot="start" />
                  Apply Changes to My Plan
                </IonButton>
              </IonCardContent>
            </IonCard>
          )}
        </IonList>
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
        />
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="chat-input-container">
            <IonInput
              value={message}
              placeholder="Ask about your workout plan..."
              onIonInput={(e) => setMessage(e.detail.value!)}
              onKeyPress={handleKeyPress}
              className="chat-input"
            />
            <IonButton
              onClick={sendMessage}
              disabled={!message.trim() || isLoading}
              className="send-button"
            >
              Send
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default ChatInterface;
