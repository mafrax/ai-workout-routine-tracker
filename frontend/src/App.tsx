import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { chatbubbles, barChart, fitness, today, home, person, listCircle, checkmarkDoneCircle } from 'ionicons/icons';
import ChatInterface from './components/Chat/ChatInterface';
import Progress from './components/Progress/Progress';
import WorkoutLog from './components/Workout/WorkoutLog';
import TodaysWorkout from './components/Workout/TodaysWorkout';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Plans from './pages/Plans';
import DailyTasks from './pages/DailyTasks';

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

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/home">
            <Home />
          </Route>
          <Route exact path="/today">
            <TodaysWorkout />
          </Route>
          <Route exact path="/plans">
            <Plans />
          </Route>
          <Route exact path="/chat">
            <ChatInterface />
          </Route>
          <Route exact path="/workout">
            <WorkoutLog />
          </Route>
          <Route exact path="/progress">
            <Progress />
          </Route>
          <Route exact path="/profile">
            <Profile />
          </Route>
          <Route exact path="/tasks">
            <DailyTasks />
          </Route>
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
);

export default App;
