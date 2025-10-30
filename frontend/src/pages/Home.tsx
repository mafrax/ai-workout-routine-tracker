import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonIcon, IonButton, IonGrid, IonRow, IonCol } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { workoutPlanApi as backendWorkoutPlanApi } from '../services/api_backend';
import { authService } from '../services/authService';
import OnboardingQuestionnaire from '../components/Onboarding/OnboardingQuestionnaire';
import { chatbubbles, barChart, fitness, today, personCircle, trophy, calendar, trash } from 'ionicons/icons';
import { clearAllData } from '../services/localStorage';
import './Home.css';

const Home: React.FC = () => {
  const { user, setUser, activeWorkoutPlan, setActiveWorkoutPlan } = useStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadUser();
    loadActivePlan();
  }, []);

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
          // Load workout plans after setting user
          await loadActivePlanForUser(userId);
          return;
        }
      }
      console.log('No authenticated user found');
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadActivePlan = async () => {
    if (!user?.id) return;
    await loadActivePlanForUser(user.id);
  };

  const loadActivePlanForUser = async (userId: number) => {
    try {
      console.log('🔄 Loading workout plans for user:', userId);
      const plans = await backendWorkoutPlanApi.getUserPlans(userId);
      console.log('📦 Loaded plans:', plans);
      const active = plans.find((p: any) => p.isActive);
      if (active) {
        console.log('✅ Found active plan:', active);
        setActiveWorkoutPlan(active);
      } else {
        console.log('⚠️ No active plan found');
      }
    } catch (error) {
      console.error('❌ Error loading workout plans:', error);
    }
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    // Reload user and active plan after onboarding
    if (user?.id) {
      await loadActivePlanForUser(user.id);
    }
  };

  const handleResetApp = async () => {
    if (window.confirm('Are you sure you want to delete all data and start over? This cannot be undone.')) {
      await clearAllData();
      setUser(null);
      setActiveWorkoutPlan(null);
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
