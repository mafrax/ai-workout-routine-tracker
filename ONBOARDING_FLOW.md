# Workout Plan Generation Flow

## Overview
After completing the onboarding questionnaire, users receive 3 AI-generated workout plan options to choose from.

## Complete Flow

### 1. **User Registration (4-Step Questionnaire)**

**Step 1: Basic Information**
- Name, Email (required)
- Age, Gender, Weight, Height (optional)

**Step 2: Fitness Profile**
- Fitness Level: Beginner/Intermediate/Advanced
- Training days per week (1-7)
- Goals (multiple selection):
  - Build Muscle
  - Lose Weight
  - Improve Strength
  - Increase Endurance
  - General Fitness
  - Athletic Performance
  - Flexibility
  - Rehabilitation
- Injuries/Limitations (optional)

**Step 3: Equipment Selection**
Users select from categorized equipment:
- **Cardio**: Technogym Treadmill, Elliptical, Bike, Rowing Machine
- **Strength**: Dumbbells, Barbells, Kettlebells, Resistance Bands
- **Technogym Machines**: Chest Press, Leg Press, Lat Pulldown, Cable Machine, etc.
- **Functional**: Pull-up Bar, TRX, Medicine Ball, Battle Ropes
- **Bodyweight**: Bodyweight Only

**Step 4: Review & Submit**
- User reviews all entered information
- Clicks "Complete Setup"

### 2. **AI Plan Generation**

**Loading Screen:**
- "Analyzing Your Profile..."
- "Our AI coach is creating personalized workout plans just for you."

**Backend Process:**
1. User profile is saved to database
2. Profile data is sent to Claude AI/ChatGPT with a structured prompt
3. LLM generates 3 different workout plans:
   - **Plan 1**: Conservative/Beginner-friendly
   - **Plan 2**: Moderate/Balanced
   - **Plan 3**: Aggressive/Advanced

**LLM Prompt Includes:**
- User's fitness level
- Goals
- Available equipment (including Technogym machines)
- Age, gender (if provided)
- Any injuries or limitations

**Expected Response Format:**
```
PLAN 1:
Name: [Plan Name]
Duration: X weeks
Days Per Week: X
Difficulty: Beginner/Intermediate/Advanced
Description: [Brief description]
Weekly Structure:
[Detailed breakdown of exercises]

PLAN 2:
...

PLAN 3:
...
```

### 3. **Plan Selection Interface**

Users see 3 cards with:
- Plan name and difficulty badge
- Description
- Duration (weeks)
- Training frequency (days/week)
- Preview of weekly structure

**Features:**
- Click to select a plan
- Visual selection indicator
- "Start This Plan" button

### 4. **Plan Activation**

When user selects a plan:
1. Plan is saved to `workout_plans` table
2. Plan is marked as active (`isActive = true`)
3. All other plans for this user are deactivated
4. User is redirected to home screen

## Technical Implementation

### Frontend Flow
```
OnboardingQuestionnaire
  ├─ Step 1-4: Collect user data
  ├─ Submit: Create user + Generate plans
  ├─ Loading screen
  └─ PlanSelection
      └─ Select + Activate plan
```

### API Calls
1. `POST /api/users` - Create user profile
2. `POST /api/chat` - Generate plans via LLM
3. `POST /api/plans` - Save selected plan (x3 for all plans if needed)
4. `PUT /api/plans/{id}/activate` - Activate chosen plan

### Data Storage

**User Table:**
```sql
- id, name, email
- age, gender, weight, height
- fitness_level
- available_equipment (array)
- goals (array)
```

**Workout Plans Table:**
```sql
- id, user_id
- name, description
- duration_weeks, days_per_week
- difficulty_level
- plan_details (full plan text)
- is_active (boolean)
```

**Conversation History:**
- Stores all LLM interactions
- Plan generation conversation is saved
- Can be referenced later for modifications

## Future Enhancements

1. **Plan Previews**: Allow users to view full plan details before selecting
2. **Plan Regeneration**: "Generate new options" button
3. **Custom Modifications**: Edit plan before activation
4. **Plan Comparison**: Side-by-side comparison view
5. **Save All Plans**: Keep all 3 plans for later review
6. **Plan History**: View previously generated plans

## Example User Journey

1. Marc opens the app
2. Clicks "Get Started"
3. Fills in questionnaire:
   - Name: Marc
   - Fitness Level: Intermediate
   - Goals: Build Muscle, Improve Strength
   - Equipment: All Technogym machines, Dumbbells, Barbells
   - Days/week: 4
4. Submits questionnaire
5. Waits 10-15 seconds while AI generates plans
6. Sees 3 options:
   - "Technogym Power Builder" (4 days, Intermediate)
   - "Balanced Strength Program" (4 days, Intermediate)
   - "Advanced Mass Gain" (5 days, Advanced)
7. Selects "Balanced Strength Program"
8. Plan is activated
9. Returns to home screen, ready to start training!

## Key Benefits

✅ **Personalized**: Plans match user's exact equipment and goals
✅ **Flexible**: Multiple options for different approaches
✅ **Smart**: AI adapts to fitness level and limitations
✅ **Progressive**: Can regenerate plans as user advances
✅ **Equipment-Aware**: Only uses available Technogym machines
