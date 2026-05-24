import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mealiez.app',
  appName: 'Mealiez',
  server: {
    url: 'https://portal.mealiez.in/',
    cleartext: false
  }
};

export default config;
