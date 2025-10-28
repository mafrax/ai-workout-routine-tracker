package com.workout.app.controller;

import com.workout.app.dto.MigrationRequest;
import com.workout.app.entity.*;
import com.workout.app.repository.*;
import com.workout.app.service.TelegramService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/migration")
@CrossOrigin(origins = "*")
public class MigrationController {

    private static final Logger logger = LoggerFactory.getLogger(MigrationController.class);

    @Autowired
    private DailyTaskRepository dailyTaskRepository;

    @Autowired
    private WorkoutPlanRepository workoutPlanRepository;

    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TelegramService telegramService;

    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> migrateLocalStorage(@RequestBody MigrationRequest request) {
        logger.info("Starting migration for user {}", request.getUserId());

        Map<String, Object> result = new HashMap<>();
        int tasksCreated = 0;
        int plansCreated = 0;
        int sessionsCreated = 0;

        try {
            Long userId = request.getUserId();

            // Migrate Daily Tasks
            if (request.getTasks() != null && !request.getTasks().isEmpty()) {
                for (MigrationRequest.LocalStorageTask taskDto : request.getTasks()) {
                    DailyTask task = new DailyTask();
                    task.setUserId(userId);
                    task.setTitle(taskDto.getTitle());
                    task.setCompleted(taskDto.isCompleted());

                    // Parse createdAt
                    try {
                        LocalDateTime createdAt = LocalDateTime.parse(taskDto.getCreatedAt(), DateTimeFormatter.ISO_DATE_TIME);
                        task.setCreatedAt(createdAt);
                    } catch (Exception e) {
                        task.setCreatedAt(LocalDateTime.now());
                    }

                    dailyTaskRepository.save(task);
                    tasksCreated++;
                }
            }

            // Migrate Workout Plans
            if (request.getWorkoutPlans() != null && !request.getWorkoutPlans().isEmpty()) {
                for (Map<String, Object> planData : request.getWorkoutPlans()) {
                    WorkoutPlan plan = new WorkoutPlan();
                    plan.setUserId(userId);
                    plan.setName((String) planData.get("name"));
                    plan.setPlanDetails((String) planData.get("planDetails"));
                    plan.setActive((Boolean) planData.getOrDefault("isActive", false));
                    plan.setArchived((Boolean) planData.getOrDefault("isArchived", false));

                    // Handle completedWorkouts
                    Object completedObj = planData.get("completedWorkouts");
                    if (completedObj instanceof List) {
                        plan.setCompletedWorkouts((List<Integer>) completedObj);
                    }

                    // Handle telegramPreviewHour
                    Object previewHour = planData.get("telegramPreviewHour");
                    if (previewHour instanceof Number) {
                        plan.setTelegramPreviewHour(((Number) previewHour).intValue());
                    }

                    // Handle dates
                    try {
                        Object createdAtObj = planData.get("createdAt");
                        if (createdAtObj != null) {
                            LocalDateTime createdAt = LocalDateTime.parse(createdAtObj.toString(), DateTimeFormatter.ISO_DATE_TIME);
                            plan.setCreatedAt(createdAt);
                        }
                    } catch (Exception e) {
                        plan.setCreatedAt(LocalDateTime.now());
                    }

                    workoutPlanRepository.save(plan);
                    plansCreated++;
                }
            }

            // Migrate Workout Sessions
            if (request.getWorkoutSessions() != null && !request.getWorkoutSessions().isEmpty()) {
                for (Map<String, Object> sessionData : request.getWorkoutSessions()) {
                    WorkoutSession session = new WorkoutSession();
                    session.setUserId(userId);

                    Object planIdObj = sessionData.get("planId");
                    if (planIdObj instanceof Number) {
                        session.setPlanId(((Number) planIdObj).longValue());
                    }

                    Object dayNumberObj = sessionData.get("dayNumber");
                    if (dayNumberObj instanceof Number) {
                        session.setDayNumber(((Number) dayNumberObj).intValue());
                    }

                    session.setSessionDate((String) sessionData.get("sessionDate"));

                    Object durationObj = sessionData.get("durationMinutes");
                    if (durationObj instanceof Number) {
                        session.setDurationMinutes(((Number) durationObj).intValue());
                    }

                    Object completionObj = sessionData.get("completionRate");
                    if (completionObj instanceof Number) {
                        session.setCompletionRate(((Number) completionObj).doubleValue());
                    }

                    session.setNotes((String) sessionData.get("notes"));

                    workoutSessionRepository.save(session);
                    sessionsCreated++;
                }
            }

            // Migrate Telegram Config
            if (request.getTelegramConfig() != null) {
                MigrationRequest.TelegramConfigDto telegramDto = request.getTelegramConfig();
                telegramService.saveUserConfig(
                        userId,
                        telegramDto.getBotToken(),
                        telegramDto.getChatId(),
                        telegramDto.getStartHour()
                );
            }

            result.put("success", true);
            result.put("tasksCreated", tasksCreated);
            result.put("plansCreated", plansCreated);
            result.put("sessionsCreated", sessionsCreated);

            logger.info("Migration completed: {} tasks, {} plans, {} sessions", tasksCreated, plansCreated, sessionsCreated);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            logger.error("Migration failed", e);
            result.put("success", false);
            result.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(result);
        }
    }
}
