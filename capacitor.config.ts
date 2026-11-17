import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.worldmatch.chat',
  appName: 'WorldMatch Chat',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
