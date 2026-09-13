import { defineConfig } from '@playwright/test'

// Stretch/optional (see README): one smoke test covering the golden path
// end to end against the real mock server, not part of the required test
// suite (npm test / Jest covers that). Run with: npm run test:e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: [
    {
      command: 'npm run start-server',
      url: 'http://localhost:3005/users',
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})
