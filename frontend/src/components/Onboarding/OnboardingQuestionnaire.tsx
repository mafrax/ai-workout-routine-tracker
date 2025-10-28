import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonCheckbox,
  IonProgressBar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
} from '@ionic/react';
import { useStore } from '../../store/useStore';
import { userApi } from '../../services/api';
import { generateWorkoutPlans, type GeneratedPlan } from '../../services/workoutPlanService';
import PlanSelection from './PlanSelection';
import type { User } from '../../types';
import './OnboardingQuestionnaire.css';

interface OnboardingProps {
  onComplete: () => void;
}

const EQUIPMENT_LIST = [
  // Cardio Equipment
  { name: 'Treadmill (Technogym)', category: 'Cardio' },
  { name: 'Elliptical (Technogym)', category: 'Cardio' },
  { name: 'Stationary Bike (Technogym)', category: 'Cardio' },
  { name: 'Rowing Machine (Technogym)', category: 'Cardio' },
  { name: 'Stair Climber', category: 'Cardio' },

  // Strength Equipment
  { name: 'Dumbbells', category: 'Strength' },
  { name: 'Barbells', category: 'Strength' },
  { name: 'Kettlebells', category: 'Strength' },
  { name: 'Resistance Bands', category: 'Strength' },
  { name: 'Weight Plates', category: 'Strength' },

  // Technogym Machines
  { name: 'Technogym Chest Press', category: 'Technogym Machines' },
  { name: 'Technogym Leg Press', category: 'Technogym Machines' },
  { name: 'Technogym Lat Pulldown', category: 'Technogym Machines' },
  { name: 'Technogym Cable Machine', category: 'Technogym Machines' },
  { name: 'Technogym Leg Extension', category: 'Technogym Machines' },
  { name: 'Technogym Leg Curl', category: 'Technogym Machines' },
  { name: 'Technogym Shoulder Press', category: 'Technogym Machines' },
  { name: 'Technogym Pec Fly', category: 'Technogym Machines' },
  { name: 'Technogym Seated Row', category: 'Technogym Machines' },
  { name: 'Technogym Smith Machine', category: 'Technogym Machines' },

  // Functional Training
  { name: 'Pull-up Bar', category: 'Functional' },
  { name: 'Dip Station', category: 'Functional' },
  { name: 'TRX/Suspension Trainer', category: 'Functional' },
  { name: 'Medicine Ball', category: 'Functional' },
  { name: 'Battle Ropes', category: 'Functional' },
  { name: 'Plyo Box', category: 'Functional' },
  { name: 'Foam Roller', category: 'Functional' },

  // Bodyweight
  { name: 'Bodyweight Only', category: 'Bodyweight' },
];

const FITNESS_GOALS = [
  'Build Muscle',
  'Lose Weight',
  'Improve Strength',
  'Increase Endurance',
  'General Fitness',
  'Athletic Performance',
  'Flexibility',
  'Rehabilitation',
];

const OnboardingQuestionnaire: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { setUser } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedPlans, setGeneratedPlans] = useState<GeneratedPlan[] | null>(null);
  const [createdUser, setCreatedUser] = useState<User | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState<number>();
  const [gender, setGender] = useState('');
  const [weight, setWeight] = useState<number>();
  const [height, setHeight] = useState<number>();
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [injuries, setInjuries] = useState('');

  const totalSteps = 4;
  const progress = step / totalSteps;

  const handleEquipmentToggle = (equipmentName: string) => {
    if (equipment.includes(equipmentName)) {
      setEquipment(equipment.filter(e => e !== equipmentName));
    } else {
      setEquipment([...equipment, equipmentName]);
    }
  };

  const handleGoalToggle = (goal: string) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter(g => g !== goal));
    } else {
      setGoals([...goals, goal]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const userData: User = {
        name,
        email,
        age,
        gender,
        weight,
        height,
        fitnessLevel,
        goals,
        availableEquipment: equipment,
      };

      // Create the user
      const newUser = await userApi.create(userData);
      setUser(newUser);
      setCreatedUser(newUser);

      // Generate workout plans using the LLM
      const plans = await generateWorkoutPlans(newUser);
      setGeneratedPlans(plans);
    } catch (error) {
      console.error('Error creating profile or generating plans:', error);
      alert('Error creating profile. Please try again.');
      setLoading(false);
    }
  };

  const handlePlanSelectionComplete = () => {
    setLoading(false);
    onComplete();
  };

  // If plans are generated, show the plan selection screen
  if (generatedPlans && createdUser) {
    return (
      <PlanSelection
        plans={generatedPlans}
        userId={createdUser.id!}
        onComplete={handlePlanSelectionComplete}
      />
    );
  }

  // If loading (generating plans), show loading screen
  if (loading && !generatedPlans) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Creating Your Plans</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="loading-container">
            <IonSpinner name="crescent" className="large-spinner" />
            <h2>Analyzing Your Profile...</h2>
            <p>Our AI coach is creating personalized workout plans just for you.</p>
            <p>This may take a moment.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const canProceedStep1 = name && email;
  const canProceedStep2 = fitnessLevel && goals.length > 0;
  const canProceedStep3 = equipment.length > 0;
  const canSubmit = canProceedStep1 && canProceedStep2 && canProceedStep3;

  const renderStep = () => {
    console.log('Rendering step:', step);
    switch (step) {
      case 1:
        return (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Basic Information</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">Name *</IonLabel>
                  <IonInput
                    value={name}
                    onIonInput={(e) => setName(e.detail.value!)}
                    placeholder="Your name"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Email *</IonLabel>
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
                  <IonLabel position="stacked">Gender</IonLabel>
                  <IonSelect
                    value={gender}
                    onIonChange={(e) => setGender(e.detail.value)}
                    placeholder="Select gender"
                  >
                    <IonSelectOption value="male">Male</IonSelectOption>
                    <IonSelectOption value="female">Female</IonSelectOption>
                    <IonSelectOption value="other">Other</IonSelectOption>
                    <IonSelectOption value="prefer-not-to-say">Prefer not to say</IonSelectOption>
                  </IonSelect>
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Weight (kg)</IonLabel>
                  <IonInput
                    type="number"
                    value={weight}
                    onIonInput={(e) => setWeight(parseFloat(e.detail.value!))}
                    placeholder="70"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Height (cm)</IonLabel>
                  <IonInput
                    type="number"
                    value={height}
                    onIonInput={(e) => setHeight(parseFloat(e.detail.value!))}
                    placeholder="175"
                  />
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        );

      case 2:
        return (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Fitness Profile</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">Current Fitness Level *</IonLabel>
                  <IonSelect
                    value={fitnessLevel}
                    onIonChange={(e) => setFitnessLevel(e.detail.value)}
                    placeholder="Select your fitness level"
                  >
                    <IonSelectOption value="beginner">
                      Beginner - New to exercise
                    </IonSelectOption>
                    <IonSelectOption value="intermediate">
                      Intermediate - Regular exercise (6+ months)
                    </IonSelectOption>
                    <IonSelectOption value="advanced">
                      Advanced - Experienced athlete (2+ years)
                    </IonSelectOption>
                  </IonSelect>
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Days Per Week</IonLabel>
                  <IonSelect
                    value={daysPerWeek}
                    onIonChange={(e) => setDaysPerWeek(e.detail.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                      <IonSelectOption key={day} value={day}>
                        {day} {day === 1 ? 'day' : 'days'} per week
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                <IonItem lines="none">
                  <IonLabel>
                    <h2>Fitness Goals * (Select all that apply)</h2>
                  </IonLabel>
                </IonItem>
                {FITNESS_GOALS.map(goal => (
                  <IonItem key={goal}>
                    <IonCheckbox
                      slot="start"
                      checked={goals.includes(goal)}
                      onIonChange={() => handleGoalToggle(goal)}
                    />
                    <IonLabel>{goal}</IonLabel>
                  </IonItem>
                ))}

                <IonItem>
                  <IonLabel position="stacked">
                    Injuries or Limitations (Optional)
                  </IonLabel>
                  <IonTextarea
                    value={injuries}
                    onIonInput={(e) => setInjuries(e.detail.value!)}
                    placeholder="E.g., knee pain, lower back issues..."
                    rows={3}
                  />
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        );

      case 3:
        return (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Available Equipment *</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p style={{ marginBottom: '16px', color: '#666' }}>
                Select all equipment you have access to:
              </p>
              <IonList>
                {['Cardio', 'Strength', 'Technogym Machines', 'Functional', 'Bodyweight'].map(category => (
                  <div key={category}>
                    <IonItem lines="none" className="category-header">
                      <IonLabel>
                        <h2><strong>{category}</strong></h2>
                      </IonLabel>
                    </IonItem>
                    {EQUIPMENT_LIST.filter(e => e.category === category).map(item => (
                      <IonItem key={item.name}>
                        <IonCheckbox
                          slot="start"
                          checked={equipment.includes(item.name)}
                          onIonChange={() => handleEquipmentToggle(item.name)}
                        />
                        <IonLabel>{item.name}</IonLabel>
                      </IonItem>
                    ))}
                  </div>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        );

      case 4:
        return (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Review Your Profile</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h2>Name</h2>
                    <p>{name}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h2>Email</h2>
                    <p>{email}</p>
                  </IonLabel>
                </IonItem>
                {age && (
                  <IonItem>
                    <IonLabel>
                      <h2>Age</h2>
                      <p>{age} years</p>
                    </IonLabel>
                  </IonItem>
                )}
                <IonItem>
                  <IonLabel>
                    <h2>Fitness Level</h2>
                    <p className="capitalize">{fitnessLevel}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h2>Goals</h2>
                    <p>{goals.join(', ')}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h2>Training Days</h2>
                    <p>{daysPerWeek} days per week</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h2>Available Equipment</h2>
                    <p>{equipment.length} items selected</p>
                  </IonLabel>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        );

      default:
        return null;
    }
  };

  console.log('OnboardingQuestionnaire render - step:', step, 'loading:', loading);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Welcome to AI Workout Coach</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="onboarding-container">
          <div className="progress-container">
            <IonProgressBar value={progress}></IonProgressBar>
            <p className="step-indicator">Step {step} of {totalSteps}</p>
          </div>

          {renderStep()}

          <div className="button-container">
            {step > 1 && (
              <IonButton
                onClick={() => setStep(step - 1)}
                fill="outline"
                expand="block"
              >
                Previous
              </IonButton>
            )}

            {step < totalSteps ? (
              <IonButton
                onClick={() => setStep(step + 1)}
                expand="block"
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
              >
                Next
              </IonButton>
            ) : (
              <IonButton
                onClick={handleSubmit}
                expand="block"
                disabled={!canSubmit || loading}
              >
                {loading ? 'Creating Profile...' : 'Complete Setup'}
              </IonButton>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OnboardingQuestionnaire;
