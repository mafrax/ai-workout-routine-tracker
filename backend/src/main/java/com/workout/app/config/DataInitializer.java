package com.workout.app.config;

import com.workout.app.entity.User;
import com.workout.app.entity.WorkoutPlan;
import com.workout.app.entity.WorkoutSession;
import com.workout.app.repository.UserRepository;
import com.workout.app.repository.WorkoutPlanRepository;
import com.workout.app.repository.WorkoutSessionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.Arrays;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository,
                                   WorkoutPlanRepository workoutPlanRepository,
                                   WorkoutSessionRepository workoutSessionRepository) {
        return args -> {
            // Create test user
            User user = new User();
            user.setEmail("mongin.marc@gmail.com");
            user.setName("Marc");
            user.setAge(104);
            user.setGender("Male");
            user.setWeight(104.0);
            user.setHeight(185.0);
            user.setFitnessLevel("intermediate");
            user.setAvailableEquipment(Arrays.asList(
                "Treadmill (Technogym)",
                "Elliptical (Technogym)",
                "Stationary Bike (Technogym)",
                "Rowing Machine (Technogym)",
                "Dumbbells",
                "Barbells",
                "Kettlebells",
                "Weight Plates",
                "Technogym Chest Press",
                "Technogym Leg Press",
                "Technogym Cable Machine",
                "Technogym Lat Pulldown",
                "Technogym Leg Extension",
                "Technogym Leg Curl",
                "Technogym Shoulder Press",
                "Technogym Smith Machine",
                "Pull-up Bar"
            ));
            user.setGoals(Arrays.asList(
                "Build Muscle",
                "Lose Weight",
                "Improve Strength",
                "General Fitness"
            ));
            user = userRepository.save(user);

            // Create workout plan
            WorkoutPlan plan = new WorkoutPlan();
            plan.setUser(user);
            plan.setName("Hybrid Power-Endurance");
            plan.setDescription("Combines strength training with cardio circuits for optimal fat loss and muscle maintenance. Incorporates supersets to maintain elevated heart rate and maximize workout efficiency.");
            plan.setDurationWeeks(10);
            plan.setDaysPerWeek(4);
            plan.setDifficultyLevel("Intermediate");
            plan.setIsActive(true);
            plan.setPlanDetails("\nName: Hybrid Power-Endurance\n" +
                "Duration: 10 weeks\n" +
                "Days Per Week: 4\n" +
                "Difficulty: Intermediate\n" +
                "Description: Combines strength training with cardio circuits for optimal fat loss and muscle maintenance. Incorporates supersets to maintain elevated heart rate and maximize workout efficiency.\n\n" +
                "Weekly Structure - Week 1:\n\n" +
                "Day 1 - Push Focus:\n" +
                "1. Technogym Chest Press - 4x10 @ 50-60% 1RM | 60s | 90s\n" +
                "2. Technogym Shoulder Press - 4x10 @ 40-50kg | 60s | 90s\n" +
                "Superset:\n" +
                "3a. Dumbbell Lateral Raises - 3x12 @ 6-8kg | 30s | 0s\n" +
                "3b. Cable Tricep Pushdowns - 3x12 @ 25-30kg | 60s | 90s\n" +
                "4. Rowing Machine - 10 minutes HIIT (30s hard/30s easy)\n\n" +
                "Day 2 - Pull Focus:\n" +
                "1. Technogym Lat Pulldown - 4x10 @ 45-55kg | 60s | 90s\n" +
                "2. Cable Rows - 4x10 @ 40-50kg | 60s | 90s\n" +
                "Superset:\n" +
                "3a. Face Pulls - 3x15 @ 20-25kg | 30s | 0s\n" +
                "3b. Dumbbell Bicep Curls - 3x12 @ 8-12kg | 60s | 90s\n" +
                "4. Treadmill - 12 minutes incline walk\n\n" +
                "Day 3 - Legs Focus:\n" +
                "1. Technogym Leg Press - 4x12 @ 70-80kg | 90s | 120s\n" +
                "2. Leg Extensions - 3x15 @ 30-40kg | 60s | 90s\n" +
                "Superset:\n" +
                "3a. Leg Curls - 3x12 @ 25-35kg | 30s | 0s\n" +
                "3b. Kettlebell Walking Lunges - 3x10/side @ 12-16kg | 60s | 90s\n" +
                "4. Stationary Bike - 15 minutes moderate intensity\n\n" +
                "Day 4 - Full Body Circuit:\n" +
                "Circuit (3 rounds, 60s rest between rounds):\n" +
                "1. Smith Machine Squats - 12 reps @ 40-50kg\n" +
                "2. Assisted Pull-ups - 8 reps @ bodyweight-15kg\n" +
                "3. Dumbbell Push Press - 12 reps @ 10-14kg\n" +
                "4. Kettlebell Swings - 15 reps @ 16-20kg\n" +
                "5. Cable Woodchops - 12/side @ 15-20kg\n\n");
            plan = workoutPlanRepository.save(plan);

            // Create sample workout sessions (3 past sessions)
            createWorkoutSession(workoutSessionRepository, user, plan,
                LocalDateTime.now().minusDays(5), 45, 0.95, 7,
                "[{\"name\":\"Technogym Chest Press\",\"sets\":4,\"completedSets\":4,\"reps\":\"10\",\"weight\":\"55kg\"}," +
                "{\"name\":\"Technogym Shoulder Press\",\"sets\":4,\"completedSets\":4,\"reps\":\"10\",\"weight\":\"45kg\"}," +
                "{\"name\":\"Dumbbell Lateral Raises\",\"sets\":3,\"completedSets\":3,\"reps\":\"12\",\"weight\":\"7kg\"}," +
                "{\"name\":\"Cable Tricep Pushdowns\",\"sets\":3,\"completedSets\":3,\"reps\":\"12\",\"weight\":\"27.5kg\"}]",
                "Great workout! Felt strong on chest press.");

            createWorkoutSession(workoutSessionRepository, user, plan,
                LocalDateTime.now().minusDays(3), 50, 1.0, 6,
                "[{\"name\":\"Technogym Lat Pulldown\",\"sets\":4,\"completedSets\":4,\"reps\":\"10\",\"weight\":\"50kg\"}," +
                "{\"name\":\"Cable Rows\",\"sets\":4,\"completedSets\":4,\"reps\":\"10\",\"weight\":\"45kg\"}," +
                "{\"name\":\"Face Pulls\",\"sets\":3,\"completedSets\":3,\"reps\":\"15\",\"weight\":\"22.5kg\"}," +
                "{\"name\":\"Dumbbell Bicep Curls\",\"sets\":3,\"completedSets\":3,\"reps\":\"12\",\"weight\":\"10kg\"}]",
                "Back feeling good. Increased weight on rows.");

            createWorkoutSession(workoutSessionRepository, user, plan,
                LocalDateTime.now().minusDays(1), 55, 0.92, 8,
                "[{\"name\":\"Technogym Leg Press\",\"sets\":4,\"completedSets\":4,\"reps\":\"12\",\"weight\":\"75kg\"}," +
                "{\"name\":\"Leg Extensions\",\"sets\":3,\"completedSets\":3,\"reps\":\"15\",\"weight\":\"35kg\"}," +
                "{\"name\":\"Leg Curls\",\"sets\":3,\"completedSets\":3,\"reps\":\"12\",\"weight\":\"30kg\"}," +
                "{\"name\":\"Kettlebell Walking Lunges\",\"sets\":3,\"completedSets\":2,\"reps\":\"10/side\",\"weight\":\"14kg\"}]",
                "Legs are burning! Skipped last set of lunges - too fatigued.");

            System.out.println("✅ Database initialized with test data:");
            System.out.println("   - User: " + user.getEmail());
            System.out.println("   - Workout Plan: " + plan.getName());
            System.out.println("   - Workout Sessions: 3");
        };
    }

    private void createWorkoutSession(WorkoutSessionRepository repository, User user, WorkoutPlan plan,
                                      LocalDateTime sessionDate, int duration, double completionRate,
                                      int difficultyRating, String exercises, String notes) {
        WorkoutSession session = new WorkoutSession();
        session.setUser(user);
        session.setWorkoutPlan(plan);
        session.setSessionDate(sessionDate);
        session.setDurationMinutes(duration);
        session.setCompletionRate(completionRate);
        session.setDifficultyRating(difficultyRating);
        session.setExercises(exercises);
        session.setNotes(notes);
        repository.save(session);
    }
}
