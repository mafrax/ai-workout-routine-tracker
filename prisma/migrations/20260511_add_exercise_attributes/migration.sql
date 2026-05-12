-- Equipment-specific attributes for an exercise. Discriminated union, validated
-- in the application layer (see src/types/exercise.ts). Examples:
--   {"kind":"dumbbells","weightPerHandKg":22.5}
--   {"kind":"incline-bench","angleDeg":30}
ALTER TABLE "exercises" ADD COLUMN "attributes" JSONB;
