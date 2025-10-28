package com.workout.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workout.app.dto.ChatRequest;
import com.workout.app.dto.ChatResponse;
import com.workout.app.dto.ProgressSummary;
import com.workout.app.entity.ConversationHistory;
import com.workout.app.entity.User;
import com.workout.app.entity.WorkoutPlan;
import com.workout.app.entity.WorkoutSession;
import com.workout.app.repository.ConversationHistoryRepository;
import com.workout.app.repository.UserRepository;
import com.workout.app.repository.WorkoutPlanRepository;
import com.workout.app.repository.WorkoutSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WorkoutService {

    private final LLMService llmService;
    private final UserRepository userRepository;
    private final WorkoutSessionRepository workoutSessionRepository;
    private final WorkoutPlanRepository workoutPlanRepository;
    private final ConversationHistoryRepository conversationHistoryRepository;
    private final ObjectMapper objectMapper;

    public WorkoutService(LLMService llmService,
                          UserRepository userRepository,
                          WorkoutSessionRepository workoutSessionRepository,
                          WorkoutPlanRepository workoutPlanRepository,
                          ConversationHistoryRepository conversationHistoryRepository,
                          ObjectMapper objectMapper) {
        this.llmService = llmService;
        this.userRepository = userRepository;
        this.workoutSessionRepository = workoutSessionRepository;
        this.workoutPlanRepository = workoutPlanRepository;
        this.conversationHistoryRepository = conversationHistoryRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ChatResponse chat(ChatRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String sessionId = request.getSessionId() != null ?
                request.getSessionId() : UUID.randomUUID().toString();

        // Get conversation history
        List<ConversationHistory> history = conversationHistoryRepository
                .findByUserIdAndSessionIdOrderByCreatedAtAsc(user.getId(), sessionId);

        // Convert to JSON format for LLM
        List<JsonNode> conversationMessages = history.stream()
                .map(this::convertToJsonMessage)
                .collect(Collectors.toList());

        // Get user's progress summary
        ProgressSummary progress = calculateProgress(user.getId());

        // Get active workout plan
        WorkoutPlan activePlan = workoutPlanRepository
                .findByUserIdAndIsActive(user.getId(), true)
                .orElse(null);

        // Get recent workout sessions (last 5)
        List<WorkoutSession> recentSessions = workoutSessionRepository
                .findByUserIdOrderBySessionDateDesc(user.getId())
                .stream()
                .limit(5)
                .collect(Collectors.toList());

        // Call LLM with full context
        String assistantResponse = llmService.sendMessageToClaude(
                request.getMessage(),
                conversationMessages,
                user,
                progress,
                activePlan,
                recentSessions
        );

        // Save user message
        saveConversation(user, sessionId, "user", request.getMessage());

        // Save assistant response
        saveConversation(user, sessionId, "assistant", assistantResponse);

        return new ChatResponse(assistantResponse, sessionId);
    }

    public ProgressSummary calculateProgress(Long userId) {
        List<WorkoutSession> recentSessions = workoutSessionRepository
                .findByUserIdOrderBySessionDateDesc(userId);

        if (recentSessions.isEmpty()) {
            return new ProgressSummary(0, 0, 0, 0, "no_data");
        }

        int totalSessions = recentSessions.size();
        double avgCompletion = recentSessions.stream()
                .mapToDouble(WorkoutSession::getCompletionRate)
                .average()
                .orElse(0.0);

        double avgDifficulty = recentSessions.stream()
                .filter(s -> s.getDifficultyRating() != null)
                .mapToInt(WorkoutSession::getDifficultyRating)
                .average()
                .orElse(0.0);

        int totalMinutes = recentSessions.stream()
                .filter(s -> s.getDurationMinutes() != null)
                .mapToInt(WorkoutSession::getDurationMinutes)
                .sum();

        String trend = calculateTrend(recentSessions);

        return new ProgressSummary(totalSessions, avgCompletion, avgDifficulty, totalMinutes, trend);
    }

    private String calculateTrend(List<WorkoutSession> sessions) {
        if (sessions.size() < 3) return "stable";

        List<WorkoutSession> recent = sessions.subList(0, Math.min(3, sessions.size()));
        List<WorkoutSession> older = sessions.size() > 5 ?
                sessions.subList(3, Math.min(6, sessions.size())) : new ArrayList<>();

        if (older.isEmpty()) return "stable";

        double recentAvg = recent.stream()
                .mapToDouble(WorkoutSession::getCompletionRate)
                .average()
                .orElse(0.0);

        double olderAvg = older.stream()
                .mapToDouble(WorkoutSession::getCompletionRate)
                .average()
                .orElse(0.0);

        if (recentAvg > olderAvg + 0.1) return "improving";
        if (recentAvg < olderAvg - 0.1) return "declining";
        return "stable";
    }

    private void saveConversation(User user, String sessionId, String role, String content) {
        ConversationHistory conversation = new ConversationHistory();
        conversation.setUser(user);
        conversation.setSessionId(sessionId);
        conversation.setRole(role);
        conversation.setContent(content);
        conversationHistoryRepository.save(conversation);
    }

    private JsonNode convertToJsonMessage(ConversationHistory history) {
        try {
            return objectMapper.createObjectNode()
                    .put("role", history.getRole())
                    .put("content", history.getContent());
        } catch (Exception e) {
            throw new RuntimeException("Error converting message", e);
        }
    }
}
