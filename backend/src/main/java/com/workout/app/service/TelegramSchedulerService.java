package com.workout.app.service;

import com.workout.app.entity.DailyTask;
import com.workout.app.entity.TelegramConfig;
import com.workout.app.entity.WorkoutPlan;
import com.workout.app.repository.TelegramConfigRepository;
import com.workout.app.repository.UserRepository;
import com.workout.app.repository.WorkoutPlanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TelegramSchedulerService {

    private static final Logger logger = LoggerFactory.getLogger(TelegramSchedulerService.class);

    @Autowired
    private DailyTaskService dailyTaskService;

    @Autowired
    private TelegramService telegramService;

    @Autowired
    private TelegramConfigRepository telegramConfigRepository;

    @Autowired
    private WorkoutPlanRepository workoutPlanRepository;

    // Run every hour
    @Scheduled(cron = "0 0 * * * *")
    public void checkAndSendTaskReminders() {
        logger.info("Checking for task reminders to send...");

        List<TelegramConfig> allConfigs = telegramConfigRepository.findAll();

        for (TelegramConfig config : allConfigs) {
            try {
                checkAndSendForUser(config);
            } catch (Exception e) {
                logger.error("Error processing reminders for user {}", config.getUserId(), e);
            }
        }
    }

    // Run at the top of every hour
    @Scheduled(cron = "0 0 * * * *")
    public void checkAndSendWorkoutPreviews() {
        logger.info("Checking for workout previews to send...");

        int currentHour = LocalDateTime.now().getHour();

        List<WorkoutPlan> plansToPreview = workoutPlanRepository.findAll().stream()
                .filter(plan -> plan.getTelegramPreviewHour() != null)
                .filter(plan -> plan.getTelegramPreviewHour() == currentHour)
                .filter(WorkoutPlan::isActive)
                .filter(plan -> !plan.isArchived())
                .toList();

        for (WorkoutPlan plan : plansToPreview) {
            try {
                sendWorkoutPreviewForPlan(plan);
            } catch (Exception e) {
                logger.error("Error sending workout preview for plan {}", plan.getId(), e);
            }
        }
    }

    // Run at midnight every day
    @Scheduled(cron = "0 0 0 * * *")
    public void resetDailyTasks() {
        logger.info("Resetting all daily tasks at midnight...");

        List<TelegramConfig> allConfigs = telegramConfigRepository.findAll();

        for (TelegramConfig config : allConfigs) {
            try {
                dailyTaskService.resetAllTasks(config.getUserId());
                logger.info("Reset tasks for user {}", config.getUserId());
            } catch (Exception e) {
                logger.error("Error resetting tasks for user {}", config.getUserId(), e);
            }
        }
    }

    private void checkAndSendForUser(TelegramConfig config) {
        Long userId = config.getUserId();
        int currentHour = LocalDateTime.now().getHour();
        int startHour = config.getDailyTasksStartHour() != null ? config.getDailyTasksStartHour() : 9;

        // Check if we're in the reminder window (start hour to 8 PM)
        if (currentHour < startHour || currentHour > 20) {
            return;
        }

        // Get reminder schedule
        List<Integer> schedule = generateReminderSchedule(startHour);

        // Check if current hour is in the schedule
        if (!schedule.contains(currentHour)) {
            return;
        }

        // Check if we already sent a reminder this hour
        LocalDateTime lastSent = config.getLastTaskReminderSent();
        if (lastSent != null) {
            Duration timeSinceLastReminder = Duration.between(lastSent, LocalDateTime.now());
            if (timeSinceLastReminder.toMinutes() < 55) {
                // Already sent in the last 55 minutes, skip
                return;
            }
        }

        // Get incomplete tasks
        List<DailyTask> incompleteTasks = dailyTaskService.getIncompleteTasks(userId);

        if (incompleteTasks.isEmpty()) {
            logger.info("No incomplete tasks for user {}, skipping reminder", userId);
            return;
        }

        // Send reminder
        boolean sent = telegramService.sendTaskReminder(userId, incompleteTasks);

        if (sent) {
            logger.info("Sent task reminder to user {} with {} tasks", userId, incompleteTasks.size());
        }
    }

    private void sendWorkoutPreviewForPlan(WorkoutPlan plan) {
        String planDetails = plan.getPlanDetails();

        if (planDetails == null || planDetails.trim().isEmpty()) {
            logger.warn("No plan details for plan {}", plan.getId());
            return;
        }

        // Parse next workout
        List<Workout> workouts = parseNextWorkouts(planDetails, 1);

        if (workouts.isEmpty()) {
            logger.warn("No workouts found in plan {}", plan.getId());
            return;
        }

        Workout nextWorkout = workouts.get(0);

        boolean sent = telegramService.sendWorkoutPreview(
                plan.getUserId(),
                plan.getName(),
                nextWorkout.day,
                nextWorkout.exercises
        );

        if (sent) {
            logger.info("Sent workout preview for plan {} to user {}", plan.getId(), plan.getUserId());
        }
    }

    private List<Integer> generateReminderSchedule(int startHour) {
        List<Integer> schedule = new ArrayList<>();
        schedule.add(startHour);

        int currentHour = startHour;

        // First two reminders: every 2 hours
        currentHour += 2;
        if (currentHour <= 20) schedule.add(currentHour);
        currentHour += 2;
        if (currentHour <= 20) schedule.add(currentHour);

        // Remaining reminders: every 1 hour (increasing frequency)
        while (currentHour < 20) {
            currentHour += 1;
            schedule.add(currentHour);
        }

        return schedule;
    }

    private List<Workout> parseNextWorkouts(String planDetails, int count) {
        List<Workout> workouts = new ArrayList<>();
        String[] lines = planDetails.split("\n");

        String currentDay = null;
        List<String> currentExercises = new ArrayList<>();

        Pattern dayPattern = Pattern.compile("^(Day \\d+|\\w+day)\\s*:?\\s*(.*)$", Pattern.CASE_INSENSITIVE);
        Pattern exercisePattern = Pattern.compile("^\\s*-\\s*(.+)$");

        for (String line : lines) {
            line = line.trim();

            if (line.isEmpty()) {
                if (currentDay != null && !currentExercises.isEmpty()) {
                    workouts.add(new Workout(currentDay, currentExercises));
                    currentDay = null;
                    currentExercises = new ArrayList<>();

                    if (workouts.size() >= count) {
                        break;
                    }
                }
                continue;
            }

            Matcher dayMatcher = dayPattern.matcher(line);
            if (dayMatcher.matches()) {
                if (currentDay != null && !currentExercises.isEmpty()) {
                    workouts.add(new Workout(currentDay, currentExercises));

                    if (workouts.size() >= count) {
                        break;
                    }
                }

                currentDay = dayMatcher.group(1);
                String restOfLine = dayMatcher.group(2);
                currentExercises = new ArrayList<>();

                if (!restOfLine.isEmpty()) {
                    currentExercises.add(restOfLine);
                }
                continue;
            }

            Matcher exerciseMatcher = exercisePattern.matcher(line);
            if (exerciseMatcher.matches() && currentDay != null) {
                currentExercises.add(exerciseMatcher.group(1).trim());
            }
        }

        if (currentDay != null && !currentExercises.isEmpty() && workouts.size() < count) {
            workouts.add(new Workout(currentDay, currentExercises));
        }

        return workouts;
    }

    private static class Workout {
        String day;
        List<String> exercises;

        Workout(String day, List<String> exercises) {
            this.day = day;
            this.exercises = new ArrayList<>(exercises);
        }
    }
}
