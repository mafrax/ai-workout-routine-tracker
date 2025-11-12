import { fastingApi } from '../services/api_backend';
import { FastingPreset, FastingSession, EatingWindow } from '../types/fasting';
import { authService } from '../services/authService';

// Migration status key
const MIGRATION_KEY = 'fasting_migration_completed';

// LocalStorage keys for fasting data
const STORAGE_KEYS = {
  PRESETS: 'fasting_presets',
  SESSIONS: 'fasting_sessions',
  ACTIVE_EATING_WINDOW: 'fasting_active_eating_window',
};

/**
 * Check if fasting data has already been migrated to backend
 */
export function isFastingDataMigrated(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === 'true';
}

/**
 * Mark migration as completed
 */
function markMigrationComplete(): void {
  localStorage.setItem(MIGRATION_KEY, 'true');
  console.log('✅ Fasting data migration marked as complete');
}

/**
 * Mark migration as failed (allows retry)
 */
function markMigrationFailed(): void {
  localStorage.removeItem(MIGRATION_KEY);
  console.error('❌ Fasting data migration marked as failed - can be retried');
}

/**
 * Get user ID from authentication service
 */
function getUserId(): string | null {
  const user = authService.getCurrentUser();
  if (!user || !user.id) {
    console.warn('⚠️ No authenticated user found - skipping migration');
    return null;
  }
  return user.id;
}

/**
 * Migrate fasting presets from localStorage to backend
 */
async function migratePresets(userId: string): Promise<void> {
  try {
    const presetsJson = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (!presetsJson) {
      console.log('No presets to migrate');
      return;
    }

    const presets: FastingPreset[] = JSON.parse(presetsJson);
    if (presets.length === 0) {
      console.log('No presets to migrate (empty array)');
      return;
    }

    console.log(`Migrating ${presets.length} preset(s)...`);

    // Convert string userId to number for API call
    const userIdNumber = parseInt(userId, 10);
    if (isNaN(userIdNumber)) {
      throw new Error('Invalid user ID format');
    }

    for (const preset of presets) {
      try {
        await fastingApi.createPreset(userIdNumber, {
          name: preset.name,
          durationMinutes: preset.durationMinutes,
        });
        console.log(`✓ Migrated preset: ${preset.name}`);
      } catch (error) {
        console.error(`Failed to migrate preset "${preset.name}":`, error);
        // Continue with other presets even if one fails
      }
    }

    console.log('✅ Presets migration completed');
  } catch (error) {
    console.error('Failed to migrate presets:', error);
    throw error;
  }
}

/**
 * Migrate fasting sessions from localStorage to backend
 */
async function migrateSessions(userId: string): Promise<void> {
  try {
    const sessionsJson = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!sessionsJson) {
      console.log('No sessions to migrate');
      return;
    }

    const sessions: FastingSession[] = JSON.parse(sessionsJson);
    if (sessions.length === 0) {
      console.log('No sessions to migrate (empty array)');
      return;
    }

    console.log(`Found ${sessions.length} session(s) to migrate`);
    console.log('⚠️ Note: Historical sessions will be preserved in localStorage');
    console.log('⚠️ Only active session will be migrated through normal flow');

    // Convert string userId to number for API call
    const userIdNumber = parseInt(userId, 10);
    if (isNaN(userIdNumber)) {
      throw new Error('Invalid user ID format');
    }

    // Check if there's an active session (no endTime)
    const activeSession = sessions.find(s => !s.endTime);

    if (activeSession) {
      console.log('⚠️ Active session detected - should be migrated through UI flow');
      // Don't auto-migrate active session - let the UI handle it
    }

    console.log('✅ Sessions migration check completed');
  } catch (error) {
    console.error('Failed to migrate sessions:', error);
    throw error;
  }
}

/**
 * Migrate active eating window from localStorage to backend
 */
async function migrateEatingWindow(userId: string): Promise<void> {
  try {
    const windowJson = localStorage.getItem(STORAGE_KEYS.ACTIVE_EATING_WINDOW);
    if (!windowJson) {
      console.log('No active eating window to migrate');
      return;
    }

    const window: EatingWindow = JSON.parse(windowJson);

    // Only migrate if the eating window is still active (no endTime)
    if (window.endTime) {
      console.log('Eating window has ended - not migrating');
      return;
    }

    console.log('Migrating active eating window...');

    // Convert string userId to number for API call
    const userIdNumber = parseInt(userId, 10);
    if (isNaN(userIdNumber)) {
      throw new Error('Invalid user ID format');
    }

    try {
      await fastingApi.createEatingWindow(userIdNumber, {
        startTime: window.startTime,
        expectedDurationMinutes: window.expectedDurationMinutes,
        nextFastDueTime: window.nextFastDueTime,
      });
      console.log('✓ Migrated active eating window');
    } catch (error) {
      console.error('Failed to migrate eating window:', error);
      // Don't throw - eating window migration is less critical
    }

    console.log('✅ Eating window migration completed');
  } catch (error) {
    console.error('Failed to migrate eating window:', error);
    throw error;
  }
}

/**
 * Main migration orchestration function
 * Run this once when user logs in or app initializes
 */
export async function runMigration(): Promise<void> {
  // Check if already migrated
  if (isFastingDataMigrated()) {
    console.log('Fasting data already migrated - skipping');
    return;
  }

  // Get authenticated user
  const userId = getUserId();
  if (!userId) {
    console.log('No authenticated user - skipping migration');
    return;
  }

  console.log('🚀 Starting fasting data migration to backend...');

  try {
    // Migrate in order: presets -> sessions -> eating window
    await migratePresets(userId);
    await migrateSessions(userId);
    await migrateEatingWindow(userId);

    // Mark as completed
    markMigrationComplete();
    console.log('✅ Fasting data migration completed successfully');
  } catch (error) {
    console.error('❌ Fasting data migration failed:', error);
    markMigrationFailed();
    throw error;
  }
}

/**
 * Reset migration status (for testing/debugging)
 * WARNING: Only use for development/testing purposes
 */
export function resetMigrationStatus(): void {
  localStorage.removeItem(MIGRATION_KEY);
  console.log('⚠️ Migration status reset - migration will run again on next attempt');
}
