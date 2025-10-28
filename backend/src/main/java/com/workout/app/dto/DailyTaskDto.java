package com.workout.app.dto;

import java.time.LocalDateTime;

public class DailyTaskDto {
    private Long id;
    private Long userId;
    private String title;
    private boolean completed;
    private LocalDateTime createdAt;

    // Constructors
    public DailyTaskDto() {}

    public DailyTaskDto(Long id, Long userId, String title, boolean completed, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.completed = completed;
        this.createdAt = createdAt;
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
