-- CreateTable
CREATE TABLE "fasting_presets" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fasting_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fasting_sessions" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "goal_minutes" INTEGER NOT NULL,
    "preset_name" TEXT NOT NULL,
    "stopped_early" BOOLEAN NOT NULL,
    "eating_window_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fasting_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fasting_eating_windows" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "expected_duration_minutes" INTEGER NOT NULL,
    "next_fast_due_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fasting_eating_windows_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fasting_presets" ADD CONSTRAINT "fasting_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasting_sessions" ADD CONSTRAINT "fasting_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasting_eating_windows" ADD CONSTRAINT "fasting_eating_windows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
