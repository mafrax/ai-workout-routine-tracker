import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonToast,
  IonProgressBar,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
} from '@ionic/react';
import { cloudUploadOutline, checkmarkCircle, alertCircle } from 'ionicons/icons';
import { useStore } from '../store/useStore';
import { Preferences } from '@capacitor/preferences';
import { workoutPlanStorage, workoutSessionStorage, userStorage } from '../services/localStorage';
import axios from 'axios';
import './Migration.css';

const API_BASE_URL = 'https://workout-marcs-projects-3a713b55.vercel.app/api';

const Migration: React.FC = () => {
  const { user } = useStore();
  const [migrating, setMigrating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [localData, setLocalData] = useState<any>(null);

  // Load local data on component mount
  useEffect(() => {
    collectLocalStorageData();
  }, []);

  const collectLocalStorageData = async () => {
    const data: any = {
      userId: user?.id || Date.now(),
      tasks: [],
      workoutPlans: [],
      workoutSessions: [],
      userProfile: null,
      telegramConfig: null,
    };

    try {
      // Collect Daily Tasks (from localStorage)
      const tasksStr = localStorage.getItem('dailyTasks');
      if (tasksStr) {
        const rawTasks = JSON.parse(tasksStr);
        data.tasks = rawTasks.map((task: any) => ({
          title: task.title || 'Untitled Task',
          completed: task.completed || false
        }));
      }

      // Collect Workout Plans (from Capacitor Preferences)
      const rawWorkoutPlans = await workoutPlanStorage.getAll();
      data.workoutPlans = rawWorkoutPlans.map(plan => ({
        name: plan.name || 'Untitled Plan',
        planDetails: plan.planDetails || '',
        isActive: plan.isActive || false,
        isArchived: plan.isArchived || false,
        completedWorkouts: plan.completedWorkouts || [],
        telegramPreviewHour: plan.telegramPreviewHour || null
      }));

      // Collect Workout Sessions (from Capacitor Preferences)
      const rawWorkoutSessions = await workoutSessionStorage.getAll();
      data.workoutSessions = rawWorkoutSessions.map(session => ({
        planId: session.workoutPlanId || null,
        dayNumber: null, // Frontend doesn't track this field
        sessionDate: session.sessionDate || new Date().toISOString(),
        durationMinutes: session.durationMinutes || null,
        completionRate: session.completionRate || null,
        notes: session.notes || null
      }));

      // Collect User Profile (from Capacitor Preferences)
      data.userProfile = await userStorage.get();

      // Collect Telegram Config (from Capacitor Preferences)
      const telegramBotToken = await Preferences.get({ key: 'telegram_bot_token' });
      const telegramChatId = await Preferences.get({ key: 'telegram_chat_id' });
      const startHourStr = localStorage.getItem('dailyTasksStartHour');

      if (telegramBotToken.value && telegramChatId.value) {
        data.telegramConfig = {
          botToken: telegramBotToken.value,
          chatId: telegramChatId.value,
          startHour: startHourStr ? parseInt(startHourStr) : 9,
        };
      }

      console.log('Collected local data:', data);
      setLocalData(data);
      return data;
    } catch (error) {
      console.error('Error collecting local data:', error);
      setLocalData(data);
      return data;
    }
  };

  const migrateData = async () => {
    setMigrating(true);
    setMigrationStatus(null);

    try {
      const data = await collectLocalStorageData();

      console.log('Migrating data:', data);

      const response = await axios.post(`${API_BASE_URL}/migration/save`, data);

      console.log('Migration response:', response.data);

      setMigrationStatus(response.data);
      setToastMessage(`✅ Migration successful! Saved ${response.data.tasksCreated} tasks, ${response.data.plansCreated} plans, ${response.data.sessionsCreated} sessions`);
      setShowToast(true);
    } catch (error: any) {
      console.error('Migration error:', error);
      setToastMessage(`❌ Migration failed: ${error.response?.data?.error || error.message}`);
      setShowToast(true);
      setMigrationStatus({ success: false, error: error.message });
    } finally {
      setMigrating(false);
    }
  };

  // Use empty defaults while loading
  const data = localData || {
    tasks: [],
    workoutPlans: [],
    workoutSessions: [],
    telegramConfig: null
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Migrate to Backend</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            <h2>📦 Data Migration</h2>
            <p>
              This will transfer all your local data to the backend server. Your data will be preserved
              and you'll get automatic Telegram reminders!
            </p>

            <h3 style={{ marginTop: '20px' }}>Data to Migrate:</h3>
            <IonList>
              <IonItem>
                <IonLabel>Daily Tasks</IonLabel>
                <IonNote slot="end">{data.tasks.length} tasks</IonNote>
              </IonItem>
              <IonItem>
                <IonLabel>Workout Plans</IonLabel>
                <IonNote slot="end">{data.workoutPlans.length} plans</IonNote>
              </IonItem>
              <IonItem>
                <IonLabel>Workout Sessions</IonLabel>
                <IonNote slot="end">{data.workoutSessions.length} sessions</IonNote>
              </IonItem>
              <IonItem>
                <IonLabel>Telegram Config</IonLabel>
                <IonNote slot="end">{data.telegramConfig ? '✅' : '❌'}</IonNote>
              </IonItem>
            </IonList>

            {migrating && (
              <div style={{ marginTop: '20px' }}>
                <IonProgressBar type="indeterminate"></IonProgressBar>
                <p style={{ textAlign: 'center', marginTop: '10px' }}>Migrating data...</p>
              </div>
            )}

            {migrationStatus && (
              <IonCard color={migrationStatus.success ? 'success' : 'danger'} style={{ marginTop: '20px' }}>
                <IonCardContent>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <IonIcon
                      icon={migrationStatus.success ? checkmarkCircle : alertCircle}
                      style={{ fontSize: '32px' }}
                    />
                    <div>
                      <h3 style={{ margin: 0 }}>
                        {migrationStatus.success ? 'Migration Successful!' : 'Migration Failed'}
                      </h3>
                      {migrationStatus.success && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                          Tasks: {migrationStatus.tasksCreated} • Plans: {migrationStatus.plansCreated} • Sessions:{' '}
                          {migrationStatus.sessionsCreated}
                        </p>
                      )}
                      {!migrationStatus.success && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{migrationStatus.error}</p>
                      )}
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            )}

            <IonButton
              expand="block"
              onClick={migrateData}
              disabled={migrating}
              style={{ marginTop: '20px' }}
            >
              <IonIcon icon={cloudUploadOutline} slot="start" />
              Start Migration
            </IonButton>

            <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>⚠️ Before Migration:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                <li>Backend server is running on Vercel (cloud deployment)</li>
                <li>Your local data will NOT be deleted</li>
                <li>After migration, you can switch the app to use the backend</li>
                <li>Telegram reminders will be sent automatically by the backend</li>
              </ul>
            </div>
          </IonCardContent>
        </IonCard>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={5000}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default Migration;
