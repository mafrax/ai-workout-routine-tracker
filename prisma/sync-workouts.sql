
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  day INTEGER NOT NULL,
  muscle_group TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, day),
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY,
  workout_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  exercise_title TEXT NOT NULL,
  number_of_reps TEXT NOT NULL,
  weight REAL,
  is_bodyweight INTEGER DEFAULT 0,
  rest_time INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workout_id, order_index),
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);

DELETE FROM exercises;
DELETE FROM workouts;

INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (30, 23, 1, 'Chest & Triceps', '2025-11-11 13:26:01.122');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (289, 30, 1, 'Pull-ups', '[1,1]', NULL, 0, 120, NULL, '2025-11-11 14:45:35.432');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (290, 30, 2, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:35.432');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (291, 30, 3, 'Push-ups', '[12,12,12,12]', NULL, 0, 60, NULL, '2025-11-11 14:45:35.432');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (292, 30, 4, 'Technogym Chest Press', '[10,10,10,10]', 55, 0, 90, NULL, '2025-11-11 14:45:35.432');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (293, 30, 5, 'Incline Dumbbell Press', '[12,12,12]', 16, 0, 60, NULL, '2025-11-11 14:45:35.432');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (294, 30, 6, 'Cable Triceps Pushdown', '[15,15,15]', 17.5, 0, 60, NULL, '2025-11-11 14:45:35.432');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (295, 30, 7, 'Push-ups Close Grip', '[10,10,10]', 1, 0, 60, NULL, '2025-11-11 14:45:35.432');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (296, 30, 8, 'Technogym Cable Machine Flyes', '[15,15,15]', 17, 0, 60, NULL, '2025-11-11 14:45:35.432');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (297, 30, 9, 'Triceps Rope Extension', '[12,12,12]', 22.5, 0, 60, NULL, '2025-11-11 14:45:35.432');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (31, 23, 2, 'Back & Biceps', '2025-11-11 13:26:02.296');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (298, 31, 1, 'Pull-ups', '[2,2,2]', NULL, 0, 120, NULL, '2025-11-11 14:45:36.098');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (299, 31, 2, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:36.098');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (300, 31, 3, 'Technogym Lat Pulldown', '[10,10,10,10]', 48.5, 0, 90, NULL, '2025-11-11 14:45:36.098');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (301, 31, 4, 'Barbell Bent Over Rows', '[12,12,12,12]', 33.5, 0, 90, NULL, '2025-11-11 14:45:36.098');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (302, 31, 5, 'Vertical Traction Technogym', '[12,12,12]', 60, 0, 90, NULL, '2025-11-11 14:45:36.098');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (303, 31, 6, 'Cable Bicep Curls', '[12,12,12]', 20, 0, 60, NULL, '2025-11-11 14:45:36.098');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (304, 31, 7, 'Dumbbell Hammer Curls', '[12,12,12]', 11, 0, 60, NULL, '2025-11-11 14:45:36.098');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (32, 23, 3, 'Legs', '2025-11-11 13:26:03.150');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (305, 32, 1, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:36.715');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (306, 32, 2, 'Push-ups', '[12,12,12]', NULL, 0, 60, NULL, '2025-11-11 14:45:36.715');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (307, 32, 3, 'Technogym Leg Press', '[10,10,10,10]', 120, 0, 90, NULL, '2025-11-11 14:45:36.715');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (308, 32, 4, 'Technogym Leg Extension', '[12,12,12]', 50, 0, 60, NULL, '2025-11-11 14:45:36.715');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (309, 32, 5, 'Technogym Leg Curl', '[12,12,12]', 45, 0, 60, NULL, '2025-11-11 14:45:36.715');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (310, 32, 6, 'Bodyweight Squats', '[15,15,15]', NULL, 0, 60, NULL, '2025-11-11 14:45:36.715');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (33, 23, 4, 'Shoulders & Core', '2025-11-11 13:26:04.012');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (311, 33, 1, 'Pull-ups', '[1,1]', NULL, 0, 120, NULL, '2025-11-11 14:45:37.335');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (312, 33, 2, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:37.335');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (313, 33, 3, 'Push-ups', '[12,12,12]', NULL, 0, 60, NULL, '2025-11-11 14:45:37.335');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (314, 33, 4, 'Technogym Shoulder Press', '[12,12,12,12]', 37, 0, 90, NULL, '2025-11-11 14:45:37.335');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (315, 33, 5, 'Dumbbell Lateral Raises', '[15,15,15]', 6.5, 0, 60, NULL, '2025-11-11 14:45:37.335');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (316, 33, 6, 'Cable Face Pulls', '[15,15,15]', 19.5, 0, 60, NULL, '2025-11-11 14:45:37.335');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (317, 33, 7, 'Plank Push-ups', '[10,10,10]', NULL, 0, 60, NULL, '2025-11-11 14:45:37.335');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (318, 33, 8, 'Kettlebell Standing Press', '[12,12,12]', 13.5, 0, 60, NULL, '2025-11-11 14:45:37.335');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (319, 33, 9, 'Cable Wood Chops', '[15,15,15]', 16.5, 0, 45, NULL, '2025-11-11 14:45:37.335');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (320, 33, 10, 'Dumbbell Front Raises', '[12,12,12]', 10.5, 0, 60, NULL, '2025-11-11 14:45:37.335');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (34, 23, 5, 'Chest & Triceps', '2025-11-11 13:26:04.945');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (321, 34, 1, 'Pull-ups', '[2,2]', NULL, 0, 120, NULL, '2025-11-11 14:45:37.957');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (322, 34, 2, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:37.957');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (323, 34, 3, 'Push-ups', '[14,14,14,14]', NULL, 0, 60, NULL, '2025-11-11 14:45:37.957');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (324, 34, 4, 'Technogym Chest Press', '[10,10,10,10]', 55, 0, 90, NULL, '2025-11-11 14:45:37.957');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (325, 34, 5, 'Incline Dumbbell Press', '[12,12,12]', 16, 0, 60, NULL, '2025-11-11 14:45:37.957');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (326, 34, 6, 'Cable Triceps Pushdown', '[15,15,15]', 17.5, 0, 60, NULL, '2025-11-11 14:45:37.957');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (327, 34, 7, 'Push-ups Close Grip', '[12,12,12]', 1, 0, 60, NULL, '2025-11-11 14:45:37.957');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (328, 34, 8, 'Technogym Cable Machine Flyes', '[15,15,15]', 17, 0, 60, NULL, '2025-11-11 14:45:37.957');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (329, 34, 9, 'Triceps Rope Extension', '[12,12,12]', 22.5, 0, 60, NULL, '2025-11-11 14:45:37.957');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (35, 23, 6, 'Back & Biceps', '2025-11-11 13:26:05.830');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (330, 35, 1, 'Pull-ups', '[2,2,2]', NULL, 0, 120, NULL, '2025-11-11 14:45:38.572');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (331, 35, 2, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:38.572');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (332, 35, 3, 'Technogym Lat Pulldown', '[10,10,10,10]', 48.5, 0, 90, NULL, '2025-11-11 14:45:38.572');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (333, 35, 4, 'Barbell Bent Over Rows', '[12,12,12,12]', 33.5, 0, 90, NULL, '2025-11-11 14:45:38.572');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (334, 35, 5, 'Vertical Traction Technogym', '[12,12,12]', 60, 0, 90, NULL, '2025-11-11 14:45:38.572');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (335, 35, 6, 'Cable Bicep Curls', '[13,13,13]', 20, 0, 60, NULL, '2025-11-11 14:45:38.572');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (336, 35, 7, 'Dumbbell Hammer Curls', '[12,12,12]', 11, 0, 60, NULL, '2025-11-11 14:45:38.572');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (36, 23, 7, 'Legs', '2025-11-11 13:26:06.812');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (337, 36, 1, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:39.191');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (338, 36, 2, 'Push-ups', '[13,13,13]', NULL, 0, 60, NULL, '2025-11-11 14:45:39.191');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (339, 36, 3, 'Technogym Leg Press', '[10,10,10,10]', 120, 0, 90, NULL, '2025-11-11 14:45:39.191');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (340, 36, 4, 'Technogym Leg Extension', '[12,12,12]', 50, 0, 60, NULL, '2025-11-11 14:45:39.191');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (341, 36, 5, 'Technogym Leg Curl', '[12,12,12]', 45, 0, 60, NULL, '2025-11-11 14:45:39.191');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (342, 36, 6, 'Bodyweight Squats', '[16,16,16]', NULL, 0, 60, NULL, '2025-11-11 14:45:39.191');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (37, 23, 8, 'Shoulders & Core', '2025-11-11 13:26:07.682');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (343, 37, 1, 'Pull-ups', '[1,1]', NULL, 0, 120, NULL, '2025-11-11 14:45:39.815');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (344, 37, 2, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:39.815');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (345, 37, 3, 'Push-ups', '[13,13,13]', NULL, 0, 60, NULL, '2025-11-11 14:45:39.815');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (346, 37, 4, 'Technogym Shoulder Press', '[12,12,12,12]', 37, 0, 90, NULL, '2025-11-11 14:45:39.815');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (347, 37, 5, 'Dumbbell Lateral Raises', '[16,16,16]', 6.5, 0, 60, NULL, '2025-11-11 14:45:39.815');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (348, 37, 6, 'Cable Face Pulls', '[16,16,16]', 19.5, 0, 60, NULL, '2025-11-11 14:45:39.815');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (349, 37, 7, 'Plank Push-ups', '[11,11,11]', NULL, 0, 60, NULL, '2025-11-11 14:45:39.815');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (350, 37, 8, 'Kettlebell Standing Press', '[12,12,12]', 13.5, 0, 60, NULL, '2025-11-11 14:45:39.815');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (351, 37, 9, 'Cable Wood Chops', '[15,15,15]', 16.5, 0, 45, NULL, '2025-11-11 14:45:39.815');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (352, 37, 10, 'Dumbbell Front Raises', '[13,13,13]', 10.5, 0, 60, NULL, '2025-11-11 14:45:39.815');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (38, 23, 9, 'Chest & Triceps', '2025-11-11 13:26:08.558');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (353, 38, 1, 'Pull-ups', '[2,2]', NULL, 0, 120, NULL, '2025-11-11 14:45:40.431');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (354, 38, 2, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:40.431');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (355, 38, 3, 'Push-ups', '[15,15,15,15]', NULL, 0, 60, NULL, '2025-11-11 14:45:40.431');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (356, 38, 4, 'Technogym Chest Press', '[10,10,10,10]', 55, 0, 90, NULL, '2025-11-11 14:45:40.431');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (357, 38, 5, 'Incline Dumbbell Press', '[12,12,12]', 16, 0, 60, NULL, '2025-11-11 14:45:40.431');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (358, 38, 6, 'Cable Triceps Pushdown', '[16,16,16]', 17.5, 0, 60, NULL, '2025-11-11 14:45:40.431');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (359, 38, 7, 'Push-ups Close Grip', '[12,12,12]', 1, 0, 60, NULL, '2025-11-11 14:45:40.431');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (360, 38, 8, 'Technogym Cable Machine Flyes', '[15,15,15]', 17, 0, 60, NULL, '2025-11-11 14:45:40.431');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (361, 38, 9, 'Triceps Rope Extension', '[13,13,13]', 22.5, 0, 60, NULL, '2025-11-11 14:45:40.431');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (39, 23, 10, 'Back & Biceps', '2025-11-11 14:45:40.946');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (362, 39, 1, 'Pull-ups', '[2,2,2]', NULL, 0, 120, NULL, '2025-11-11 14:45:40.946');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (363, 39, 2, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:40.946');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (364, 39, 3, 'Technogym Lat Pulldown', '[10,10,10,10]', 48.5, 0, 90, NULL, '2025-11-11 14:45:40.946');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (365, 39, 4, 'Barbell Bent Over Rows', '[12,12,12,12]', 33.5, 0, 90, NULL, '2025-11-11 14:45:40.946');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (366, 39, 5, 'Vertical Traction Technogym', '[12,12,12]', 60, 0, 90, NULL, '2025-11-11 14:45:40.946');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (367, 39, 6, 'Cable Bicep Curls', '[14,14,14]', 20, 0, 60, NULL, '2025-11-11 14:45:40.946');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (368, 39, 7, 'Dumbbell Hammer Curls', '[13,13,13]', 11, 0, 60, NULL, '2025-11-11 14:45:40.946');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (40, 23, 11, 'Legs', '2025-11-11 14:45:41.883');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (369, 40, 1, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:41.883');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (370, 40, 2, 'Push-ups', '[14,14,14]', NULL, 0, 60, NULL, '2025-11-11 14:45:41.883');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (371, 40, 3, 'Technogym Leg Press', '[10,10,10,10]', 120, 0, 90, NULL, '2025-11-11 14:45:41.883');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (372, 40, 4, 'Technogym Leg Extension', '[12,12,12]', 50, 0, 60, NULL, '2025-11-11 14:45:41.883');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (373, 40, 5, 'Technogym Leg Curl', '[12,12,12]', 45, 0, 60, NULL, '2025-11-11 14:45:41.883');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (374, 40, 6, 'Bodyweight Squats', '[17,17,17]', NULL, 0, 60, NULL, '2025-11-11 14:45:41.883');


INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (41, 23, 12, 'Shoulders & Core', '2025-11-11 14:45:42.607');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (375, 41, 1, 'Pull-ups', '[1,1]', NULL, 0, 120, NULL, '2025-11-11 14:45:42.607');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (376, 41, 2, 'Negative Pull-ups', '[3,3]', NULL, 0, 120, '5s lower', '2025-11-11 14:45:42.607');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (377, 41, 3, 'Push-ups', '[14,14,14]', NULL, 0, 60, NULL, '2025-11-11 14:45:42.607');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (378, 41, 4, 'Technogym Shoulder Press', '[12,12,12,12]', 37, 0, 90, NULL, '2025-11-11 14:45:42.607');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (379, 41, 5, 'Dumbbell Lateral Raises', '[16,16,16]', 6.5, 0, 60, NULL, '2025-11-11 14:45:42.607');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (380, 41, 6, 'Cable Face Pulls', '[16,16,16]', 19.5, 0, 60, NULL, '2025-11-11 14:45:42.607');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (381, 41, 7, 'Plank Push-ups', '[12,12,12]', NULL, 0, 60, NULL, '2025-11-11 14:45:42.607');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (382, 41, 8, 'Kettlebell Standing Press', '[12,12,12]', 13.5, 0, 60, NULL, '2025-11-11 14:45:42.607');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (383, 41, 9, 'Cable Wood Chops', '[15,15,15]', 16.5, 0, 45, NULL, '2025-11-11 14:45:42.607');


INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (384, 41, 10, 'Dumbbell Front Raises', '[13,13,13]', 10.5, 0, 60, NULL, '2025-11-11 14:45:42.607');
