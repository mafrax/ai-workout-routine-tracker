package com.workout.app.controller;

import com.workout.app.dto.DailyTaskDto;
import com.workout.app.entity.DailyTask;
import com.workout.app.service.DailyTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/daily-tasks")
@CrossOrigin(origins = "*")
public class DailyTaskController {

    @Autowired
    private DailyTaskService dailyTaskService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DailyTaskDto>> getUserTasks(@PathVariable Long userId) {
        // Check and reset if needed
        dailyTaskService.checkAndResetTasksIfNeeded(userId);

        List<DailyTask> tasks = dailyTaskService.getUserTasks(userId);
        List<DailyTaskDto> dtos = tasks.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/user/{userId}/incomplete")
    public ResponseEntity<List<DailyTaskDto>> getIncompleteTasks(@PathVariable Long userId) {
        List<DailyTask> tasks = dailyTaskService.getIncompleteTasks(userId);
        List<DailyTaskDto> dtos = tasks.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<DailyTaskDto> createTask(
            @PathVariable Long userId,
            @RequestBody DailyTaskDto taskDto) {
        DailyTask task = dailyTaskService.createTask(userId, taskDto.getTitle());
        return ResponseEntity.ok(convertToDto(task));
    }

    @PutMapping("/{taskId}/toggle")
    public ResponseEntity<DailyTaskDto> toggleTask(@PathVariable Long taskId) {
        DailyTask task = dailyTaskService.toggleTask(taskId);
        return ResponseEntity.ok(convertToDto(task));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long taskId) {
        dailyTaskService.deleteTask(taskId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/user/{userId}/reset")
    public ResponseEntity<Void> resetTasks(@PathVariable Long userId) {
        dailyTaskService.resetAllTasks(userId);
        return ResponseEntity.ok().build();
    }

    private DailyTaskDto convertToDto(DailyTask task) {
        return new DailyTaskDto(
                task.getId(),
                task.getUserId(),
                task.getTitle(),
                task.isCompleted(),
                task.getCreatedAt()
        );
    }
}
