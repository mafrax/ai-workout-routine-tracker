import { Redirect, Route, useHistory } from 'react-router-dom';
import { IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { chatbubbles, barChart, fitness, today, home, person, listCircle, checkmarkDoneCircle, timer } from 'ionicons/icons';
import { App as CapacitorApp } from '@capacitor/app';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStore } from './store/useStore';
import { authService } from './services/authService';
import ChatInterface from './components/Chat/ChatInterface';
import Progress from './components/Progress/Progress';
import WorkoutLog from './components/Workout/WorkoutLog';
import TodaysWorkout from './components/Workout/TodaysWorkout';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Plans from './pages/Plans';
import DailyTasks from './pages/DailyTasks';
import Migration from './pages/Migration';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import PrivateRoute from './components/Auth/PrivateRoute';
import Fasting from './pages/Fasting';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

// Create a client for React Query with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent: React.FC = () => {
  const history = useHistory();
  const { setUser } = useStore();

  // Load user on app startup
  useEffect(() => {
    if (authService.isAuthenticated()) {
      const oauthUser = authService.getCurrentUser();
      if (oauthUser) {
        console.log('🔄 App: Loading user from auth service:', oauthUser.email);
        setUser({
          id: parseInt(oauthUser.id),
          email: oauthUser.email,
          name: oauthUser.name
        });
      }
    }
  }, [setUser]);

  useEffect(() => {
    let listenerHandle: any;

    // Listen for app URL open events (deep links from OAuth redirect)
    const setupListener = async () => {
      listenerHandle = await CapacitorApp.addListener('appUrlOpen', (event: any) => {
        console.log('📱 App URL opened:', event.url);

        // Parse the URL to extract token
        const url = new URL(event.url);
        const token = url.searchParams.get('token');

        if (token) {
          console.log('✅ Token found in deep link, redirecting to /auth/callback');
          // Navigate to auth callback with token
          history.push(`/auth/callback?token=${token}`);
        }
      });
    };

    setupListener();

    return () => {
      listenerHandle?.remove();
    };
  }, [history]);

  return null;
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <IonApp>
      <IonReactRouter>
        <AppContent />
        <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/login">
            <Login />
          </Route>
          <Route exact path="/auth/callback">
            <AuthCallback />
          </Route>
          <PrivateRoute exact path="/home" component={Home} />
          <PrivateRoute exact path="/today" component={TodaysWorkout} />
          <PrivateRoute exact path="/plans" component={Plans} />
          <PrivateRoute exact path="/chat" component={ChatInterface} />
          <PrivateRoute exact path="/workout" component={WorkoutLog} />
          <PrivateRoute exact path="/progress" component={Progress} />
          <PrivateRoute exact path="/profile" component={Profile} />
          <PrivateRoute exact path="/tasks" component={DailyTasks} />
          <PrivateRoute exact path="/fasting" component={Fasting} />
          <PrivateRoute exact path="/migration" component={Migration} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>

        <IonTabBar slot="bottom">
          <IonTabButton tab="home" href="/home">
            <IonIcon icon={home} />
            <IonLabel>Home</IonLabel>
          </IonTabButton>
          <IonTabButton tab="today" href="/today">
            <IonIcon icon={today} />
            <IonLabel>Today</IonLabel>
          </IonTabButton>
          <IonTabButton tab="plans" href="/plans">
            <IonIcon icon={listCircle} />
            <IonLabel>Plans</IonLabel>
          </IonTabButton>
          <IonTabButton tab="tasks" href="/tasks">
            <IonIcon icon={checkmarkDoneCircle} />
            <IonLabel>Tasks</IonLabel>
          </IonTabButton>
          <IonTabButton tab="fasting" href="/fasting">
            <IonIcon icon={timer} />
            <IonLabel>Fasting</IonLabel>
          </IonTabButton>
          <IonTabButton tab="progress" href="/progress">
            <IonIcon icon={barChart} />
            <IonLabel>Progress</IonLabel>
          </IonTabButton>
          <IonTabButton tab="profile" href="/profile">
            <IonIcon icon={person} />
            <IonLabel>Profile</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
  </QueryClientProvider>
);

export default App;
