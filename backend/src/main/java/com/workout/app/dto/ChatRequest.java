package com.workout.app.dto;

import lombok.Data;

@Data
public class ChatRequest {
    private Long userId;
    private String message;
    private String sessionId;
}
