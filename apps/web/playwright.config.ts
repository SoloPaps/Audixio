import { defineConfig, devices } from '@playwright/test';

/** Port du serveur e2e : E2E_PORT, 4321 par défaut. */
const port = process.env.E2E_PORT || '4321';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'off',
  },
  webServer: {
    command: 'node scripts/e2e-ui-serveur.mjs',
    cwd: '../..',
    url: `http://127.0.0.1:${port}/dev/composants`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ASTRO_TELEMETRY_DISABLED: '1',
      AUDIGY_DEV_TOOLBAR: 'off',
      NETLIFY_DEV: 'true',
      E2E_PORT: port,
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'test-anon-key-not-a-secret',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
