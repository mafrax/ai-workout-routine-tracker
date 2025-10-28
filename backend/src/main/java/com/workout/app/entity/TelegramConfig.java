package com.workout.app.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "telegram_config")
public class TelegramConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column
    private String botToken;

    @Column
    private String chatId;

    @Column
    private Integer dailyTasksStartHour = 9;

    @Column
    private LocalDateTime lastTaskReminderSent;

    @Column
    private LocalDateTime createdAt = LocalDateTime.now();

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

    public Integer getDailyTasksStartHour() {
        return dailyTasksStartHour;
    }

    public void setDailyTasksStartHour(Integer dailyTasksStartHour) {
        this.dailyTasksStartHour = dailyTasksStartHour;
    }

    public LocalDateTime getLastTaskReminderSent() {
        return lastTaskReminderSent;
    }

    public void setLastTaskReminderSent(LocalDateTime lastTaskReminderSent) {
        this.lastTaskReminderSent = lastTaskReminderSent;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
