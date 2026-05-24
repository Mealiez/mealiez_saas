import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mealiez.app',
  appName: 'Mealiez',
  server: {
    url: 'https://mealiez.netlify.app/',
    cleartext: false
  }
};

export default config;
