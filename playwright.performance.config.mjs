import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests/performance', fullyParallel: false, workers: 1, retries: 0, maxFailures: 1,
  timeout: 180000, expect: {timeout: 15000},
  outputDir: 'artifacts/performance-test-results',
  reporter: [['list'], ['json', {outputFile: 'artifacts/performance-results.json'}]],
  use: {
    baseURL: 'http://127.0.0.1:4193', viewport: {width: 1280, height: 900}, browserName: 'chromium',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: {args: ['--enable-unsafe-swiftshader']}
  },
  webServer: {
    command: 'GG_SHELL_PORT=4193 GG_RUNNER_PORT=4194 GG_SIMULATOR_PORT=4195 node tools/f0/serve-browser.mjs',
    url: 'http://127.0.0.1:4193/health', reuseExistingServer: false, timeout: 15000,
    gracefulShutdown: {signal: 'SIGTERM', timeout: 1000}
  }
});
