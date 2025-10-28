import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workout.aicoach',
  appName: 'AI Workout Coach',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: ['*']
  }
};

export default config;
