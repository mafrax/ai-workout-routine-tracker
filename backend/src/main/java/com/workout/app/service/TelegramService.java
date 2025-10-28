package com.workout.app.service;

import com.workout.app.entity.DailyTask;
import com.workout.app.entity.TelegramConfig;
import com.workout.app.entity.WorkoutPlan;
import com.workout.app.repository.TelegramConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TelegramService {

    private static final Logger logger = LoggerFactory.getLogger(TelegramService.class);

    @Autowired
    private TelegramConfigRepository telegramConfigRepository;

    @Value("${llm.anthropic.api.key:}")
    private String anthropicApiKey;

    @Value("${llm.anthropic.api.url:}")
    private String anthropicApiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public TelegramConfig getUserConfig(Long userId) {
        return telegramConfigRepository.findByUserId(userId).orElse(null);
    }

    public TelegramConfig saveUserConfig(Long userId, String botToken, String chatId, Integer startHour) {
        TelegramConfig config = telegramConfigRepository.findByUserId(userId)
                .orElse(new TelegramConfig());

        config.setUserId(userId);
        config.setBotToken(botToken);
        config.setChatId(chatId);

        if (startHour != null) {
            config.setDailyTasksStartHour(startHour);
        }

        return telegramConfigRepository.save(config);
    }

    public boolean sendTaskReminder(Long userId, List<DailyTask> incompleteTasks) {
        TelegramConfig config = getUserConfig(userId);

        if (config == null || config.getBotToken() == null || config.getChatId() == null) {
            logger.warn("Telegram not configured for user {}", userId);
            return false;
        }

        try {
            int currentHour = LocalDateTime.now().getHour();
            String message = generatePersonalizedTaskReminder(incompleteTasks, currentHour);

            boolean sent = sendTelegramMessage(config.getBotToken(), config.getChatId(), message);

            if (sent) {
                config.setLastTaskReminderSent(LocalDateTime.now());
                telegramConfigRepository.save(config);
            }

            return sent;
        } catch (Exception e) {
            logger.error("Error sending task reminder", e);
            return false;
        }
    }

    public boolean sendWorkoutPreview(Long userId, String planName, String workoutDay, List<String> exercises) {
        TelegramConfig config = getUserConfig(userId);

        if (config == null || config.getBotToken() == null || config.getChatId() == null) {
            return false;
        }

        String exerciseList = exercises.stream()
                .map(ex -> "  " + ex)
                .collect(Collectors.joining("\n"));

        String message = String.format(
                "💪 <b>%s</b>\n\n<b>%s</b>\n\n%s\n\n🔥 Let's crush it!",
                planName, workoutDay, exerciseList
        );

        return sendTelegramMessage(config.getBotToken(), config.getChatId(), message);
    }

    private String generatePersonalizedTaskReminder(List<DailyTask> tasks, int currentHour) {
        String pressureLevel = getPressureLevel(currentHour);
        String taskList = tasks.stream()
                .map(DailyTask::getTitle)
                .collect(Collectors.joining(", "));

        // Simple message generation without AI (for performance)
        String emoji = getEmojiForPressure(pressureLevel);
        String urgencyText = getUrgencyText(pressureLevel);

        return String.format(
                "%s <b>Daily Tasks Reminder</b>\n\n%s\n\nYou have %d task%s to complete:\n%s",
                emoji,
                urgencyText,
                tasks.size(),
                tasks.size() > 1 ? "s" : "",
                tasks.stream().map(t -> "• " + t.getTitle()).collect(Collectors.joining("\n"))
        );
    }

    private String getPressureLevel(int hour) {
        if (hour < 12) return "gentle";
        if (hour < 15) return "moderate";
        if (hour < 18) return "urgent";
        return "critical";
    }

    private String getEmojiForPressure(String level) {
        return switch (level) {
            case "gentle" -> "💪";
            case "moderate" -> "⚡";
            case "urgent" -> "🔥";
            case "critical" -> "🚨";
            default -> "📋";
        };
    }

    private String getUrgencyText(String level) {
        return switch (level) {
            case "gentle" -> "Good morning! Time to get things done.";
            case "moderate" -> "Hey! Don't forget about your tasks today.";
            case "urgent" -> "Time is running out! Complete your tasks now!";
            case "critical" -> "⚠️ URGENT: Complete your tasks before the day ends!";
            default -> "Reminder about your daily tasks.";
        };
    }

    private boolean sendTelegramMessage(String botToken, String chatId, String message) {
        try {
            String url = String.format("https://api.telegram.org/bot%s/sendMessage", botToken);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", chatId);
            body.put("text", message);
            body.put("parse_mode", "HTML");

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            restTemplate.postForObject(url, request, Map.class);

            logger.info("Telegram message sent successfully to chat {}", chatId);
            return true;
        } catch (Exception e) {
            logger.error("Error sending Telegram message", e);
            return false;
        }
    }
}
