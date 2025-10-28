package com.workout.app.repository;

import com.workout.app.entity.TelegramConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TelegramConfigRepository extends JpaRepository<TelegramConfig, Long> {
    Optional<TelegramConfig> findByUserId(Long userId);
}
