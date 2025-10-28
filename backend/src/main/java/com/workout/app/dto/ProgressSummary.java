package com.workout.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProgressSummary {
    private int totalSessions;
    private double averageCompletionRate;
    private double averageDifficultyRating;
    private int totalMinutesTrained;
    private String trend; // "improving", "stable", "declining"
}
