import type { CapacitorConfig } from '@capacitor/cli';

// URL de l'application publiée (Lovable). Modifiable sans toucher au code : APP_URL=https://… npx cap sync
const url = process.env['APP_URL'] || 'https://pixel-perfect-display-706.lovable.app';

const config: CapacitorConfig = {
  appId: 'com.bladers.agentsia',
  appName: 'Agents IA',
  webDir: 'mobile/www',
  server: { url, cleartext: false, errorPath: 'index.html' },
  android: { allowMixedContent: false },
};
export default config;
