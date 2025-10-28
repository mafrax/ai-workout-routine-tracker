package com.workout.app.repository;

import com.workout.app.entity.ConversationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConversationHistoryRepository extends JpaRepository<ConversationHistory, Long> {
    List<ConversationHistory> findByUserIdAndSessionIdOrderByCreatedAtAsc(Long userId, String sessionId);

    List<ConversationHistory> findByUserIdOrderByCreatedAtDesc(Long userId);
}
