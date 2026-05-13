import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonList,
  IonChip,
  IonModal,
  IonButtons,
  IonToast,
  IonAlert,
  IonSpinner,
} from '@ionic/react';
import { Preferences } from '@capacitor/preferences';
import {
  person,
  mail,
  fitness,
  barbell,
  addCircle,
  closeCircle,
  checkmarkCircle,
  logoWhatsapp,
  send,
  cloudUploadOutline,
  refresh,
} from 'ionicons/icons';
import { useStore, REQUIRED_PROFILE_FIELDS } from '../store/useStore';
import { useCurrentUser, userKeys } from '../hooks/useUserQuery';
import { useActivePlan, useUpdateActivePlan } from '../hooks/useActivePlan';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { userApi as backendUserApi, workoutPlanApi as backendWorkoutPlanApi } from '../services/api_backend';
import { parseWorkoutPlan } from '../types/workout';
import EquipmentPhotoCapture from '../components/Equipment/EquipmentPhotoCapture';
import { aiService } from '../services/aiService';
import { telegramService } from '../services/telegramService';
import { dailyRecapService } from '../services/dailyRecapService';
import type { BodyweightExercise } from '../types';
import './Profile.css';

const BODYWEIGHT_EXERCISES_WITH_DESC = [
  { name: 'Pull-ups', description: 'Hang from bar, pull body up until chin over bar (palms away)' },
  { name: 'Chin-ups', description: 'Like pull-ups but with palms facing towards you' },
  { name: 'Push-ups', description: 'Standard push-up with hands shoulder-width apart' },
  { name: 'Diamond Push-ups', description: 'Push-ups with hands forming diamond shape, targets triceps' },
  { name: 'Wide Push-ups', description: 'Push-ups with hands wider than shoulders, targets chest' },
  { name: 'Pike Push-ups', description: 'Push-ups with hips raised, targets shoulders' },
  { name: 'Dips', description: 'Lower body between parallel bars, push back up' },
  { name: 'Bodyweight Squats', description: 'Lower hips until thighs parallel to ground, stand back up' },
  { name: 'Jump Squats', description: 'Squat down then explosively jump up' },
  { name: 'Lunges', description: 'Step forward, lower back knee towards ground' },
  { name: 'Walking Lunges', description: 'Lunges moving forward with each rep' },
  { name: 'Burpees', description: 'Squat, kick feet back to plank, push-up, jump back to squat, jump up' },
  { name: 'Mountain Climbers', description: 'Plank position, alternate bringing knees to chest quickly' },
  { name: 'Planks', description: 'Hold body straight in push-up position on forearms (time-based)' },
  { name: 'Sit-ups', description: 'Lie on back, bring torso up to sitting position' },
  { name: 'Crunches', description: 'Like sit-ups but lift shoulders only, lower back stays down' },
  { name: 'Jumping Jacks', description: 'Jump while spreading legs and raising arms overhead' },
  { name: 'High Knees', description: 'Run in place bringing knees up to waist level' },
];

const BODYWEIGHT_EXERCISES = BODYWEIGHT_EXERCISES_WITH_DESC.map(ex => ex.name);

const EQUIPMENT_OPTIONS = [
  // Technogym Equipment
  'Treadmill (Technogym)',
  'Elliptical (Technogym)',
  'Stationary Bike (Technogym)',
  'Rowing Machine (Technogym)',
  'Technogym Chest Press',
  'Technogym Leg Press',
  'Technogym Lat Pulldown',
  'Technogym Cable Machine',
  'Technogym Leg Extension',
  'Technogym Leg Curl',
  'Technogym Shoulder Press',
  'Technogym Smith Machine',
  // Free Weights & Other
  'Dumbbells',
  'Barbells',
  'Kettlebells',
  'Weight Plates',
  'Pull-up Bar',
  'Dip Station',
  'Resistance Bands',
  'Medicine Ball',
  'Foam Roller',
  'Bench',
  'Squat Rack',
  'Box (for box jumps)',
  'Jump Rope',
  'Ab Wheel',
  'Battle Ropes',
  'TRX/Suspension Trainer',
];

const Profile: React.FC = () => {
  const { user, setUser } = useStore();
  const { data: activeWorkoutPlan } = useActivePlan();
  const { setActivePlan: setActiveWorkoutPlan } = useUpdateActivePlan();
  // Cached backend profile — single source of truth across the app.
  const userQuery = useCurrentUser();
  const location = useLocation();
  // When we land here via the plan-creation gate (?reason=plan-prerequisites)
  // surface the banner listing which fields still need filling.
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
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showPhotoCaptureModal, setShowPhotoCaptureModal] = useState(false);
  const queryClient = useQueryClient();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateAlert, setShowRegenerateAlert] = useState(false);
  const [equipmentToAdd, setEquipmentToAdd] = useState<string>('');
  const [customEquipment, setCustomEquipment] = useState<string>('');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [bodyweightExercises, setBodyweightExercises] = useState<BodyweightExercise[]>([]);
  const [showBodyweightModal, setShowBodyweightModal] = useState(false);
  const [bodyweightToAdd, setBodyweightToAdd] = useState<string>('');
  const [maxReps, setMaxReps] = useState<number>(0);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [sendingRecap, setSendingRecap] = useState(false);

  // Hydrate the form whenever the cached profile changes. Using the cached
  // query (instead of a fetch effect) means revisiting the tab shows the
  // last known values immediately while react-query refreshes in the
  // background — eliminates the "blank for a few seconds" flicker.
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
    setBodyweightExercises(userData.bodyweightExercises || []);
  }, [userQuery.data]);

  useEffect(() => {
    if (user?.id) loadTelegramConfig();
  }, [user?.id]);

  const loadTelegramConfig = async () => {
    if (!user?.id) return;

    try {
      // Load from database
      const { telegramConfigApi } = await import('../services/api_backend');
      const config = await telegramConfigApi.get(user.id);

      if (config.botToken && config.chatId) {
        setTelegramBotToken(config.botToken);
        setTelegramChatId(config.chatId);

        // Also save to local Preferences for telegramService compatibility
        await Preferences.set({ key: 'telegram_bot_token', value: config.botToken });
        await Preferences.set({ key: 'telegram_chat_id', value: config.chatId });

        // Load into telegram service
        await telegramService.loadConfig();

        // Setup daily notification if Telegram is configured
        if (telegramService.isConfigured()) {
          await dailyRecapService.setupDailyNotification();
        }
      }
    } catch (error) {
      console.error('Error loading telegram config:', error);
      // Fallback to Preferences if backend fails
      await telegramService.loadConfig();
      const botToken = await Preferences.get({ key: 'telegram_bot_token' });
      const chatId = await Preferences.get({ key: 'telegram_chat_id' });
      if (botToken.value) setTelegramBotToken(botToken.value);
      if (chatId.value) setTelegramChatId(chatId.value);
    }
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
      setToastMessage('Profile updated successfully!');
      setShowToast(true);
    } catch (error) {
      console.error('Error updating profile:', error);
      setToastMessage('Failed to update profile');
      setShowToast(true);
    }
  };

  const handleAddBodyweightExercise = () => {
    if (bodyweightToAdd && maxReps > 0) {
      const exists = bodyweightExercises.find(ex => ex.name === bodyweightToAdd);
      if (!exists) {
        const newExercises = [...bodyweightExercises, { name: bodyweightToAdd, maxReps }];
        setBodyweightExercises(newExercises);
        setBodyweightToAdd('');
        setMaxReps(0);
        setShowBodyweightModal(false);
        setShowRegenerateAlert(true);
      }
    }
  };

  const handleRemoveBodyweightExercise = (exerciseName: string) => {
    const newExercises = bodyweightExercises.filter(ex => ex.name !== exerciseName);
    setBodyweightExercises(newExercises);
    setShowRegenerateAlert(true);
  };

  const handleUpdateMaxReps = (exerciseName: string, newMaxReps: number) => {
    const updated = bodyweightExercises.map(ex =>
      ex.name === exerciseName ? { ...ex, maxReps: newMaxReps } : ex
    );
    setBodyweightExercises(updated);
  };

  const handleAddEquipment = () => {
    const equipmentName = useCustomInput ? customEquipment.trim() : equipmentToAdd;

    if (equipmentName && !availableEquipment.includes(equipmentName)) {
      const newEquipment = [...availableEquipment, equipmentName];
      setAvailableEquipment(newEquipment);
      setEquipmentToAdd('');
      setCustomEquipment('');
      setUseCustomInput(false);
      setShowEquipmentModal(false);
      setShowRegenerateAlert(true);
    }
  };

  const handleRemoveEquipment = (equipment: string) => {
    const newEquipment = availableEquipment.filter(e => e !== equipment);
    setAvailableEquipment(newEquipment);
    setShowRegenerateAlert(true);
  };

  const regenerateIncompleteWorkouts = async () => {
    if (!user?.id || !activeWorkoutPlan) return;

    setIsRegenerating(true);
    try {
      // Persist profile changes first so the backend reads up-to-date
      // equipment / bodyweight / fitness level from the user row.
      await handleSaveProfile();

      // Backend does the heavy lifting: parses incomplete days, calls Claude
      // with strict bodyweight caps, validates output, rebuilds planDetails
      // preserving completed days, refreshes structured Workout/Exercise tables.
      const result = await backendWorkoutPlanApi.regenerateIncomplete(
        activeWorkoutPlan.id!,
        user.id
      );

      if (result.plan) setActiveWorkoutPlan(result.plan);
      if (result.regeneratedDays && result.regeneratedDays.length > 0) {
        setToastMessage(`Regenerated ${result.regeneratedDays.length} workout(s).`);
      } else {
        setToastMessage(result.message || 'No incomplete workouts to regenerate.');
      }
      setShowToast(true);
    } catch (error: any) {
      console.error('Error regenerating workouts:', error);
      const serverMessage = error?.response?.data?.error || error?.message;
      setToastMessage(
        serverMessage ? `Regenerate failed: ${serverMessage}` : 'Failed to regenerate workouts'
      );
      setShowToast(true);
    } finally {
      setIsRegenerating(false);
      setShowRegenerateAlert(false);
    }
  };

  const getAvailableEquipmentToAdd = () => {
    return EQUIPMENT_OPTIONS.filter(eq => !availableEquipment.includes(eq));
  };

  const handleSaveTelegram = async () => {
    if (!user?.id || !telegramBotToken || !telegramChatId) {
      setToastMessage('Please fill in both Bot Token and Chat ID');
      setShowToast(true);
      return;
    }

    try {
      // Save to database
      const { telegramConfigApi } = await import('../services/api_backend');
      await telegramConfigApi.save(user.id, {
        botToken: telegramBotToken,
        chatId: telegramChatId
      });

      // Also save to local Preferences for telegram service
      await telegramService.saveConfig(telegramBotToken, telegramChatId);

      setShowTelegramModal(false);
      setToastMessage('Telegram settings saved!');
      setShowToast(true);
    } catch (error) {
      console.error('Error saving telegram config:', error);
      setToastMessage('Failed to save Telegram settings');
      setShowToast(true);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    const result = await telegramService.testConnection();

    if (result.success) {
      await telegramService.sendMessage('🎉 Telegram integration is working! You will receive workout notifications here.');
      setToastMessage('Test successful! Check your Telegram');
    } else {
      setToastMessage(`Test failed: ${result.error}`);
    }
    setShowToast(true);
    setTestingTelegram(false);
  };

  const handleSendDailyRecap = async () => {
    if (!user?.id) return;

    setSendingRecap(true);
    const success = await dailyRecapService.sendDailyRecap(user.id);

    if (success) {
      setToastMessage('Daily recap sent! Check your Telegram');
    } else {
      setToastMessage('Failed to send recap');
    }
    setShowToast(true);
    setSendingRecap(false);
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

  const FIELD_LABELS: Record<typeof REQUIRED_PROFILE_FIELDS[number], string> = {
    age: 'Age',
    weight: 'Weight',
    height: 'Height',
    fitnessLevel: 'Fitness level',
    goals: 'Goals',
  };

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
            <IonCard
              className="profile-gate-banner"
              color="warning"
              style={{ marginBottom: 12 }}
            >
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
          <IonCard className="profile-card">
            <IonCardContent>
              <h2 className="section-title">
                <IonIcon icon={person} /> Personal Information
              </h2>

              <IonList>
                <IonItem>
                  <IonLabel position="stacked">Name</IonLabel>
                  <IonInput
                    value={name}
                    onIonInput={(e) => setName(e.detail.value!)}
                    placeholder="Your name"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Email</IonLabel>
                  <IonInput
                    type="email"
                    value={email}
                    onIonInput={(e) => setEmail(e.detail.value!)}
                    placeholder="your.email@example.com"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Age</IonLabel>
                  <IonInput
                    type="number"
                    value={age}
                    onIonInput={(e) => setAge(parseInt(e.detail.value!))}
                    placeholder="25"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Weight (kg)</IonLabel>
                  <IonInput
                    type="number"
                    value={weight}
                    onIonInput={(e) => setWeight(parseInt(e.detail.value!))}
                    placeholder="70"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Height (cm)</IonLabel>
                  <IonInput
                    type="number"
                    value={height}
                    onIonInput={(e) => setHeight(parseInt(e.detail.value!))}
                    placeholder="175"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Fitness Level</IonLabel>
                  <IonSelect
                    value={fitnessLevel}
                    onIonChange={(e) => setFitnessLevel(e.detail.value)}
                  >
                    <IonSelectOption value="beginner">Beginner</IonSelectOption>
                    <IonSelectOption value="intermediate">Intermediate</IonSelectOption>
                    <IonSelectOption value="advanced">Advanced</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          <IonCard className="equipment-card">
            <IonCardContent>
              <div className="equipment-header">
                <h2 className="section-title">
                  <IonIcon icon={barbell} /> Available Equipment
                </h2>
                <div style={{ display: 'flex', gap: 4 }}>
                  <IonButton
                    fill="clear"
                    onClick={() => setShowPhotoCaptureModal(true)}
                  >
                    <IonIcon icon={cloudUploadOutline} slot="start" />
                    Detect from photo
                  </IonButton>
                  <IonButton
                    fill="clear"
                    onClick={() => setShowEquipmentModal(true)}
                  >
                    <IonIcon icon={addCircle} slot="start" />
                    Add Equipment
                  </IonButton>
                </div>
              </div>

              <div className="equipment-chips">
                {availableEquipment.length === 0 ? (
                  <p className="no-equipment">No equipment added yet</p>
                ) : (
                  availableEquipment.map((equipment, index) => (
                    <IonChip key={index} color="primary">
                      <IonLabel>{equipment}</IonLabel>
                      <IonIcon
                        icon={closeCircle}
                        onClick={() => handleRemoveEquipment(equipment)}
                      />
                    </IonChip>
                  ))
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {activeWorkoutPlan && (
            <IonCard color="light" style={{ marginBottom: 12 }}>
              <IonCardContent>
                <strong>
                  <IonIcon icon={refresh} /> Apply equipment / bodyweight changes
                </strong>
                <p style={{ margin: '6px 0 10px', fontSize: 14 }}>
                  Regenerate the workouts you haven't done yet so they match your latest setup.
                </p>
                <IonButton
                  expand="block"
                  onClick={regenerateIncompleteWorkouts}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <>
                      <IonSpinner name="dots" />
                      &nbsp;Regenerating…
                    </>
                  ) : (
                    'Regenerate incomplete workouts now'
                  )}
                </IonButton>
              </IonCardContent>
            </IonCard>
          )}

          <IonCard className="bodyweight-card">
            <IonCardContent>
              <div className="equipment-header">
                <h2 className="section-title">
                  <IonIcon icon={fitness} /> Bodyweight Exercises
                </h2>
                <IonButton
                  fill="clear"
                  onClick={() => setShowBodyweightModal(true)}
                >
                  <IonIcon icon={addCircle} slot="start" />
                  Add Exercise
                </IonButton>
              </div>

              {bodyweightExercises.length === 0 ? (
                <p className="no-equipment">No bodyweight exercises added yet</p>
              ) : (
                <IonList>
                  {bodyweightExercises.map((exercise, index) => (
                    <IonItem key={index} lines="full">
                      <IonLabel>
                        <h3>{exercise.name}</h3>
                        <p>Max Reps: {exercise.maxReps}</p>
                      </IonLabel>
                      <IonInput
                        type="number"
                        value={exercise.maxReps}
                        onIonChange={(e) => handleUpdateMaxReps(exercise.name, parseInt(e.detail.value!))}
                        placeholder="Max reps"
                        style={{ maxWidth: '80px', textAlign: 'right' }}
                      />
                      <IonIcon
                        icon={closeCircle}
                        color="danger"
                        slot="end"
                        onClick={() => handleRemoveBodyweightExercise(exercise.name)}
                        style={{ cursor: 'pointer', marginLeft: '8px' }}
                      />
                    </IonItem>
                  ))}
                </IonList>
              )}
            </IonCardContent>
          </IonCard>

          <IonCard className="goals-card">
            <IonCardContent>
              <h2 className="section-title">
                <IonIcon icon={fitness} /> Fitness Goals
              </h2>

              <div className="goals-chips">
                {goals.map((goal, index) => (
                  <IonChip key={index} color="success">
                    <IonIcon icon={checkmarkCircle} />
                    <IonLabel>{goal}</IonLabel>
                  </IonChip>
                ))}
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard className="telegram-card">
            <IonCardContent>
              <h2 className="section-title">
                <IonIcon icon={send} /> Telegram Notifications
              </h2>
              <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
                Get workout completion notifications sent to your Telegram
              </p>

              {telegramService.isConfigured() ? (
                <div>
                  <IonChip color="success">
                    <IonIcon icon={checkmarkCircle} />
                    <IonLabel>Connected</IonLabel>
                  </IonChip>
                  <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '12px' }}>
                    📅 Daily recap scheduled for 9:00 AM
                  </p>
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <IonButton
                      expand="block"
                      onClick={handleSendDailyRecap}
                      disabled={sendingRecap}
                    >
                      <IonIcon icon={send} slot="start" />
                      {sendingRecap ? 'Sending...' : 'Send Daily Recap Now'}
                    </IonButton>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <IonButton
                        size="small"
                        fill="outline"
                        onClick={() => setShowTelegramModal(true)}
                        style={{ flex: 1 }}
                      >
                        Reconfigure
                      </IonButton>
                      <IonButton
                        size="small"
                        fill="outline"
                        onClick={handleTestTelegram}
                        disabled={testingTelegram}
                        style={{ flex: 1 }}
                      >
                        {testingTelegram ? 'Testing...' : 'Test'}
                      </IonButton>
                    </div>
                  </div>
                </div>
              ) : (
                <IonButton
                  expand="block"
                  onClick={() => setShowTelegramModal(true)}
                >
                  <IonIcon icon={logoWhatsapp} slot="start" />
                  Setup Telegram
                </IonButton>
              )}
            </IonCardContent>
          </IonCard>

          <IonCard className="migration-card">
            <IonCardContent>
              <h2 className="section-title">
                <IonIcon icon={cloudUploadOutline} /> Backend Migration
              </h2>
              <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
                Migrate your data to the cloud backend and enable automatic sync
              </p>
              <IonButton
                expand="block"
                fill="outline"
                routerLink="/migration"
              >
                <IonIcon icon={cloudUploadOutline} slot="start" />
                Open Migration Page
              </IonButton>
            </IonCardContent>
          </IonCard>

          <IonButton
            expand="block"
            className="save-button"
            onClick={handleSaveProfile}
          >
            Save Profile
          </IonButton>
        </div>

        <EquipmentPhotoCapture
          isOpen={showPhotoCaptureModal}
          existingEquipment={availableEquipment}
          onConfirm={async (equipment) => {
            // Save to backend so the change persists across sessions, and
            // invalidate the cached profile so the rest of the app picks it up.
            setAvailableEquipment(equipment);
            setShowPhotoCaptureModal(false);
            try {
              if (user?.id) {
                await backendUserApi.update(user.id, { availableEquipment: equipment });
                queryClient.invalidateQueries({ queryKey: userKeys.byId(user.id) });
              }
              setToastMessage('Equipment updated from photo.');
              setShowToast(true);
            } catch (e) {
              console.error('Failed to persist equipment:', e);
              setToastMessage('Saved locally, but failed to sync to server.');
              setShowToast(true);
            }
          }}
          onClose={() => setShowPhotoCaptureModal(false)}
        />

        <IonModal
          isOpen={showEquipmentModal}
          onDidDismiss={() => {
            setShowEquipmentModal(false);
            setUseCustomInput(false);
            setCustomEquipment('');
            setEquipmentToAdd('');
          }}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Add Equipment</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => {
                  setShowEquipmentModal(false);
                  setUseCustomInput(false);
                  setCustomEquipment('');
                  setEquipmentToAdd('');
                }}>
                  Close
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              <IonItem>
                <IonLabel>
                  <IonButton
                    fill={!useCustomInput ? 'solid' : 'outline'}
                    size="small"
                    onClick={() => setUseCustomInput(false)}
                    style={{ marginRight: '8px' }}
                  >
                    Choose from List
                  </IonButton>
                  <IonButton
                    fill={useCustomInput ? 'solid' : 'outline'}
                    size="small"
                    onClick={() => setUseCustomInput(true)}
                  >
                    Type Custom
                  </IonButton>
                </IonLabel>
              </IonItem>

              {!useCustomInput ? (
                <IonItem>
                  <IonLabel position="stacked">Select Equipment</IonLabel>
                  <IonSelect
                    value={equipmentToAdd}
                    onIonChange={(e) => setEquipmentToAdd(e.detail.value)}
                    placeholder="Choose equipment"
                  >
                    {getAvailableEquipmentToAdd().map((eq, index) => (
                      <IonSelectOption key={index} value={eq}>
                        {eq}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              ) : (
                <IonItem>
                  <IonLabel position="stacked">Custom Equipment Name</IonLabel>
                  <IonInput
                    value={customEquipment}
                    onIonInput={(e) => setCustomEquipment(e.detail.value!)}
                    placeholder="Enter equipment name (e.g., Battle Ropes)"
                  />
                </IonItem>
              )}
            </IonList>
            <div style={{ padding: '16px' }}>
              <IonButton
                expand="block"
                onClick={handleAddEquipment}
                disabled={useCustomInput ? !customEquipment.trim() : !equipmentToAdd}
              >
                Add Equipment
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonModal
          isOpen={showBodyweightModal}
          onDidDismiss={() => {
            setShowBodyweightModal(false);
            setBodyweightToAdd('');
            setMaxReps(0);
          }}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Add Bodyweight Exercise</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => {
                  setShowBodyweightModal(false);
                  setBodyweightToAdd('');
                  setMaxReps(0);
                }}>
                  Close
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Select Exercise</IonLabel>
                <IonSelect
                  value={bodyweightToAdd}
                  onIonChange={(e) => setBodyweightToAdd(e.detail.value)}
                  placeholder="Choose bodyweight exercise"
                >
                  {BODYWEIGHT_EXERCISES.filter(ex =>
                    !bodyweightExercises.find(bw => bw.name === ex)
                  ).map((ex, index) => (
                    <IonSelectOption key={index} value={ex}>
                      {ex}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Maximum Reps</IonLabel>
                <IonInput
                  type="number"
                  value={maxReps}
                  onIonInput={(e) => setMaxReps(parseInt(e.detail.value!) || 0)}
                  placeholder="Enter your max reps (e.g., 15)"
                />
              </IonItem>

              <div style={{ padding: '16px', color: '#666', fontSize: '14px' }}>
                <p>💡 Enter the maximum number of consecutive reps you can do with good form.</p>
                <p>This will help generate appropriate rep ranges in your workouts.</p>
              </div>
            </IonList>
            <div style={{ padding: '16px' }}>
              <IonButton
                expand="block"
                onClick={handleAddBodyweightExercise}
                disabled={!bodyweightToAdd || maxReps <= 0}
              >
                Add Exercise
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

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
              }
            },
            {
              text: 'Regenerate Now',
              handler: regenerateIncompleteWorkouts
            }
          ]}
        />

        <IonModal
          isOpen={showTelegramModal}
          onDidDismiss={() => setShowTelegramModal(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Setup Telegram</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowTelegramModal(false)}>
                  <IonIcon icon={closeCircle} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <div style={{ padding: '20px' }}>
              <IonCard>
                <IonCardContent>
                  <h3 style={{ marginTop: 0 }}>📱 How to setup:</h3>
                  <ol style={{ lineHeight: '1.8', fontSize: '14px' }}>
                    <li>Open Telegram and search for <strong>@BotFather</strong></li>
                    <li>Send <code>/newbot</code> and follow instructions to create your bot</li>
                    <li>Copy the <strong>Bot Token</strong> (looks like: 123456:ABC-DEF1234...)</li>
                    <li>Search for <strong>@userinfobot</strong> in Telegram</li>
                    <li>Start a chat with it to get your <strong>Chat ID</strong> (a number)</li>
                    <li>Paste both values below</li>
                  </ol>
                </IonCardContent>
              </IonCard>

              <IonList>
                <IonItem>
                  <IonLabel position="stacked">Bot Token</IonLabel>
                  <IonInput
                    value={telegramBotToken}
                    onIonInput={(e) => setTelegramBotToken(e.detail.value!)}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Chat ID</IonLabel>
                  <IonInput
                    value={telegramChatId}
                    onIonInput={(e) => setTelegramChatId(e.detail.value!)}
                    placeholder="123456789"
                    type="number"
                  />
                </IonItem>
              </IonList>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <IonButton
                  expand="block"
                  onClick={handleSaveTelegram}
                  style={{ flex: 1 }}
                >
                  Save
                </IonButton>
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={handleTestTelegram}
                  disabled={testingTelegram || !telegramBotToken || !telegramChatId}
                  style={{ flex: 1 }}
                >
                  {testingTelegram ? 'Testing...' : 'Test'}
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

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
