import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonIcon, IonButton, IonGrid, IonRow, IonCol } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useActivePlan, useUpdateActivePlan } from '../hooks/useActivePlan';
import { authService } from '../services/authService';
import OnboardingQuestionnaire from '../components/Onboarding/OnboardingQuestionnaire';
import { chatbubbles, barChart, fitness, today, personCircle, trophy, calendar, trash } from 'ionicons/icons';
import { clearAllData } from '../services/localStorage';
import './Home.css';

const Home: React.FC = () => {
  const { user, setUser } = useStore();
  const authReady = useStore((s) => s.authReady);
  const { data: activeWorkoutPlan } = useActivePlan();
  const { setActivePlan, invalidateActivePlan } = useUpdateActivePlan();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Wait for the auth bootstrap (App.tsx) to settle before triggering any
  // user-scoped fetch. Doing it earlier is exactly the race the user reported
  // — "data appears after a few seconds, or not at all".
  // useActivePlan internally gates on authReady && user?.id, so we don't need
  // a separate effect to load the active plan; just the user.
  useEffect(() => {
    if (!authReady) return;
    loadUser();
  }, [authReady]);

  const loadUser = async () => {
    try {
      // Check if user is authenticated via OAuth
      if (authService.isAuthenticated()) {
        const oauthUser = authService.getCurrentUser();
        if (oauthUser) {
          console.log('✅ Found OAuth user:', oauthUser);
          const userId = parseInt(oauthUser.id);
          setUser({
            id: userId,
            email: oauthUser.email,
            name: oauthUser.name
          });
          return;
        }
      }
      console.log('No authenticated user found');
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Onboarding may have generated a new plan; force a refetch of the cache.
    invalidateActivePlan();
  };

  const handleResetApp = async () => {
    if (window.confirm('Are you sure you want to delete all data and start over? This cannot be undone.')) {
      await clearAllData();
      setUser(null);
      setActivePlan(null);
      window.location.reload();
    }
  };

  const testAPICall = async () => {
    console.log('Testing API call...');
    try {
      const { aiService } = await import('../services/aiService');
      console.log('About to call aiService.chat');
      const response = await aiService.chat('Hello, can you respond with "API is working!"?', {});
      console.log('API Response:', response);
      alert('API Success! Response: ' + response.substring(0, 100));
    } catch (error: any) {
      console.error('API Test Error:', error);
      alert('API Error: ' + error.message);
    }
  };

  if (showOnboarding) {
    console.log('Rendering OnboardingQuestionnaire');
    return <OnboardingQuestionnaire onComplete={handleOnboardingComplete} />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>AI Workout Coach</IonTitle>
          {user && (
            <IonButton slot="end" fill="clear" onClick={handleResetApp} color="danger">
              <IonIcon icon={trash} />
            </IonButton>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div style={{ padding: '16px' }}>
          {!user ? (
            <>
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Welcome to AI Workout Coach!</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{ marginBottom: '20px' }}>
                    Get personalized workout plans powered by AI. Our intelligent coach will create
                    custom training programs based on your goals, equipment, and fitness level.
                  </p>
                  <button
                    className="get-started-button"
                    onClick={() => {
                      console.log('Get Started clicked - setting showOnboarding to true');
                      setShowOnboarding(true);
                    }}
                  >
                    Get Started
                  </button>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>🧪 Development Test</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonButton expand="block" onClick={testAPICall} color="warning">
                    Test API Call
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </>
          ) : (
            <div>
              <IonCard className="welcome-card">
                <IonCardContent>
                  <div className="welcome-header">
                    <IonIcon icon={personCircle} className="profile-icon" />
                    <div>
                      <h1 className="welcome-title">Welcome back, {user.name}!</h1>
                      <p className="welcome-subtitle">Ready to crush your workout?</p>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>

              {activeWorkoutPlan && (
                <IonCard className="active-plan-card">
                  <IonCardHeader>
                    <IonCardTitle>
                      <IonIcon icon={trophy} /> Active Plan
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <h3>{activeWorkoutPlan.name}</h3>
                    <p className="plan-description">{activeWorkoutPlan.description}</p>
                    <div className="plan-stats-home">
                      <div className="stat-home">
                        <IonIcon icon={calendar} />
                        <span>{activeWorkoutPlan.daysPerWeek} days/week</span>
                      </div>
                      <div className="stat-home">
                        <IonIcon icon={fitness} />
                        <span>{activeWorkoutPlan.durationWeeks} weeks</span>
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              )}

              <div className="quick-actions-title">Quick Actions</div>
              <IonGrid className="quick-actions-grid">
                <IonRow>
                  <IonCol size="6">
                    <IonCard button routerLink="/today" className="action-card today-card">
                      <IonCardContent>
                        <IonIcon icon={today} className="action-icon" />
                        <h3>Today's Workout</h3>
                        <p>Start training</p>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                  <IonCol size="6">
                    <IonCard button routerLink="/chat" className="action-card chat-card">
                      <IonCardContent>
                        <IonIcon icon={chatbubbles} className="action-icon" />
                        <h3>AI Coach</h3>
                        <p>Get advice</p>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="6">
                    <IonCard button routerLink="/progress" className="action-card progress-card">
                      <IonCardContent>
                        <IonIcon icon={barChart} className="action-icon" />
                        <h3>Progress</h3>
                        <p>Track stats</p>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                  <IonCol size="6">
                    <IonCard button routerLink="/workout" className="action-card workout-card">
                      <IonCardContent>
                        <IonIcon icon={fitness} className="action-icon" />
                        <h3>Workout Log</h3>
                        <p>View history</p>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
