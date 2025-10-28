package com.workout.app.dto;

import lombok.Data;

@Data
public class CreateWorkoutPlanRequest {
    private Long userId;
    private String name;
    private String description;
    private Integer durationWeeks;
    private Integer daysPerWeek;
    private String planDetails;
    private String difficultyLevel;
    private Boolean isActive;
}
