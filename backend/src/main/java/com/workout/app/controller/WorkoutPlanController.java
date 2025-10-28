package com.workout.app.controller;

import com.workout.app.dto.CreateWorkoutPlanRequest;
import com.workout.app.dto.UpdateExerciseWeightRequest;
import com.workout.app.entity.User;
import com.workout.app.entity.WorkoutPlan;
import com.workout.app.repository.UserRepository;
import com.workout.app.repository.WorkoutPlanRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/plans")
public class WorkoutPlanController {

    private final WorkoutPlanRepository workoutPlanRepository;
    private final UserRepository userRepository;

    public WorkoutPlanController(WorkoutPlanRepository workoutPlanRepository,
                                  UserRepository userRepository) {
        this.workoutPlanRepository = workoutPlanRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<WorkoutPlan>> getUserPlans(@PathVariable Long userId) {
        List<WorkoutPlan> plans = workoutPlanRepository.findByUserId(userId);
        return ResponseEntity.ok(plans);
    }

    @GetMapping("/user/{userId}/active")
    public ResponseEntity<WorkoutPlan> getActivePlan(@PathVariable Long userId) {
        return workoutPlanRepository.findByUserIdAndIsActive(userId, true)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<WorkoutPlan> createPlan(@RequestBody CreateWorkoutPlanRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        WorkoutPlan plan = new WorkoutPlan();
        plan.setUser(user);
        plan.setName(request.getName());
        plan.setDescription(request.getDescription());
        plan.setDurationWeeks(request.getDurationWeeks());
        plan.setDaysPerWeek(request.getDaysPerWeek());
        plan.setPlanDetails(request.getPlanDetails());
        plan.setDifficultyLevel(request.getDifficultyLevel());
        plan.setIsActive(request.getIsActive() != null ? request.getIsActive() : false);

        WorkoutPlan savedPlan = workoutPlanRepository.save(plan);
        return ResponseEntity.ok(savedPlan);
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<WorkoutPlan> activatePlan(@PathVariable Long id) {
        return workoutPlanRepository.findById(id)
                .map(plan -> {
                    // Deactivate other plans for this user
                    workoutPlanRepository.findByUserId(plan.getUser().getId())
                            .forEach(p -> {
                                p.setIsActive(false);
                                workoutPlanRepository.save(p);
                            });

                    // Activate this plan
                    plan.setIsActive(true);
                    return ResponseEntity.ok(workoutPlanRepository.save(plan));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkoutPlan> updatePlan(@PathVariable Long id, @RequestBody CreateWorkoutPlanRequest request) {
        return workoutPlanRepository.findById(id)
                .map(plan -> {
                    if (request.getName() != null) plan.setName(request.getName());
                    if (request.getDescription() != null) plan.setDescription(request.getDescription());
                    if (request.getDurationWeeks() != null) plan.setDurationWeeks(request.getDurationWeeks());
                    if (request.getDaysPerWeek() != null) plan.setDaysPerWeek(request.getDaysPerWeek());
                    if (request.getPlanDetails() != null) plan.setPlanDetails(request.getPlanDetails());
                    if (request.getDifficultyLevel() != null) plan.setDifficultyLevel(request.getDifficultyLevel());

                    return ResponseEntity.ok(workoutPlanRepository.save(plan));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/update-exercise-weight")
    public ResponseEntity<WorkoutPlan> updateExerciseWeight(@PathVariable Long id,
                                                             @RequestBody UpdateExerciseWeightRequest request) {
        return workoutPlanRepository.findById(id)
                .map(plan -> {
                    String planDetails = plan.getPlanDetails();
                    String exerciseName = request.getExerciseName();
                    String newWeight = request.getNewWeight();

                    // Pattern to match exercise lines: "ExerciseName - SetsxReps @ Weight | RestSets | RestNext"
                    // We need to replace the weight portion for matching exercise names
                    String regex = "(" + Pattern.quote(exerciseName) + "\\s*-\\s*\\d+x[\\d-]+\\s*@\\s*)([^|]+)(\\s*\\|.*)";
                    Pattern pattern = Pattern.compile(regex, Pattern.MULTILINE);
                    Matcher matcher = pattern.matcher(planDetails);

                    String updatedDetails = matcher.replaceAll("$1" + newWeight + "$3");
                    plan.setPlanDetails(updatedDetails);

                    return ResponseEntity.ok(workoutPlanRepository.save(plan));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
