import React, { useState } from 'react';
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
import axios from 'axios';
import './Migration.css';

const API_BASE_URL = 'http://localhost:8080/api';

const Migration: React.FC = () => {
  const { user } = useStore();
  const [migrating, setMigrating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [migrationStatus, setMigrationStatus] = useState<any>(null);

  const collectLocalStorageData = () => {
    const data: any = {
      userId: user?.id || Date.now(),
      tasks: [],
      workoutPlans: [],
      workoutSessions: [],
      userProfile: null,
      telegramConfig: null,
    };

    // Collect Daily Tasks
    const tasksStr = localStorage.getItem('dailyTasks');
    if (tasksStr) {
      try {
        data.tasks = JSON.parse(tasksStr);
      } catch (e) {
        console.error('Error parsing tasks', e);
      }
    }

    // Collect Workout Plans
    const plansStr = localStorage.getItem('workoutPlans');
    if (plansStr) {
      try {
        data.workoutPlans = JSON.parse(plansStr);
      } catch (e) {
        console.error('Error parsing workout plans', e);
      }
    }

    // Collect Workout Sessions
    const sessionsStr = localStorage.getItem('workoutSessions');
    if (sessionsStr) {
      try {
        data.workoutSessions = JSON.parse(sessionsStr);
      } catch (e) {
        console.error('Error parsing workout sessions', e);
      }
    }

    // Collect User Profile
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        data.userProfile = JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user', e);
      }
    }

    // Collect Telegram Config
    const telegramBotToken = localStorage.getItem('telegram_bot_token');
    const telegramChatId = localStorage.getItem('telegram_chat_id');
    const startHourStr = localStorage.getItem('dailyTasksStartHour');

    if (telegramBotToken && telegramChatId) {
      data.telegramConfig = {
        botToken: telegramBotToken,
        chatId: telegramChatId,
        startHour: startHourStr ? parseInt(startHourStr) : 9,
      };
    }

    return data;
  };

  const migrateData = async () => {
    setMigrating(true);
    setMigrationStatus(null);

    try {
      const data = collectLocalStorageData();

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

  const data = collectLocalStorageData();

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
                <li>Make sure the backend server is running on localhost:8080</li>
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
