package com.workout.app.service;

import com.workout.app.entity.DailyTask;
import com.workout.app.repository.DailyTaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class DailyTaskService {

    @Autowired
    private DailyTaskRepository dailyTaskRepository;

    public List<DailyTask> getUserTasks(Long userId) {
        return dailyTaskRepository.findByUserId(userId);
    }

    public List<DailyTask> getIncompleteTasks(Long userId) {
        return dailyTaskRepository.findByUserIdAndCompleted(userId, false);
    }

    public DailyTask createTask(Long userId, String title) {
        DailyTask task = new DailyTask();
        task.setUserId(userId);
        task.setTitle(title);
        task.setCompleted(false);
        task.setCreatedAt(LocalDateTime.now());
        return dailyTaskRepository.save(task);
    }

    public DailyTask toggleTask(Long taskId) {
        DailyTask task = dailyTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        task.setCompleted(!task.isCompleted());
        return dailyTaskRepository.save(task);
    }

    public void deleteTask(Long taskId) {
        dailyTaskRepository.deleteById(taskId);
    }

    public void resetAllTasks(Long userId) {
        List<DailyTask> tasks = dailyTaskRepository.findByUserId(userId);
        LocalDateTime now = LocalDateTime.now();

        for (DailyTask task : tasks) {
            task.setCompleted(false);
            task.setLastResetAt(now);
        }

        dailyTaskRepository.saveAll(tasks);
    }

    public void checkAndResetTasksIfNeeded(Long userId) {
        List<DailyTask> tasks = dailyTaskRepository.findByUserId(userId);

        if (tasks.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();

        // Check if any task was reset today
        boolean needsReset = tasks.stream()
                .noneMatch(task -> {
                    LocalDateTime lastReset = task.getLastResetAt();
                    return lastReset != null && lastReset.toLocalDate().equals(today);
                });

        if (needsReset) {
            resetAllTasks(userId);
        }
    }
}
