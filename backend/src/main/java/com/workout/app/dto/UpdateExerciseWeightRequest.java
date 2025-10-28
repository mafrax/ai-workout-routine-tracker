package com.workout.app.dto;

public class UpdateExerciseWeightRequest {
    private Long workoutPlanId;
    private String exerciseName;
    private String newWeight;

    public Long getWorkoutPlanId() {
        return workoutPlanId;
    }

    public void setWorkoutPlanId(Long workoutPlanId) {
        this.workoutPlanId = workoutPlanId;
    }

    public String getExerciseName() {
        return exerciseName;
    }

    public void setExerciseName(String exerciseName) {
        this.exerciseName = exerciseName;
    }

    public String getNewWeight() {
        return newWeight;
    }

    public void setNewWeight(String newWeight) {
        this.newWeight = newWeight;
    }
}
