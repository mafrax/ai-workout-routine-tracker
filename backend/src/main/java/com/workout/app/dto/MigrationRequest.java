package com.workout.app.dto;

import java.util.List;
import java.util.Map;

public class MigrationRequest {
    private Long userId;
    private List<LocalStorageTask> tasks;
    private List<Map<String, Object>> workoutPlans;
    private List<Map<String, Object>> workoutSessions;
    private Map<String, Object> userProfile;
    private TelegramConfigDto telegramConfig;

    public static class LocalStorageTask {
        private Long id;
        private String title;
        private boolean completed;
        private String createdAt;

        // Getters and Setters
        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
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

        public String getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(String createdAt) {
            this.createdAt = createdAt;
        }
    }

    public static class TelegramConfigDto {
        private String botToken;
        private String chatId;
        private Integer startHour;

        // Getters and Setters
        public String getBotToken() {
            return botToken;
        }

        public void setBotToken(String botToken) {
            this.botToken = botToken;
        }

        public String getChatId() {
            return chatId;
        }

        public void setChatId(String chatId) {
            this.chatId = chatId;
        }

        public Integer getStartHour() {
            return startHour;
        }

        public void setStartHour(Integer startHour) {
            this.startHour = startHour;
        }
    }

    // Getters and Setters
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public List<LocalStorageTask> getTasks() {
        return tasks;
    }

    public void setTasks(List<LocalStorageTask> tasks) {
        this.tasks = tasks;
    }

    public List<Map<String, Object>> getWorkoutPlans() {
        return workoutPlans;
    }

    public void setWorkoutPlans(List<Map<String, Object>> workoutPlans) {
        this.workoutPlans = workoutPlans;
    }

    public List<Map<String, Object>> getWorkoutSessions() {
        return workoutSessions;
    }

    public void setWorkoutSessions(List<Map<String, Object>> workoutSessions) {
        this.workoutSessions = workoutSessions;
    }

    public Map<String, Object> getUserProfile() {
        return userProfile;
    }

    public void setUserProfile(Map<String, Object> userProfile) {
        this.userProfile = userProfile;
    }

    public TelegramConfigDto getTelegramConfig() {
        return telegramConfig;
    }

    public void setTelegramConfig(TelegramConfigDto telegramConfig) {
        this.telegramConfig = telegramConfig;
    }
}
