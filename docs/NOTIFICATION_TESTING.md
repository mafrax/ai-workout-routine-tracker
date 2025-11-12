# Notification System Testing Guide

## Overview
This guide provides step-by-step instructions for testing the fasting timer notification system.

## Prerequisites
- App running on mobile device or simulator
- Backend API running for Telegram integration
- Capacitor Local Notifications plugin installed

## Test Cases

### Test 1: Notification Settings UI
**Objective:** Verify settings UI is accessible and functional

**Steps:**
1. Navigate to Fasting page
2. Tap the bell icon in the header
3. Verify the "Notification Settings" modal opens
4. Check all toggle switches are present:
   - Master "Enable Notifications" toggle
   - Local Notifications toggle
   - Telegram Notifications toggle
   - Eating Window Reminders (2h, 1h, 30min, ending)
   - Overdue Reminders (15min, 30min, 1h)
   - Fasting Milestones (goal reached, 2h extra)

**Expected:**
- All toggles render correctly
- Settings are grouped by category
- Master toggle shows/hides dependent settings

**Status:** ✅ UI implemented

---

### Test 2: Settings Persistence
**Objective:** Verify settings are saved and loaded correctly

**Steps:**
1. Open Notification Settings
2. Enable notifications (master switch)
3. Toggle specific notification types on/off
4. Close the modal
5. Refresh the page
6. Reopen Notification Settings

**Expected:**
- Settings persist across page refreshes
- Settings stored in localStorage
- Settings loaded on page mount

**Status:** ✅ Persistence implemented via localStorage

---

### Test 3: Notification Scheduler Lifecycle
**Objective:** Verify scheduler starts/stops based on settings

**Steps:**
1. Open browser console
2. Navigate to Fasting page
3. Check console for "Starting notification scheduler..."
4. Open settings and disable notifications
5. Check console for "Notification scheduler stopped"
6. Re-enable notifications
7. Check console for scheduler restart

**Expected:**
- Scheduler starts on page load if enabled
- Scheduler stops when notifications disabled
- Scheduler restarts when notifications re-enabled
- Console logs confirm state changes

**Status:** ✅ Lifecycle management implemented

---

### Test 4: Eating Window Notifications (Short Duration Test)
**Objective:** Test eating window reminder notifications

**For quick testing, modify a preset to have very short duration:**
1. Create/edit preset: "Test Fast" - 5 minutes
2. Enable all eating window reminders in settings
3. Start the test fast
4. Immediately stop the fast (triggers eating window)
5. Eating window = 24h - 5min = 23h 55min

**Note:** For actual testing, you'll need to:
- Mock the time in notificationScheduler.ts, OR
- Use a very long fast (16h+) to test 2h/1h/30min reminders, OR
- Wait for actual time to pass

**Expected Notifications:**
- 2h before eating window ends
- 1h before eating window ends
- 30min before eating window ends
- When eating window ends

**Status:** ⚠️ Requires manual testing or time mocking

---

### Test 5: Overdue Notifications
**Objective:** Verify overdue reminders when eating window expires

**Setup:**
1. Complete a fast
2. Wait for eating window to end (timer shows OVERDUE)
3. Do not start a new fast

**Expected:**
- 15 min overdue: Gentle reminder
- 30 min overdue: Moderate urgency
- 1 hour overdue: High urgency

**Status:** ⚠️ Requires manual testing or time mocking

---

### Test 6: Fasting Goal Notifications
**Objective:** Test milestone notifications during fasting

**Setup:**
1. Create short duration preset (e.g., 2 minutes)
2. Enable "Goal Reached" in settings
3. Start fast
4. Wait for goal time to pass

**Expected:**
- Notification when goal is reached
- If "2 Hours Extra" enabled, notification 2h after goal
- No duplicate notifications for same session

**Status:** ⚠️ Requires manual testing

---

### Test 7: Telegram Integration
**Objective:** Verify Telegram notifications are sent

**Prerequisites:**
- Backend running
- Telegram bot configured
- User linked to Telegram

**Steps:**
1. Enable Telegram notifications in settings
2. Trigger any notification (eating window, overdue, or milestone)
3. Check Telegram for message

**Expected:**
- Messages sent to Telegram with correct formatting
- Title and body included
- Proper emoji usage

**Status:** ⚠️ Requires backend and Telegram setup

---

### Test 8: Notification Deduplication
**Objective:** Ensure no duplicate notifications

**Steps:**
1. Start a fast
2. Reach goal (triggers notification)
3. Continue fasting
4. Check that goal notification only fires once
5. Close/reopen app
6. Verify no duplicate goal notification

**Expected:**
- Milestones only trigger once per session
- localStorage tracks triggered milestones
- Eating window milestones reset on new window

**Status:** ✅ Deduplication logic implemented

---

### Test 9: Multiple Eating Window Cycles
**Objective:** Verify milestones reset for new eating windows

**Steps:**
1. Complete fast #1 (creates eating window #1)
2. Wait for/trigger some notifications
3. Start fast #2 (creates eating window #2)
4. Stop fast #2 (creates eating window #2)
5. Verify milestones reset and fire again

**Expected:**
- New eating window ID triggers milestone reset
- Notifications fire again for new window
- Old eating window data cleaned up

**Status:** ✅ Reset logic implemented

---

## Implementation Verification

### Code Coverage Checklist
- ✅ NotificationSettings type definition
- ✅ NotificationMilestone type definition
- ✅ NotificationState type definition
- ✅ NotificationService class
  - ✅ Local notification support (Capacitor)
  - ✅ Telegram notification support
  - ✅ Message generation for all types
  - ✅ Settings persistence
  - ✅ Notification type filtering
- ✅ NotificationScheduler class
  - ✅ 60-second interval checking
  - ✅ Eating window change detection
  - ✅ Milestone tracking and triggering
  - ✅ Fasting goal notifications
  - ✅ State persistence
  - ✅ Start/stop lifecycle
- ✅ Store integration
  - ✅ Load notification settings
  - ✅ Update notification settings
  - ✅ Start/stop scheduler
- ✅ UI Components
  - ✅ NotificationSettings component
  - ✅ Settings modal in Fasting page
  - ✅ Bell icon in header
- ✅ Initialization
  - ✅ Load settings on mount
  - ✅ Start scheduler on mount

### Manual Testing Required
The following require actual runtime testing or time mocking:
- ⚠️ Eating window notifications (2h, 1h, 30min, ending)
- ⚠️ Overdue notifications (15min, 30min, 1h)
- ⚠️ Fasting milestone notifications (goal, 2h extra)
- ⚠️ Telegram integration
- ⚠️ Local notification permissions and delivery

## Testing Tips

### Quick Testing with Modified Durations
For rapid testing without waiting hours:

```typescript
// In notificationScheduler.ts, modify milestone times:
private initializeMilestones(): NotificationMilestone[] {
  return [
    { type: 'eating_2h', minutesRemaining: 4, triggered: false, timestamp: null }, // Test at 4 min
    { type: 'eating_1h', minutesRemaining: 3, triggered: false, timestamp: null }, // Test at 3 min
    { type: 'eating_30min', minutesRemaining: 2, triggered: false, timestamp: null }, // Test at 2 min
    // ... etc
  ];
}
```

### Using Console Logs
Monitor scheduler activity:
- Check "Starting notification scheduler..."
- Check "Milestone triggered: eating_1h (60 minutes remaining)"
- Check "Local notification sent: eating_1h"
- Check "Telegram notification sent: eating_1h"

### Debugging State
Add to console:
```typescript
// In notificationScheduler.ts check()
console.log('Current state:', this.getState());
console.log('Active eating window:', fastingService.getActiveEatingWindow());
```

## Known Limitations

1. **Capacitor LocalNotifications** requires native build
   - Won't work in browser without mock
   - Needs actual device or simulator

2. **Background execution** depends on platform
   - iOS: Background execution limited
   - Android: More permissive background tasks
   - Web: Only works when page is active

3. **Time precision**
   - Scheduler runs every 60 seconds
   - Notifications may be up to 1 minute delayed

4. **Telegram rate limiting**
   - Too many notifications may trigger rate limits
   - Backend should implement throttling

## Success Criteria

Implementation is complete when:
- ✅ All TypeScript types defined
- ✅ NotificationService implemented
- ✅ NotificationScheduler implemented
- ✅ Store integration complete
- ✅ UI components created
- ✅ Settings persistence working
- ✅ Scheduler lifecycle management working
- ⚠️ Manual testing on device confirms notifications fire
- ⚠️ Telegram integration tested end-to-end
