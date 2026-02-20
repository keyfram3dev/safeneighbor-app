import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'us.safeneighbor.app',
  appName: 'SafeNeighbor',
  webDir: 'build',
  server: {
    // Use the built web app
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#ef4444',
    },
    Geolocation: {
      // iOS requires NSLocationWhenInUseUsageDescription in Info.plist
    },
  },
};

export default config;
