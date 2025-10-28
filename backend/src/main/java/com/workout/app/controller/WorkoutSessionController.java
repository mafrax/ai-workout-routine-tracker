package com.workout.app.controller;

import com.workout.app.dto.CreateWorkoutSessionRequest;
import com.workout.app.dto.ProgressSummary;
import com.workout.app.entity.User;
import com.workout.app.entity.WorkoutPlan;
import com.workout.app.entity.WorkoutSession;
import com.workout.app.repository.UserRepository;
import com.workout.app.repository.WorkoutPlanRepository;
import com.workout.app.repository.WorkoutSessionRepository;
import com.workout.app.service.WorkoutService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class WorkoutSessionController {

    private final WorkoutSessionRepository workoutSessionRepository;
    private final WorkoutService workoutService;
    private final UserRepository userRepository;
    private final WorkoutPlanRepository workoutPlanRepository;

    public WorkoutSessionController(WorkoutSessionRepository workoutSessionRepository,
                                     WorkoutService workoutService,
                                     UserRepository userRepository,
                                     WorkoutPlanRepository workoutPlanRepository) {
        this.workoutSessionRepository = workoutSessionRepository;
        this.workoutService = workoutService;
        this.userRepository = userRepository;
        this.workoutPlanRepository = workoutPlanRepository;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<WorkoutSession>> getUserSessions(@PathVariable Long userId) {
        List<WorkoutSession> sessions = workoutSessionRepository
                .findByUserIdOrderBySessionDateDesc(userId);
        return ResponseEntity.ok(sessions);
    }

    @PostMapping
    public ResponseEntity<WorkoutSession> createSession(@RequestBody CreateWorkoutSessionRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        WorkoutSession session = new WorkoutSession();
        session.setUser(user);

        if (request.getWorkoutPlanId() != null) {
            WorkoutPlan workoutPlan = workoutPlanRepository.findById(request.getWorkoutPlanId())
                    .orElseThrow(() -> new RuntimeException("Workout plan not found"));
            session.setWorkoutPlan(workoutPlan);
        }

        session.setSessionDate(request.getSessionDate());
        session.setDurationMinutes(request.getDurationMinutes());
        session.setExercises(request.getExercises());
        session.setCompletionRate(request.getCompletionRate());
        session.setDifficultyRating(request.getDifficultyRating());
        session.setNotes(request.getNotes());

        WorkoutSession savedSession = workoutSessionRepository.save(session);
        return ResponseEntity.ok(savedSession);
    }

    @GetMapping("/user/{userId}/progress")
    public ResponseEntity<ProgressSummary> getUserProgress(@PathVariable Long userId) {
        ProgressSummary progress = workoutService.calculateProgress(userId);
        return ResponseEntity.ok(progress);
    }
}
