import prisma from './src/lib/database';
import { DailyTaskService } from './src/services/DailyTaskService';

async function testDailyTasks() {
  try {
    console.log('🔍 Checking for users...');

    // Get or create a user
    let user = await prisma.user.findFirst();

    if (!user) {
      console.log('📝 Creating test user...');
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });
      console.log(`✅ Created user with ID: ${user.id}`);
    } else {
      console.log(`✅ Found user with ID: ${user.id}`);
    }

    const dailyTaskService = new DailyTaskService();
    const userId = user.id;

    console.log('\n📋 Testing Daily Tasks Service...\n');

    // 1. Create a task
    console.log('1️⃣ Creating a task...');
    const task1 = await dailyTaskService.createTask(userId, 'Morning workout');
    console.log(`✅ Created task: ${task1.title} (ID: ${task1.id})`);

    // 2. Create another task
    console.log('\n2️⃣ Creating another task...');
    const task2 = await dailyTaskService.createTask(userId, 'Read for 30 minutes');
    console.log(`✅ Created task: ${task2.title} (ID: ${task2.id})`);

    // 3. Get all tasks
    console.log('\n3️⃣ Getting all tasks with stats...');
    const tasks = await dailyTaskService.getUserTasksWithStats(userId);
    console.log(`✅ Retrieved ${tasks.length} tasks:`);
    tasks.forEach(t => {
      console.log(`   - ${t.title}: streak=${t.currentStreak}, best=${t.bestStreak}, total=${t.totalCompletions}`);
    });

    // 4. Toggle first task
    console.log('\n4️⃣ Completing first task...');
    await dailyTaskService.toggleTask(task1.id);
    console.log(`✅ Task completed`);

    // 5. Get task completion dates
    console.log('\n5️⃣ Getting completion dates...');
    const completionDates = await dailyTaskService.getTaskCompletionDates(task1.id);
    console.log(`✅ Completion dates: ${completionDates.join(', ')}`);

    // 6. Get updated tasks with stats
    console.log('\n6️⃣ Getting updated tasks with stats...');
    const updatedTasks = await dailyTaskService.getUserTasksWithStats(userId);
    console.log(`✅ Retrieved ${updatedTasks.length} tasks:`);
    updatedTasks.forEach(t => {
      console.log(`   - ${t.title}: completed=${t.completed}, streak=${t.currentStreak}, best=${t.bestStreak}, total=${t.totalCompletions}`);
    });

    // 7. Get task stats
    console.log('\n7️⃣ Getting detailed task stats...');
    const taskStats = await dailyTaskService.calculateTaskStats(task1.id);
    console.log(`✅ Task stats for "${taskStats.title}":`);
    console.log(`   - Current streak: ${taskStats.currentStreak}`);
    console.log(`   - Best streak: ${taskStats.bestStreak}`);
    console.log(`   - Total completions: ${taskStats.totalCompletions}`);
    console.log(`   - Last completed: ${taskStats.lastCompletedDate}`);
    console.log(`   - Week rate: ${taskStats.weekRate.toFixed(1)}%`);
    console.log(`   - Month rate: ${taskStats.monthRate.toFixed(1)}%`);
    console.log(`   - Year rate: ${taskStats.yearRate.toFixed(1)}%`);

    // 8. Get aggregate stats
    console.log('\n8️⃣ Getting aggregate stats...');
    const aggregateStats = await dailyTaskService.calculateAggregateStats(userId);
    console.log(`✅ Aggregate stats:`);
    console.log(`   - Total tasks: ${aggregateStats.totalTasks}`);
    console.log(`   - Active days streak: ${aggregateStats.activeDaysStreak}`);
    console.log(`   - Perfect days: ${aggregateStats.perfectDays}`);
    console.log(`   - Week rate: ${aggregateStats.weekRate.toFixed(1)}%`);
    console.log(`   - Month rate: ${aggregateStats.monthRate.toFixed(1)}%`);
    console.log(`   - Year rate: ${aggregateStats.yearRate.toFixed(1)}%`);

    console.log('\n✨ All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testDailyTasks();
