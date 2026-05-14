import React, { useEffect, useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { useStore, REQUIRED_PROFILE_FIELDS } from '../store/useStore';
import { useCurrentUser, userKeys } from '../hooks/useUserQuery';
import { useActivePlan, useUpdateActivePlan } from '../hooks/useActivePlan';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  userApi as backendUserApi,
  workoutPlanApi as backendWorkoutPlanApi,
} from '../services/api_backend';
import type { BodyweightExercise } from '../types';
import { normalizeBodyweightExercises } from '../utils/bodyweight';
import ProfileBasicInfo from '../components/Profile/ProfileBasicInfo';
import ProfileEquipment from '../components/Profile/ProfileEquipment';
import ProfileBodyweight from '../components/Profile/ProfileBodyweight';
import ProfileGoals from '../components/Profile/ProfileGoals';
import ProfileTelegram from '../components/Profile/ProfileTelegram';
// ProfileMigration removed from Profile UI in Phase E — the route at
// /migration still exists for admin / one-shot use.
// import ProfileMigration from '../components/Profile/ProfileMigration';
import ProfileRegenerateBanner from '../components/Profile/ProfileRegenerateBanner';
import './Profile.css';

const FIELD_LABELS: Record<typeof REQUIRED_PROFILE_FIELDS[number], string> = {
  age: 'Age',
  weight: 'Weight',
  height: 'Height',
  fitnessLevel: 'Fitness level',
  goals: 'Goals',
};

/**
 * Profile page — the shell that owns the editable form state and the two
 * persistence flows (save profile, regenerate incomplete workouts). All
 * cards are extracted into sibling components in components/Profile/ —
 * Profile.tsx itself stays focused on orchestration.
 */
const Profile: React.FC = () => {
  const { user, setUser } = useStore();
  const { data: activeWorkoutPlan } = useActivePlan();
  const { setActivePlan: setActiveWorkoutPlan } = useUpdateActivePlan();
  const userQuery = useCurrentUser();
  const queryClient = useQueryClient();
  const location = useLocation();

  // Plan-creation gate: when redirected here with ?reason=plan-prerequisites
  // we surface a banner listing which fields still need filling.
  const gateParams = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('reason') !== 'plan-prerequisites') return null;
    const missingRaw = params.get('missing') || '';
    const missing = missingRaw
      .split(',')
      .filter((f): f is typeof REQUIRED_PROFILE_FIELDS[number] =>
        (REQUIRED_PROFILE_FIELDS as readonly string[]).includes(f)
      );
    return missing.length ? missing : null;
  }, [location.search]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [bodyweightExercises, setBodyweightExercises] = useState<BodyweightExercise[]>([]);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateAlert, setShowRegenerateAlert] = useState(false);

  // Hydrate from the cached profile whenever it changes. Using the cached
  // query (instead of a fetch effect) means revisiting the tab shows the
  // last known values immediately while react-query refreshes in the
  // background.
  useEffect(() => {
    const userData = userQuery.data;
    if (!userData) return;
    setName(userData.name || '');
    setEmail(userData.email || '');
    setAge(userData.age || 0);
    setWeight(userData.weight || 0);
    setHeight(userData.height || 0);
    setFitnessLevel(userData.fitnessLevel || '');
    setGoals(userData.goals || []);
    setAvailableEquipment(userData.availableEquipment || []);
    // Backend may still serve legacy `{name, maxReps}` rows; normaliser
    // converts them to the new `{name, unit, max}` shape on read.
    setBodyweightExercises(normalizeBodyweightExercises(userData.bodyweightExercises || []));
  }, [userQuery.data]);

  const handleToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    try {
      const updatedUser = await backendUserApi.update(user.id, {
        name,
        email,
        age,
        weight,
        height,
        fitnessLevel,
        goals,
        availableEquipment,
        bodyweightExercises,
      });
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.byId(user.id) });
      handleToast('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      handleToast('Failed to update profile');
    }
  };

  const handleEquipmentChange = async (next: string[], opts?: { afterPhoto?: boolean }) => {
    setAvailableEquipment(next);
    if (opts?.afterPhoto) {
      // Photo flow already persists through the analyze endpoint; we still
      // sync the cached user record so other pages see the new list.
      try {
        if (user?.id) {
          await backendUserApi.update(user.id, { availableEquipment: next });
          queryClient.invalidateQueries({ queryKey: userKeys.byId(user.id) });
        }
        handleToast('Equipment updated from photo.');
      } catch (e) {
        console.error('Failed to persist equipment:', e);
        handleToast('Saved locally, but failed to sync to server.');
      }
      return;
    }
    // Manual edit — surface the regenerate prompt the user opted into.
    setShowRegenerateAlert(true);
  };

  const handleBodyweightChange = (next: BodyweightExercise[]) => {
    setBodyweightExercises(next);
    setShowRegenerateAlert(true);
  };

  const regenerateIncompleteWorkouts = async () => {
    if (!user?.id || !activeWorkoutPlan) return;
    setIsRegenerating(true);
    try {
      // Persist profile changes first so the backend reads up-to-date
      // equipment / bodyweight / fitness level from the user row.
      await handleSaveProfile();

      const result = await backendWorkoutPlanApi.regenerateIncomplete(
        activeWorkoutPlan.id!,
        user.id
      );

      if (result.plan) setActiveWorkoutPlan(result.plan);
      handleToast(
        result.regeneratedDays && result.regeneratedDays.length > 0
          ? `Regenerated ${result.regeneratedDays.length} workout(s).`
          : result.message || 'No incomplete workouts to regenerate.'
      );
    } catch (error: any) {
      console.error('Error regenerating workouts:', error);
      const serverMessage = error?.response?.data?.error || error?.message;
      handleToast(
        serverMessage ? `Regenerate failed: ${serverMessage}` : 'Failed to regenerate workouts'
      );
    } finally {
      setIsRegenerating(false);
      setShowRegenerateAlert(false);
    }
  };

  if (!user) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Profile</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="no-user-container">
            <p>{userQuery.isLoading ? 'Loading profile…' : 'No user profile found'}</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="profile-container">
          {gateParams && (
            <IonCard className="profile-gate-banner" color="warning" style={{ marginBottom: 12 }}>
              <IonCardContent>
                <strong>Finish your profile to create a workout plan.</strong>
                <p style={{ marginTop: 8, marginBottom: 0 }}>
                  The AI coach needs the following to tailor your plan:
                </p>
                <ul style={{ marginTop: 4 }}>
                  {gateParams.map((f) => (
                    <li key={f}>{FIELD_LABELS[f]}</li>
                  ))}
                </ul>
              </IonCardContent>
            </IonCard>
          )}

          <ProfileBasicInfo
            name={name}
            onNameChange={setName}
            email={email}
            onEmailChange={setEmail}
            age={age}
            onAgeChange={setAge}
            weight={weight}
            onWeightChange={setWeight}
            height={height}
            onHeightChange={setHeight}
            fitnessLevel={fitnessLevel}
            onFitnessLevelChange={setFitnessLevel}
          />

          <ProfileEquipment availableEquipment={availableEquipment} onChange={handleEquipmentChange} />

          <ProfileRegenerateBanner
            visible={!!activeWorkoutPlan}
            isRegenerating={isRegenerating}
            onRegenerate={regenerateIncompleteWorkouts}
          />

          <ProfileBodyweight
            bodyweightExercises={bodyweightExercises}
            onChange={handleBodyweightChange}
          />

          <ProfileGoals goals={goals} onChange={setGoals} />

          <ProfileTelegram userId={user.id!} onToast={handleToast} />

          <IonButton expand="block" className="save-button" onClick={handleSaveProfile}>
            Save Profile
          </IonButton>
        </div>

        <IonAlert
          isOpen={showRegenerateAlert}
          onDidDismiss={() => setShowRegenerateAlert(false)}
          header="Regenerate Workouts"
          message="Equipment or bodyweight exercises have changed. Would you like to regenerate incomplete workouts to use the updated information?"
          buttons={[
            {
              text: 'Later',
              role: 'cancel',
              handler: async () => {
                await handleSaveProfile();
                setShowRegenerateAlert(false);
              },
            },
            {
              text: 'Regenerate Now',
              handler: regenerateIncompleteWorkouts,
            },
          ]}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default Profile;
