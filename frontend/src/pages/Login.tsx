import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
} from '@ionic/react';
import { logoGoogle } from 'ionicons/icons';
import { authService } from '../services/authService';
import './Login.css';

const Login: React.FC = () => {
  const handleGoogleLogin = () => {
    authService.loginWithGoogle();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="login-container">
          <div className="login-logo">
            <h1>💪 Workout Tracker</h1>
            <p>Track your fitness journey with AI-powered workouts</p>
          </div>

          <IonCard>
            <IonCardContent>
              <h2>Welcome Back!</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Sign in to access your personalized workout plans and track your progress
              </p>

              <IonButton
                expand="block"
                size="large"
                onClick={handleGoogleLogin}
                className="google-login-btn"
              >
                <IonIcon icon={logoGoogle} slot="start" />
                Sign in with Google
              </IonButton>

              <p style={{ fontSize: '12px', color: '#999', marginTop: '20px', textAlign: 'center' }}>
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
