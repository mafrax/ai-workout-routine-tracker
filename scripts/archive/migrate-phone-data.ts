import prisma from '../src/lib/database';

// Data extracted from phone logs
const phoneData = {
  user: {
    id: 1761044697964,
    name: "marc",
    email: "mongin.marc@gmail.com",
    age: 35,
    weight: 104,
    height: 185,
    fitnessLevel: "intermediate",
    goals: ["Build Muscle", "Lose Weight", "Improve Strength", "General Fitness"],
    availableEquipment: [
      "Technogym Chest Press",
      "Technogym Leg Press",
      "Technogym Lat Pulldown",
      "Technogym Cable Machine",
      "Technogym Leg Extension",
      "Technogym Leg Curl",
      "Technogym Shoulder Press",
      "Dumbbells",
      "Barbells",
      "Kettlebells",
      "Pull-up Bar",
      "Cable Machine"
    ],
    bodyweightExercises: [
      { name: "Pull-ups", maxReps: 3 },
      { name: "Push-ups", maxReps: 20 },
      { name: "Negative Pull-ups", maxReps: 5 }
    ]
  },
  telegramConfig: {
    botToken: "8279148891:AAEsSiH5oWpGQJR_8K3z_p1FSC2EcF1nOb0",
    chatId: "6820272841",
    dailyTasksStartHour: 9
  },
  dailyTasks: [
    { title: "duolingo", completed: false },
    { title: "aws certification", completed: false },
    { title: "morning workout", completed: false },
    { title: "normal workout", completed: false }
  ],
  workoutPlan: {
    name: "Hypertrophy Max",
    description: "A classic body-part split focusing on muscle hypertrophy and strength gains. Incorporates progressive overload principles with moderate-to-high volume training.",
    durationWeeks: 10,
    daysPerWeek: 4,
    difficultyLevel: "intermediate",
    isActive: true,
    planDetails: `Day 1 - Chest & Triceps:
1. Pull-ups - 2x1 @ bodyweight | 120s rest (regular)
2. Negative Pull-ups - 2x3 @ bodyweight (5s lower) | 120s rest
3. Push-ups - 4x12 @ bodyweight | 60s | 90s
4. Technogym Chest Press - 4x10 @ 55kg| 90s | 90s
5. Incline Dumbbell Press - 3x12 @ 16kg| 60s | 90s
6. Cable Triceps Pushdown - 3x15 @ 17.5kg| 60s | 90s
7. Push-ups Close Grip - 3x10 @ 1kg| 60s | 90s
8. Technogym Cable Machine Flyes - 3x15 @ 15kg | 60s | 90s
9. Triceps Rope Extension - 3x12 @ 20kg | 60s | 0s

Day 2 - Back & Biceps:
1. Pull-ups - 3x2 @ bodyweight | 120s rest (regular)
2. Negative Pull-ups - 2x3 @ bodyweight (5s lower) | 120s rest
3. Technogym Lat Pulldown - 4x10 @ 45kg | 90s | 120s
4. Barbell Bent Over Rows - 4x12 @ 30kg| 90s | 120s
5. Vertical Traction Technogym - 3x12 @ 60kg| 90s | 120s
6. Cable Bicep Curls - 3x12 @ 20kg | 60s | 90s
7. Dumbbell Hammer Curls - 3x12 @ 10kg | 60s | 0s

Day 3 - Legs:
1. Negative Pull-ups - 2x3 @ bodyweight (5s lower) | 120s rest
2. Push-ups - 3x12 @ bodyweight | 60s | 90s
3. Technogym Leg Press - 4x10 @ 120kg| 90s | 120s
4. Technogym Leg Extension - 3x12 @ 50kg| 60s | 90s
5. Technogym Leg Curl - 3x12 @ 45kg| 60s | 90s
6. Bodyweight Squats - 3x15 @ bodyweight | 60s | 0s

Day 4 - Shoulders & Core:
1. Pull-ups - 2x1 @ bodyweight | 120s rest (regular)
2. Negative Pull-ups - 2x3 @ bodyweight (5s lower) | 120s rest
3. Push-ups - 3x12 @ bodyweight | 60s | 90s
4. Technogym Shoulder Press - 4x12 @ 35kg| 90s | 120s
5. Dumbbell Lateral Raises - 3x15 @ 6kg| 60s | 90s
6. Cable Face Pulls - 3x15 @ 18kg| 60s | 90s
7. Plank Push-ups - 3x10 @ bodyweight | 60s | 90s
8. Kettlebell Standing Press - 3x12 @ 12kg| 60s | 90s
9. Cable Wood Chops - 3x15 @ 15kg| 45s | 60s
10. Dumbbell Front Raises - 3x12 @ 10kg | 60s | 0s`,
    completedWorkouts: [1, 2, 3, 4] // Days that have been completed
  }
};

async function migratePhoneData() {
  console.log('🚀 Starting phone data migration...\n');
  console.log('📝 Migrating phone data (ID: 1761044697964) to OAuth user (ID: 1)\n');

  try {
    await prisma.$transaction(async (tx) => {
      // Use OAuth user ID (1) instead of phone user ID
      const userId = BigInt(1);

      // 1. Update or create user with profile data
      console.log('👤 Migrating user profile...');
      await tx.user.upsert({
        where: { id: userId },
        update: {
          name: phoneData.user.name,
          email: phoneData.user.email,
          age: phoneData.user.age,
          weight: phoneData.user.weight,
          height: phoneData.user.height,
          fitnessLevel: phoneData.user.fitnessLevel,
          goals: JSON.stringify(phoneData.user.goals),
          availableEquipment: JSON.stringify(phoneData.user.availableEquipment),
          bodyweightExercises: JSON.stringify(phoneData.user.bodyweightExercises),
          lastLogin: new Date()
        },
        create: {
          id: userId,
          name: phoneData.user.name,
          email: phoneData.user.email,
          age: phoneData.user.age,
          weight: phoneData.user.weight,
          height: phoneData.user.height,
          fitnessLevel: phoneData.user.fitnessLevel,
          goals: JSON.stringify(phoneData.user.goals),
          availableEquipment: JSON.stringify(phoneData.user.availableEquipment),
          bodyweightExercises: JSON.stringify(phoneData.user.bodyweightExercises),
          createdAt: new Date(),
          lastLogin: new Date()
        }
      });
      console.log('✅ User profile migrated');

      // 2. Migrate telegram config
      console.log('\n📱 Migrating Telegram config...');
      await tx.telegramConfig.upsert({
        where: { userId },
        update: {
          botToken: phoneData.telegramConfig.botToken,
          chatId: phoneData.telegramConfig.chatId,
          dailyTasksStartHour: phoneData.telegramConfig.dailyTasksStartHour
        },
        create: {
          userId,
          botToken: phoneData.telegramConfig.botToken,
          chatId: phoneData.telegramConfig.chatId,
          dailyTasksStartHour: phoneData.telegramConfig.dailyTasksStartHour,
          createdAt: new Date()
        }
      });
      console.log('✅ Telegram config migrated');

      // 3. Migrate daily tasks
      console.log('\n📋 Migrating daily tasks...');
      // Clear existing tasks
      await tx.dailyTask.deleteMany({
        where: { userId }
      });
      // Create new tasks
      for (const task of phoneData.dailyTasks) {
        await tx.dailyTask.create({
          data: {
            userId,
            title: task.title,
            completed: task.completed,
            createdAt: new Date()
          }
        });
      }
      console.log(`✅ Migrated ${phoneData.dailyTasks.length} daily tasks`);

      // 4. Migrate workout plan
      console.log('\n💪 Migrating workout plan...');
      // Clear existing plans for this user
      await tx.workoutPlan.deleteMany({
        where: { userId }
      });

      const plan = await tx.workoutPlan.create({
        data: {
          userId,
          name: phoneData.workoutPlan.name,
          planDetails: phoneData.workoutPlan.planDetails,
          isActive: phoneData.workoutPlan.isActive,
          isArchived: false,
          completedWorkouts: JSON.stringify(phoneData.workoutPlan.completedWorkouts),
          createdAt: new Date()
        }
      });
      console.log(`✅ Workout plan "${plan.name}" migrated`);
    });

    console.log('\n✨ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`- User: ${phoneData.user.name} (${phoneData.user.email})`);
    console.log(`- Equipment: ${phoneData.user.availableEquipment.length} items`);
    console.log(`- Bodyweight exercises: ${phoneData.user.bodyweightExercises.length} exercises`);
    console.log(`- Daily tasks: ${phoneData.dailyTasks.length} tasks`);
    console.log(`- Workout plan: "${phoneData.workoutPlan.name}"`);
    console.log(`- Completed workouts: ${phoneData.workoutPlan.completedWorkouts.length} days`);
    console.log(`- Telegram: Configured ✓`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migratePhoneData()
  .then(() => {
    console.log('\n🎉 All done! Your data is now in the database.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
