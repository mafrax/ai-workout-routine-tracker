package com.workout.app.repository;

import com.workout.app.entity.WorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {
    List<WorkoutSession> findByUserIdOrderBySessionDateDesc(Long userId);

    List<WorkoutSession> findByUserIdAndSessionDateBetween(
        Long userId,
        LocalDateTime start,
        LocalDateTime end
    );

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user.id = :userId " +
           "ORDER BY ws.sessionDate DESC LIMIT :limit")
    List<WorkoutSession> findRecentSessions(Long userId, int limit);
}
