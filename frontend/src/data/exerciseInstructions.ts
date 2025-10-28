export const EXERCISE_INSTRUCTIONS: { [key: string]: string } = {
  // Chest Exercises
  'Smith Machine Bench Press': 'Lie flat on bench with eyes under bar. Grip bar slightly wider than shoulders. Unrack and lower bar to mid-chest in controlled motion. Press bar up by extending arms, driving through chest muscles.',
  'Technogym Chest Press': 'Sit with back flat against pad, feet planted. Grip handles at chest level. Push handles forward by extending arms, focusing on chest contraction. Pause briefly, return to start position slowly.',
  'Chest Press': 'Sit upright, adjust seat so handles align with mid-chest. Plant feet firmly. Push handles forward extending arms fully. Return slowly, feeling chest stretch.',
  'Cable Flyes': 'Stand centered between cable towers, handles set at chest height. Step forward slightly, arms extended with slight elbow bend. Arc hands together in front of chest, squeezing pecs. Return to start with control.',
  'Dumbbell Bench Press': 'Lie on bench, dumbbells at chest level with elbows bent 90°. Press weights up and slightly together, rotating wrists inward. Lower slowly until dumbbells touch chest sides.',
  'Incline Bench Press': 'Lie on bench set to 30-45° angle. Grip bar wider than shoulders. Lower bar to upper chest/clavicle area. Press upward and slightly back toward face.',
  'Decline Bench Press': 'Secure feet in decline bench pads. Lie back with slight arch. Lower bar to lower chest/sternum. Press upward focusing on lower pec engagement.',

  // Back Exercises
  'Technogym Lat Pulldown': 'Sit with thighs secured under pad. Grip bar wider than shoulders, palms facing away. Pull bar down to upper chest by driving elbows down and back. Squeeze shoulder blades together at bottom. Extend arms slowly back up.',
  'Lat Pulldown': 'Secure thighs, grip bar wide. Lean back slightly (15°). Pull bar to collarbone by retracting shoulder blades and driving elbows down. Control upward motion, maintaining tension.',
  'Cable Rows': 'Sit on platform, feet on footrests with slight knee bend. Grip handle, arms extended. Pull handle to lower abdomen by driving elbows back and squeezing shoulder blades together. Extend arms forward slowly.',
  'Seated Cable Row': 'Sit tall with chest up, core braced. Pull handle to sternum, keeping elbows close to body. Focus on squeezing shoulder blades together. Slowly extend arms, maintaining torso position.',
  'Barbell Rows': 'Hinge at hips 45° forward, knees slightly bent. Grip bar shoulder-width, arms hanging. Pull bar to lower ribcage by driving elbows up and back. Keep back straight, core tight. Lower with control.',
  'Dumbbell Rows': 'Place one knee and hand on bench, other foot on ground. Hold dumbbell in free hand, arm hanging. Pull weight to hip by driving elbow up and back. Keep torso stable and parallel to ground.',
  'Face Pulls': 'Set cable at face height. Grip rope with thumbs toward you. Pull rope to face while separating hands outward. Squeeze shoulder blades together, pause. Return slowly.',
  'Deadlifts': 'Stand with feet hip-width, bar over mid-foot. Hinge at hips, grip bar outside legs. Brace core, drive through heels, extend hips and knees simultaneously. Keep bar close to shins/thighs. Stand tall, squeeze glutes.',

  // Shoulder Exercises
  'Technogym Shoulder Press': 'Sit upright, back against pad. Grip handles at shoulder height, elbows bent. Press handles straight up overhead until arms fully extended. Lower slowly to shoulder level.',
  'Shoulder Press': 'Stand or sit with core braced. Hold weights at shoulder height, elbows at 90°. Press weights overhead in straight path until arms extended. Lower to shoulders with control.',
  'Dumbbell Lateral Raises': 'Stand with dumbbells at sides, palms facing inward. Keep slight elbow bend (15°). Raise weights out to sides in arc until shoulder height, leading with elbows. Lower slowly along same path.',
  'Lateral Raises': 'Core engaged, slight forward lean. Lift weights laterally, maintaining fixed elbow angle. Imagine pouring water from pitcher at top. Pause, lower under control.',
  'Front Raises': 'Stand holding weight in front of thighs. Keep arms straight with slight elbow bend. Raise weight forward and up to shoulder height. Lower slowly along same path.',
  'Rear Delt Flyes': 'Hinge forward at hips to 45°, back straight. Arms hanging with slight bend. Raise weights out to sides in wide arc, squeezing rear delts. Lead with elbows, pause at top.',

  // Leg Exercises
  'Technogym Leg Press': 'Sit in machine, back and head against pad. Place feet shoulder-width on platform. Release safety, lower platform by bending knees to 90°. Press through heels, extending legs without locking knees.',
  'Leg Press': 'Position feet hip-width apart on platform, toes slightly out. Unlock safeties, lower weight by bending knees to 90° or until hips tuck. Drive through full foot, extending legs.',
  'Technogym Leg Extension': 'Sit with back against pad, adjust ankle pad to hit shins just above ankles. Extend legs by contracting quads, lifting pad until legs straight. Squeeze at top, lower slowly.',
  'Leg Extension': 'Adjust seat so knees align with machine pivot. Secure ankles under pad. Extend legs upward focusing on quad contraction. Hold peak contraction, lower with control.',
  'Technogym Leg Curl': 'Lie face down on machine, ankles under pad, knees just off edge. Curl pad toward glutes by contracting hamstrings. Squeeze at top, lower slowly resisting weight.',
  'Leg Curl': 'Adjust machine so pad sits on lower calves. Curl legs by flexing knees, bringing pad toward glutes. Focus on hamstring contraction. Lower slowly, maintaining tension.',
  'Squats': 'Feet shoulder-width, toes slightly out. Break at hips and knees simultaneously. Lower until thighs parallel to ground, knees tracking over toes. Drive through heels, extending hips and knees to stand.',
  'Barbell Squats': 'Bar on upper traps, hands gripping outside shoulders. Brace core, break at hips. Descend by sitting back, knees tracking toes. Hit depth, drive through heels upward.',
  'Goblet Squats': 'Hold weight at chest, elbows pointing down. Stand feet shoulder-width. Squat down keeping chest up, elbows brushing inside knees. Push knees out, drive up through heels.',
  'Lunges': 'Step forward with one leg, lowering back knee toward ground. Front thigh should be parallel, shin vertical. Push through front heel to return to start. Alternate legs.',
  'Walking Lunges': 'Step forward into lunge position, back knee nearly touching ground. Push off front foot, bring back leg through to next lunge. Maintain upright torso, core engaged throughout.',

  // Arm Exercises - Biceps
  'Barbell Bicep Curls': 'Stand with feet hip-width, bar at thighs. Grip bar shoulder-width, palms up. Keep elbows pinned at sides. Curl bar up by contracting biceps until forearms vertical. Squeeze at top, lower slowly.',
  'Bicep Curls': 'Stand or sit with dumbbells at sides, palms forward. Pin elbows to sides. Curl weights up by flexing biceps, rotating pinkies slightly out at top. Squeeze, lower under control.',
  'Dumbbell Hammer Curls': 'Hold dumbbells with palms facing each other (neutral grip). Keep elbows tight to sides. Curl weights up focusing on biceps and brachialis. Lower slowly, maintaining neutral grip.',
  'Hammer Curls': 'Neutral grip throughout movement. Curl weights up while keeping upper arms stationary. Squeeze at top where thumbs near shoulders. Control descent, keep tension.',
  'Cable Curls': 'Stand facing low cable, grip handle with palm up. Step back for tension. Keep elbow at side, curl handle up by contracting bicep. Peak squeeze at top, resist cable on descent.',
  'Preacher Curls': 'Sit at preacher bench, upper arms resting on angled pad. Grip bar with palms up, arms extended. Curl weight up using only biceps. Lower slowly until arms nearly straight.',

  // Arm Exercises - Triceps
  'Dumbbell Tricep Extensions': 'Stand or sit holding dumbbell overhead with both hands. Keep elbows pointing forward, lower weight behind head by bending elbows. Extend arms back to overhead position by contracting triceps. Keep upper arms stationary.',
  'Tricep Extensions': 'Hold weight overhead with arms extended. Lower weight behind head by bending elbows to 90°, keeping upper arms vertical. Extend arms back up by squeezing triceps. Control descent.',
  'Cable Tricep Pushdowns': 'Stand facing cable machine, grip bar with palms down. Keep elbows pinned at sides. Push bar down by extending elbows until arms straight. Squeeze triceps at bottom. Return to start with control.',
  'Tricep Pushdowns': 'Grip handle at chest height, elbows bent 90°. Push handle straight down by extending elbows, keeping upper arms stationary. Full extension at bottom. Resist cable on return.',
  'Skull Crushers': 'Lie on bench holding bar above chest, arms extended. Keep upper arms vertical, lower bar toward forehead by bending elbows. Stop just before bar touches head. Extend arms back up, squeezing triceps.',
  'Dips': 'Grip parallel bars, support body with arms extended. Lean forward slightly. Lower body by bending elbows to 90°, keeping elbows close to body. Press back up to start position.',

  // Core Exercises
  'Cable Crunches': 'Kneel facing high cable, holding rope behind head at neck. Keep hips stationary. Crunch down by contracting abs, bringing elbows toward knees. Squeeze abs hard at bottom. Return slowly under control.',
  'Crunches': 'Lie on back, knees bent, feet flat, hands behind head. Lift shoulder blades off ground by contracting abs, bringing ribcage toward pelvis. Squeeze abs at top. Lower shoulders slowly.',
  'Sit-ups': 'Lie on back with knees bent, feet secured. Place hands behind head. Contract abs to lift torso off ground, coming to sitting position. Lower back down vertebra by vertebra with control.',
  'Planks': 'Position forearms on ground, elbows under shoulders. Extend legs, balancing on toes. Create straight line from head to heels. Engage abs, squeeze glutes. Hold position breathing steadily.',
  'Russian Twists': 'Sit with knees bent, feet slightly elevated. Lean back 45°, hold weight at chest. Rotate torso left and right, touching weight to ground each side. Keep core engaged throughout.',
  'Leg Raises': 'Lie flat on back, hands under glutes for support. Keep legs straight. Lift legs up to 90° angle by contracting lower abs. Lower slowly to just above ground. Maintain lower back contact with floor.',

  // Bodyweight Exercises
  'Pull-ups': 'Hang from bar with hands shoulder-width apart, palms facing away. Pull body up by driving elbows down and squeezing lats. Continue until chin clears bar. Lower slowly with control.',
  'Chin-ups': 'Grip bar with palms facing toward you, hands shoulder-width. Hang with arms extended. Pull body up by contracting biceps and lats. Get chin over bar. Lower to full arm extension.',
  'Push-ups': 'Start in plank position, hands directly under shoulders. Lower body by bending elbows to 90°, keeping body straight. Chest nearly touches ground. Press back up by extending arms.',
  'Diamond Push-ups': 'Hands close together forming diamond shape with index fingers and thumbs. Lower chest toward hands, elbows pointing back. Press up by extending arms. Emphasizes triceps.',
  'Wide Push-ups': 'Hands positioned 6-12 inches wider than shoulders. Lower chest between hands, elbows flaring outward. Press up to start. Targets outer chest.',
  'Pike Push-ups': 'Start in downward dog position with hips high, legs straight. Bend elbows to lower head toward ground between hands. Press back up. Targets shoulders.',
  'Bodyweight Squats': 'Stand feet shoulder-width, toes slightly out. Initiate by pushing hips back. Lower until thighs parallel to ground, knees tracking toes. Drive through heels to stand, squeezing glutes at top.',
  'Jump Squats': 'Squat down to parallel position. Explosively drive up through feet, jumping off ground. Land softly with knees bent. Immediately descend into next rep.',
  'Burpees': 'Start standing. Drop to squat, place hands on ground. Jump feet back to plank. Perform push-up. Jump feet to hands. Explosively jump up with arms overhead.',
  'Mountain Climbers': 'Start in plank position, hands under shoulders, body straight. Drive right knee toward chest, quickly switch to left knee. Alternate rapidly, maintaining plank position throughout.',
  'Jumping Jacks': 'Stand with feet together, arms at sides. Jump while spreading feet wide and raising arms overhead. Jump again to return to start. Maintain steady rhythm.',
  'High Knees': 'Stand tall, core engaged. Run in place driving knees up to waist height. Pump arms in running motion. Move quickly, staying on balls of feet.',

  // Cardio
  'Treadmill': 'Set desired speed and incline. Step on belt. Walk or run with natural gait, landing mid-foot. Keep shoulders back, core engaged. Arms swing naturally. Breathe rhythmically.',
  'Elliptical': 'Place feet on pedals, grip handles. Push pedals in elliptical motion, pulling and pushing handles. Maintain upright posture. Adjust resistance and incline as needed.',
  'Stationary Bike': 'Adjust seat height so knee has slight bend at bottom of pedal stroke. Sit upright, grip handles lightly. Pedal in smooth circles. Adjust resistance for desired intensity.',
  'Rowing Machine': 'Sit with feet strapped in, knees bent, arms extended. Drive through legs, lean back slightly, pull handle to lower ribs. Extend arms, lean forward, bend knees in that order.',

  // Other
  'Box Jumps': 'Stand facing box at arm\'s length. Swing arms back, bend knees slightly. Explosively jump up, landing softly on box with both feet. Stand fully. Step down carefully.',
  'Jump Rope': 'Hold rope handles at hip height. Rotate rope using wrists, not arms. Jump just high enough for rope to pass under feet (1-2 inches). Land on balls of feet. Maintain steady rhythm.',
  'Battle Ropes': 'Stand with feet shoulder-width, knees slightly bent. Grip rope ends. Create waves by alternating arm movements up and down. Keep core tight, slight forward lean.',
  'Kettlebell Swings': 'Stand with feet wider than shoulders, kettlebell between feet. Hinge at hips, grip bell. Drive hips forward explosively, swinging bell to chest height. Control descent.',
  'Medicine Ball Slams': 'Stand with feet shoulder-width, hold ball overhead with arms extended. Engage core, forcefully slam ball to ground. Catch on bounce or pick up. Repeat explosively.',
};

export function getExerciseInstruction(exerciseName: string): string {
  // Try exact match first
  if (EXERCISE_INSTRUCTIONS[exerciseName]) {
    return EXERCISE_INSTRUCTIONS[exerciseName];
  }

  // Try partial match (for variations)
  for (const key in EXERCISE_INSTRUCTIONS) {
    if (exerciseName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(exerciseName.toLowerCase())) {
      return EXERCISE_INSTRUCTIONS[key];
    }
  }

  // Default instruction with detailed guidance
  return 'Set up in starting position with stable base. Move weight through full range of motion in controlled manner. Focus on target muscle engagement. Breathe out during exertion phase, in during return. Maintain tension throughout movement.';
}
