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
} from 'ionicons/icons';
import { useStore } from '../store/useStore';
import { userApi, workoutPlanApi } from '../services/api';
import { parseWorkoutPlan } from '../types/workout';
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
  const { user, setUser, activeWorkoutPlan, setActiveWorkoutPlan } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
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

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAge(user.age || 0);
      setWeight(user.weight || 0);
      setHeight(user.height || 0);
      setFitnessLevel(user.fitnessLevel || '');
      setGoals(user.goals || []);
      setAvailableEquipment(user.availableEquipment || []);
      setBodyweightExercises(user.bodyweightExercises || []);
    }
    loadTelegramConfig();
  }, [user]);

  const loadTelegramConfig = async () => {
    await telegramService.loadConfig();

    // Load saved values into state
    const botToken = await Preferences.get({ key: 'telegram_bot_token' });
    const chatId = await Preferences.get({ key: 'telegram_chat_id' });
    if (botToken.value) setTelegramBotToken(botToken.value);
    if (chatId.value) setTelegramChatId(chatId.value);

    // Setup daily notification if Telegram is configured
    if (telegramService.isConfigured()) {
      await dailyRecapService.setupDailyNotification();
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    try {
      const updatedUser = await userApi.update(user.id, {
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
      // Save equipment changes first
      await handleSaveProfile();

      const parsedPlan = parseWorkoutPlan(activeWorkoutPlan.planDetails);
      const completedWorkouts = activeWorkoutPlan.completedWorkouts || [];

      console.log('Regenerating incomplete workouts with new equipment...');
      console.log('Completed workouts:', completedWorkouts);

      // Identify incomplete workouts
      const incompleteWorkouts = parsedPlan.weeklyWorkouts.filter(
        workout => !completedWorkouts.includes(workout.dayNumber)
      );

      console.log(`Regenerating ${incompleteWorkouts.length} incomplete workouts`);

      // Build new plan with only completed workouts
      let newPlanDetails = `Name: ${activeWorkoutPlan.name}
Duration: ${activeWorkoutPlan.durationWeeks} weeks
Days Per Week: ${activeWorkoutPlan.daysPerWeek}
Difficulty: ${activeWorkoutPlan.difficultyLevel}
Description: ${activeWorkoutPlan.description}

Weekly Structure - Week 1:

`;

      // Add completed workouts first
      const completedWorkoutDetails = parsedPlan.weeklyWorkouts
        .filter(workout => completedWorkouts.includes(workout.dayNumber))
        .sort((a, b) => a.dayNumber - b.dayNumber);

      for (const workout of completedWorkoutDetails) {
        // Find original workout text from plan details
        const workoutRegex = new RegExp(
          `Day ${workout.dayNumber} - ${workout.focus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:([\\s\\S]*?)(?=Day \\d+|$)`,
          'i'
        );
        const match = activeWorkoutPlan.planDetails.match(workoutRegex);
        if (match) {
          newPlanDetails += `Day ${workout.dayNumber} - ${workout.focus}:${match[1]}\n`;
        }
      }

      // Generate new workouts for incomplete ones
      for (const incompleteWorkout of incompleteWorkouts) {
        console.log(`Generating Day ${incompleteWorkout.dayNumber} - ${incompleteWorkout.focus}`);

        // Build bodyweight exercises info
        const bodyweightInfo = bodyweightExercises.length > 0
          ? `
BODYWEIGHT EXERCISES (with max reps):
${bodyweightExercises.map(ex => `- ${ex.name}: Max ${ex.maxReps} reps`).join('\n')}

IMPORTANT: When programming bodyweight exercises, use the max reps to calculate appropriate rep ranges:
- For strength: 40-60% of max reps
- For hypertrophy: 60-80% of max reps
- For endurance: 80-100% of max reps
- For example, if max Pull-ups is 10 reps, program 4-6 reps for strength, 6-8 reps for hypertrophy.
`
          : '';

        const bodyweightRequirement = bodyweightExercises.length > 0
          ? `\n\nCRITICAL: You MUST incorporate at least ${Math.min(2, bodyweightExercises.length)} bodyweight exercises into EVERY workout. Mix them with equipment exercises to create balanced, effective workouts.`
          : '';

        const prompt = `You are a professional fitness coach. Generate a workout for Day ${incompleteWorkout.dayNumber}.

USER PROFILE:
- Fitness Level: ${fitnessLevel}
- Goals: ${goals.join(', ')}
- Available Equipment: ${availableEquipment.join(', ')}
${bodyweightInfo}${bodyweightRequirement}

WORKOUT REQUIREMENTS:
- Day ${incompleteWorkout.dayNumber} - ${incompleteWorkout.focus}
- Use ONLY equipment from the available equipment list above
- ${bodyweightExercises.length > 0 ? 'MANDATORY: Include AT LEAST ' + Math.min(2, bodyweightExercises.length) + ' bodyweight exercises in this workout' : 'Use equipment-based exercises'}
- If using bodyweight exercises, RESPECT the max reps limitations and program accordingly
- Program bodyweight exercises based on max reps (strength: 40-60%, hypertrophy: 60-80%, endurance: 80-100%)
- Mix bodyweight exercises with equipment exercises strategically throughout the workout
- Follow the EXACT format below
- Include complete exercise details with sets, reps, weight, and rest times
- For bodyweight exercises, use "bodyweight" as the weight

REQUIRED FORMAT:

Day ${incompleteWorkout.dayNumber} - ${incompleteWorkout.focus}:
1. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
2. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
3. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
4. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s
5. [Exercise Name] - [Sets]x[Reps] @ [Weight]kg | [Rest between sets]s | [Rest before next]s

EXAMPLE WITH BODYWEIGHT:
Day 1 - Chest & Triceps:
1. Push-ups - 3x12 @ bodyweight | 60s | 90s
2. Technogym Chest Press - 3x12 @ 47-57kg | 90s | 120s
3. Dips - 3x8 @ bodyweight | 60s | 90s
4. Cable Flyes - 3x15 @ 13kg | 60s | 90s
5. Diamond Push-ups - 3x10 @ bodyweight | 60s | 90s

Return ONLY the workout content, no extra text.`;

        const response = await aiService.chat(prompt, {});
        const cleanedResponse = response.trim();
        newPlanDetails += '\n' + cleanedResponse + '\n';
      }

      // Update the workout plan
      const updatedPlan = await workoutPlanApi.update(activeWorkoutPlan.id!, {
        planDetails: newPlanDetails,
        // Keep the completed workouts array
        completedWorkouts: activeWorkoutPlan.completedWorkouts,
      });

      setActiveWorkoutPlan(updatedPlan);
      setToastMessage('Incomplete workouts regenerated with new equipment!');
      setShowToast(true);
      console.log('Workouts regenerated successfully');
    } catch (error) {
      console.error('Error regenerating workouts:', error);
      setToastMessage('Failed to regenerate workouts');
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
    if (!telegramBotToken || !telegramChatId) {
      setToastMessage('Please fill in both Bot Token and Chat ID');
      setShowToast(true);
      return;
    }

    await telegramService.saveConfig(telegramBotToken, telegramChatId);
    setShowTelegramModal(false);
    setToastMessage('Telegram settings saved!');
    setShowToast(true);
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
            <p>No user profile found</p>
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
                <IonButton
                  fill="clear"
                  onClick={() => setShowEquipmentModal(true)}
                >
                  <IonIcon icon={addCircle} slot="start" />
                  Add Equipment
                </IonButton>
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

          <IonButton
            expand="block"
            className="save-button"
            onClick={handleSaveProfile}
          >
            Save Profile
          </IonButton>
        </div>

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
