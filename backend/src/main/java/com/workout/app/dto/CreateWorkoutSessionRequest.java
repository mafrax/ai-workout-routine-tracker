package com.workout.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateWorkoutSessionRequest {
    private Long userId;
    private Long workoutPlanId;
    private LocalDateTime sessionDate;
    private Integer durationMinutes;
    private String exercises; // JSON string containing exercises performed
    private Double completionRate; // 0.0 to 1.0
    private Integer difficultyRating; // 1-10 scale
    private String notes;
}
