import { defineConfig, devices } from '@playwright/test'

const useProductionPreview = process.env.PLAYWRIGHT_USE_PREVIEW === '1'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4178',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: useProductionPreview
      ? 'npm run preview -- --host 127.0.0.1 --port 4178 --strictPort'
      : 'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort',
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: !process.env.CI && !useProductionPreview,
    timeout: 30_000,
  },
})
