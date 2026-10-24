import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1, retries: 0, maxFailures: 0,
  timeout: 45000, expect: {timeout: 15000},
  outputDir: 'artifacts/browser-test-results',
  reporter: [['list'], ['json', {outputFile: 'artifacts/browser-results.json'}]],
  use: {
    baseURL: 'http://127.0.0.1:4173', viewport: {width: 1280, height: 900},
    browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: {args: ['--enable-unsafe-swiftshader']}
  },
  webServer: {
    command: 'node tools/f0/serve-browser.mjs', url: 'http://127.0.0.1:4173/health',
    // The per-start release snapshot takes ~9 s on this machine; 60 s leaves room under load.
    reuseExistingServer: false, timeout: 60000,
    gracefulShutdown: {signal: 'SIGTERM', timeout: 1000}
  }
});
