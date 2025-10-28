package com.workout.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.workout.app.dto.ProgressSummary;
import com.workout.app.entity.User;
import com.workout.app.entity.WorkoutPlan;
import com.workout.app.entity.WorkoutSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class LLMService {

    @Value("${llm.anthropic.api.key}")
    private String anthropicApiKey;

    @Value("${llm.anthropic.api.url}")
    private String anthropicApiUrl;

    @Value("${llm.anthropic.model}")
    private String anthropicModel;

    @Value("${llm.anthropic.max.tokens}")
    private int anthropicMaxTokens;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public LLMService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public String sendMessageToClaude(String userMessage, List<JsonNode> conversationHistory,
                                       User user, ProgressSummary progress, WorkoutPlan activePlan,
                                       List<WorkoutSession> recentSessions) {
        try {
            String systemPrompt = buildSystemPrompt(user, progress, activePlan, recentSessions);
            ObjectNode requestBody = buildClaudeRequest(systemPrompt, userMessage, conversationHistory);

            String response = webClient.post()
                    .uri(anthropicApiUrl)
                    .header("x-api-key", anthropicApiKey)
                    .header("anthropic-version", "2023-06-01")
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode responseJson = objectMapper.readTree(response);
            return responseJson.get("content").get(0).get("text").asText();

        } catch (Exception e) {
            throw new RuntimeException("Error calling Claude API: " + e.getMessage(), e);
        }
    }

    private String buildSystemPrompt(User user, ProgressSummary progress, WorkoutPlan activePlan,
                                       List<WorkoutSession> recentSessions) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a professional fitness coach and workout planner assistant. ");
        prompt.append("Your role is to help users adjust their workout plans based on their progress and preferences.\n\n");

        if (user != null) {
            prompt.append("USER PROFILE:\n");
            prompt.append("Name: ").append(user.getName()).append("\n");
            if (user.getAge() != null) prompt.append("Age: ").append(user.getAge()).append("\n");
            if (user.getFitnessLevel() != null)
                prompt.append("Fitness Level: ").append(user.getFitnessLevel()).append("\n");
            if (user.getAvailableEquipment() != null && !user.getAvailableEquipment().isEmpty())
                prompt.append("Available Equipment: ").append(String.join(", ", user.getAvailableEquipment())).append("\n");
            if (user.getGoals() != null && !user.getGoals().isEmpty())
                prompt.append("Goals: ").append(String.join(", ", user.getGoals())).append("\n");
        }

        if (activePlan != null) {
            prompt.append("\nCURRENT ACTIVE WORKOUT PLAN:\n");
            prompt.append("Plan Name: ").append(activePlan.getName()).append("\n");
            prompt.append("Description: ").append(activePlan.getDescription()).append("\n");
            prompt.append("Duration: ").append(activePlan.getDurationWeeks()).append(" weeks\n");
            prompt.append("Days Per Week: ").append(activePlan.getDaysPerWeek()).append("\n");
            prompt.append("Difficulty: ").append(activePlan.getDifficultyLevel()).append("\n\n");
            prompt.append("PLAN DETAILS:\n");
            prompt.append(activePlan.getPlanDetails()).append("\n\n");
        }

        if (progress != null && progress.getTotalSessions() > 0) {
            prompt.append("PROGRESS SUMMARY:\n");
            prompt.append("Total Sessions: ").append(progress.getTotalSessions()).append("\n");
            prompt.append("Average Completion Rate: ").append(String.format("%.1f%%", progress.getAverageCompletionRate() * 100)).append("\n");
            prompt.append("Average Difficulty Rating: ").append(String.format("%.1f/10", progress.getAverageDifficultyRating())).append("\n");
            prompt.append("Trend: ").append(progress.getTrend()).append("\n\n");
        }

        if (recentSessions != null && !recentSessions.isEmpty()) {
            prompt.append("RECENT WORKOUT SESSIONS (last ").append(Math.min(recentSessions.size(), 5)).append("):\n");
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");
            for (int i = 0; i < Math.min(recentSessions.size(), 5); i++) {
                WorkoutSession session = recentSessions.get(i);
                prompt.append(session.getSessionDate().format(formatter)).append(": ");
                prompt.append(String.format("%.0f%% complete", session.getCompletionRate() * 100));
                prompt.append(", ").append(session.getDurationMinutes()).append(" min");
                if (session.getDifficultyRating() != null) {
                    prompt.append(", difficulty ").append(session.getDifficultyRating()).append("/10");
                }
                if (session.getNotes() != null && !session.getNotes().isEmpty()) {
                    prompt.append(" - \"").append(session.getNotes()).append("\"");
                }
                prompt.append("\n");
            }
            prompt.append("\n");
        }

        prompt.append("CRITICAL RULES FOR WORKOUT MODIFICATIONS:\n");
        prompt.append("1. ALWAYS ask clarifying questions BEFORE making changes if the request is vague\n");
        prompt.append("   - If user says 'make it harder' ask: Which exercises? How much harder? (10%? 20%?)\n");
        prompt.append("   - If user says 'add more exercises' ask: To which day? What muscle groups?\n");
        prompt.append("   - If user says 'weights too easy' ask: Which specific exercises felt easy? By how much should we increase?\n\n");

        prompt.append("2. When providing a modified workout plan:\n");
        prompt.append("   - Start with a brief explanation of changes (2-3 sentences)\n");
        prompt.append("   - Then provide the COMPLETE workout plan starting with 'Day 1'\n");
        prompt.append("   - ALWAYS include ALL days (Day 1, Day 2, Day 3, Day 4) with EVERY exercise listed in full\n");
        prompt.append("   - NEVER use placeholders like '(same as before)' or '(original exercises)'\n");
        prompt.append("   - End with: 'The updated plan is ready. Click \"Apply Changes\" to save it to your workout.'\n\n");

        prompt.append("3. EXACT FORMAT REQUIRED for exercises:\n");
        prompt.append("   Day X - Focus Name:\n");
        prompt.append("   1. Exercise Name - SetsxReps @ WeightKg | RestBetweenSets | RestBeforeNext\n");
        prompt.append("   Example: Technogym Chest Press - 4x10 @ 50-60kg | 60s | 90s\n\n");

        prompt.append("4. Guardrails for safety:\n");
        prompt.append("   - NEVER increase weights by more than 20% in a single change\n");
        prompt.append("   - NEVER recommend exercises not in the user's available equipment\n");
        prompt.append("   - If user insists on unsafe changes, warn them and suggest a safer alternative\n");
        prompt.append("   - Always consider the user's recent completion rates and difficulty ratings\n\n");

        prompt.append("5. Conversation flow:\n");
        prompt.append("   - If user request is clear: Ask for confirmation before showing the full plan\n");
        prompt.append("   - If user request is vague: Ask 2-3 specific questions\n");
        prompt.append("   - Never just talk about making changes - ALWAYS output the actual plan\n");
        prompt.append("   - User must see the plan structure starting with 'Day 1' to apply it\n");

        return prompt.toString();
    }

    private ObjectNode buildClaudeRequest(String systemPrompt, String userMessage,
                                           List<JsonNode> conversationHistory) {
        ObjectNode request = objectMapper.createObjectNode();
        request.put("model", anthropicModel);
        request.put("max_tokens", anthropicMaxTokens);
        request.put("system", systemPrompt);

        ArrayNode messages = objectMapper.createArrayNode();

        // Add conversation history
        if (conversationHistory != null) {
            conversationHistory.forEach(messages::add);
        }

        // Add current user message
        ObjectNode userMsg = objectMapper.createObjectNode();
        userMsg.put("role", "user");
        userMsg.put("content", userMessage);
        messages.add(userMsg);

        request.set("messages", messages);
        return request;
    }
}
