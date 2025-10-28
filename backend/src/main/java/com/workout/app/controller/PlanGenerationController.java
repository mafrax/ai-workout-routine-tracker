package com.workout.app.controller;

import com.workout.app.dto.ChatRequest;
import com.workout.app.dto.ChatResponse;
import com.workout.app.service.WorkoutService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/generate-plans")
public class PlanGenerationController {

    private final WorkoutService workoutService;

    public PlanGenerationController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @PostMapping
    public ResponseEntity<ChatResponse> generatePlans(@RequestBody ChatRequest request) {
        // This uses the same chat endpoint but is semantically for initial plan generation
        ChatResponse response = workoutService.chat(request);
        return ResponseEntity.ok(response);
    }
}
