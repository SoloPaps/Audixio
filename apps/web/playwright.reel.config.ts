import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-reel',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: 'line',
  globalSetup: './e2e-reel/global-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:8888',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/e2e-reel-serveur.mjs',
    cwd: '../..',
    url: 'http://127.0.0.1:8888',
    reuseExistingServer: !process.env.CI,
    timeout: 900_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
