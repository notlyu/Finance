import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  timeout: 30000,
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5000',
  },
};

export default config;
