package com.workout.app.entity;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workout_plans")
public class WorkoutPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT", name = "plan_details")
    private String planDetails;

    @Column(name = "is_active")
    private boolean isActive = false;

    @Column(name = "is_archived")
    private boolean isArchived = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_workouts", columnDefinition = "TEXT")
    private String completedWorkoutsJson;

    @Column(name = "telegram_preview_hour")
    private Integer telegramPreviewHour;

    @Transient
    private List<Integer> completedWorkouts = new ArrayList<>();

    @Transient
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @PostLoad
    private void loadCompletedWorkouts() {
        if (completedWorkoutsJson != null && !completedWorkoutsJson.trim().isEmpty()) {
            try {
                this.completedWorkouts = objectMapper.readValue(completedWorkoutsJson, new TypeReference<List<Integer>>() {});
            } catch (JsonProcessingException e) {
                this.completedWorkouts = new ArrayList<>();
            }
        } else {
            this.completedWorkouts = new ArrayList<>();
        }
    }

    @PrePersist
    @PreUpdate
    private void saveCompletedWorkouts() {
        try {
            this.completedWorkoutsJson = objectMapper.writeValueAsString(completedWorkouts);
        } catch (JsonProcessingException e) {
            this.completedWorkoutsJson = "[]";
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPlanDetails() {
        return planDetails;
    }

    public void setPlanDetails(String planDetails) {
        this.planDetails = planDetails;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public boolean isArchived() {
        return isArchived;
    }

    public void setArchived(boolean archived) {
        isArchived = archived;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<Integer> getCompletedWorkouts() {
        return completedWorkouts;
    }

    public void setCompletedWorkouts(List<Integer> completedWorkouts) {
        this.completedWorkouts = completedWorkouts != null ? completedWorkouts : new ArrayList<>();
    }

    public Integer getTelegramPreviewHour() {
        return telegramPreviewHour;
    }

    public void setTelegramPreviewHour(Integer telegramPreviewHour) {
        this.telegramPreviewHour = telegramPreviewHour;
    }
}
