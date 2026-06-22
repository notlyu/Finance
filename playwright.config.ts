import { PlaywrightTestConfig } from '@playwright/test';

// Порт сервера (server.js по умолчанию 3001). baseURL и webServer держим в синхроне.
const PORT = process.env.PORT || '3001';
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

const config: PlaywrightTestConfig = {
  timeout: 30000,
  testDir: './tests/e2e',
  use: {
    baseURL,
  },
  // Playwright сам поднимает сервер и ЖДЁТ готовности /health (вместо хрупкого
  // `node server.js & sleep 5`). В CI всегда стартует свежий; локально переиспользует
  // уже запущенный dev-сервер, если он есть.
  webServer: {
    command: 'node server.js',
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
};

export default config;
