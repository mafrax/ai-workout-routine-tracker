package com.workout.app.controller;

import com.workout.app.dto.ChatRequest;
import com.workout.app.dto.ChatResponse;
import com.workout.app.service.WorkoutService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final WorkoutService workoutService;

    public ChatController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @PostMapping
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        ChatResponse response = workoutService.chat(request);
        return ResponseEntity.ok(response);
    }
}
