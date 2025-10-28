package com.workout.app.repository;

import com.workout.app.entity.WorkoutPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkoutPlanRepository extends JpaRepository<WorkoutPlan, Long> {
    List<WorkoutPlan> findByUserId(Long userId);
    Optional<WorkoutPlan> findByUserIdAndIsActive(Long userId, Boolean isActive);
}
