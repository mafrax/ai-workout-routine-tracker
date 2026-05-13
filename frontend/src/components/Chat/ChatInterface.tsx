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
  IonButtons,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonIcon,
  IonToast,
} from '@ionic/react';
import { checkmarkCircle, refresh, copy, trashOutline, camera, barbell, close } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store/useStore';
import { chatApi, workoutPlanApi, userApi as backendUserApi } from '../../services/api_backend';
import { userKeys, useCurrentUser } from '../../hooks/useUserQuery';
import { useActivePlan, useUpdateActivePlan } from '../../hooks/useActivePlan';
import EquipmentPhotoCapture from '../Equipment/EquipmentPhotoCapture';
import './ChatInterface.css';

const ChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const { user, sessionId, chatHistory, isLoading, setSessionId, addChatMessage, clearChatHistory, setLoading } = useStore();
  const { data: activeWorkoutPlan } = useActivePlan();
  const { setActivePlan: setActiveWorkoutPlan } = useUpdateActivePlan();
  const contentRef = useRef<HTMLIonContentElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [lastSuggestedPlan, setLastSuggestedPlan] = useState<string | null>(null);
  // Equipment-onboarding banner: only on a fresh conversation. Once any of
  // the three options is taken (or dismissed) it stays gone for this session.
  const [equipmentBannerDismissed, setEquipmentBannerDismissed] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const history = useHistory();
  const queryClient = useQueryClient();
  const { data: fullUser } = useCurrentUser();

  const handleEquipmentFromPhoto = async (equipment: string[]) => {
    setPhotoModalOpen(false);
    setEquipmentBannerDismissed(true);
    try {
      if (user?.id) {
        await backendUserApi.update(user.id, { availableEquipment: equipment });
        queryClient.invalidateQueries({ queryKey: userKeys.byId(user.id) });
      }
      setToastMessage(`Saved ${equipment.length} item${equipment.length === 1 ? '' : 's'} to your equipment.`);
      setShowToast(true);
    } catch (err) {
      console.error('Failed to persist equipment from photo:', err);
      setToastMessage('Failed to save equipment list. Try again from Profile.');
      setShowToast(true);
    }
  };

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
      const response = await chatApi.sendMessage(user.id!, userMessage, chatHistory, sessionId || undefined);

      // Set session ID if this is a new conversation
      if (!sessionId) {
        setSessionId(response.sessionId);
      }

      // Add assistant response to chat
      addChatMessage({ role: 'assistant', content: response.message });

      // Check if the response contains a complete workout plan (Day 1 and at least Day 2)
      const hasDay1 = response.message.includes('Day 1');
      const hasDay2 = response.message.includes('Day 2');

      if (hasDay1 && hasDay2) {
        setLastSuggestedPlan(response.message);
        // Auto-scroll to show the Apply Changes button
        setTimeout(() => scrollToBottom(), 300);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      const errorMessage = error.message || 'Unknown error';
      addChatMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}\n\nPlease check:\n1. Your internet connection\n2. That your API keys are valid\n3. The browser console for more details`
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
    if (!lastSuggestedPlan || !user) return;

    setLoading(true);
    try {
      // Extract only the workout plan portion (remove conversational text)
      const cleanedPlan = extractWorkoutPlan(lastSuggestedPlan);

      // Always create a new plan when AI suggests a complete workout
      // Deactivate all existing plans first
      if (activeWorkoutPlan) {
        await workoutPlanApi.updatePlan(activeWorkoutPlan.id!, {
          isActive: false
        });
      }

      // Create new plan
      const newPlan: any = {
        userId: user.id!,
        name: 'My Workout Plan',
        description: 'AI-generated workout plan',
        durationWeeks: 4,
        daysPerWeek: 3,
        planDetails: cleanedPlan,
        difficultyLevel: 'intermediate',
        isActive: true,
      };
      const resultPlan = await workoutPlanApi.create(newPlan);

      setActiveWorkoutPlan(resultPlan);
      setShowToast(true);
      setToastMessage('New workout plan created successfully! ✅');
      setLastSuggestedPlan(null);
    } catch (error) {
      console.error('Error applying plan changes:', error);
      setToastMessage('Failed to apply workout plan changes');
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

  const handleClearChat = () => {
    clearChatHistory();
    setLastSuggestedPlan(null);
    setToastMessage('Chat history cleared! 🗑️');
    setShowToast(true);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Workout Coach</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={handleClearChat} disabled={chatHistory.length === 0}>
              <IonIcon icon={trashOutline} slot="icon-only" />
            </IonButton>
            <IonButton fill="clear" onClick={copyChatToClipboard} disabled={chatHistory.length === 0}>
              <IonIcon icon={copy} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} className="chat-content">
        {chatHistory.length === 0 && !equipmentBannerDismissed && (
          <IonCard color="light" style={{ margin: '12px' }}>
            <IonCardContent>
              <strong>Before we start — what equipment do you have?</strong>
              <p style={{ margin: '6px 0 10px', fontSize: 14 }}>
                Telling me up front means I'll only suggest exercises that fit your setup.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <IonButton size="small" onClick={() => setPhotoModalOpen(true)}>
                  <IonIcon icon={camera} slot="start" />
                  Use photo
                </IonButton>
                <IonButton
                  size="small"
                  fill="outline"
                  onClick={() => {
                    setEquipmentBannerDismissed(true);
                    history.push('/profile');
                  }}
                >
                  <IonIcon icon={barbell} slot="start" />
                  Add manually
                </IonButton>
                <IonButton size="small" fill="clear" onClick={() => setEquipmentBannerDismissed(true)}>
                  <IonIcon icon={close} slot="start" />
                  Skip for now
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        )}
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

      <EquipmentPhotoCapture
        isOpen={photoModalOpen}
        existingEquipment={fullUser?.availableEquipment || []}
        onConfirm={handleEquipmentFromPhoto}
        onClose={() => setPhotoModalOpen(false)}
      />

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
