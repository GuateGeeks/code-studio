import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests/performance', testMatch: 'phase-7.spec.mjs', fullyParallel: false, workers: 1, retries: 0, maxFailures: 1,
  timeout: 180000, expect: {timeout: 15000},
  outputDir: 'artifacts/f7-performance-test-results',
  reporter: [['list'], ['json', {outputFile: 'artifacts/f7-performance-results.json'}]],
  use: {
    baseURL: 'http://127.0.0.1:4193', viewport: {width: 1280, height: 900}, browserName: 'chromium',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: {args: ['--enable-unsafe-swiftshader']}
  },
  webServer: {
    command: 'GG_SHELL_PORT=4193 GG_RUNNER_PORT=4194 GG_SIMULATOR_PORT=4195 GG_LANGUAGE_PORT=4196 GG_SCENE3D_PORT=4201 GG_WEBAPP_PORT=4202 node tools/f0/serve-browser.mjs',
    url: 'http://127.0.0.1:4193/health', reuseExistingServer: false, timeout: 15000,
    gracefulShutdown: {signal: 'SIGTERM', timeout: 1000}
  }
});
