import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonSpinner,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { authService } from '../services/authService';
import { useStore } from '../store/useStore';

const AuthCallback: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const setUser = useStore((state) => state.setUser);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    // Prevent running multiple times
    if (hasRun) {
      console.log('🔵 AuthCallback: Already processed, skipping');
      return;
    }

    const handleCallback = async () => {
      console.log('🔵 AuthCallback: Starting...');
      // Parse token from URL query params
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const errorParam = params.get('error');

      console.log('🔵 AuthCallback: Token:', token ? 'present' : 'missing');
      console.log('🔵 AuthCallback: Error param:', errorParam);

      if (errorParam) {
        console.error('❌ AuthCallback: Error param found:', errorParam);
        setError(`Authentication failed: ${errorParam}`);
        setTimeout(() => history.push('/login'), 3000);
        return;
      }

      if (!token) {
        console.error('❌ AuthCallback: No token');
        setError('No authentication token received');
        setTimeout(() => history.push('/login'), 3000);
        return;
      }

      try {
        console.log('🔵 AuthCallback: Handling token...');
        setHasRun(true); // Mark as run

        // Handle auth callback and fetch user
        const authUser = await authService.handleAuthCallback(token);
        console.log('✅ AuthCallback: Got auth user:', authUser);

        // Convert AuthUser to your app's User format
        const appUser = {
          id: parseInt(authUser.id),
          email: authUser.email,
          name: authUser.name,
        };

        console.log('✅ AuthCallback: Setting user in store');
        // Update Zustand store
        setUser(appUser);

        console.log('✅ AuthCallback: Redirecting to /home');
        // Redirect to home
        history.push('/home');
      } catch (error) {
        console.error('❌ AuthCallback error:', error);
        setError('Failed to complete authentication');
        setTimeout(() => history.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [location, history, setUser, hasRun]);

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '80vh'
        }}>
          <IonCard>
            <IonCardContent style={{ textAlign: 'center', padding: '40px' }}>
              {error ? (
                <>
                  <h2>❌ {error}</h2>
                  <p>Redirecting to login...</p>
                </>
              ) : (
                <>
                  <IonSpinner name="crescent" style={{ width: '50px', height: '50px' }} />
                  <h2 style={{ marginTop: '20px' }}>Completing sign in...</h2>
                  <p>Please wait while we set up your account</p>
                </>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AuthCallback;
