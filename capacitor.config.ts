import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mealiez.app',
  appName: 'Mealiez',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
