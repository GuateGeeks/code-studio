import {defineConfig} from '@playwright/test';

// Partitions (tools/test/partitions.mjs) override ports, release root and
// outputs through the environment; the defaults are the canonical serial run.
const shellPort = process.env.GG_SHELL_PORT ?? '4173';

export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1, retries: 0, maxFailures: 0,
  timeout: 45000, expect: {timeout: 15000},
  outputDir: process.env.GG_TEST_OUTPUT_DIR ?? 'artifacts/browser-test-results',
  reporter: [['list'], ['json', {outputFile: process.env.GG_BROWSER_REPORT ?? 'artifacts/browser-results.json'}]],
  use: {
    baseURL: `http://127.0.0.1:${shellPort}`, viewport: {width: 1280, height: 900},
    browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: {args: ['--enable-unsafe-swiftshader']}
  },
  webServer: {
    command: 'node tools/f0/serve-browser.mjs', url: `http://127.0.0.1:${shellPort}/health`,
    // The per-start release snapshot takes ~9 s on this machine; 60 s leaves room under load.
    reuseExistingServer: false, timeout: 60000,
    gracefulShutdown: {signal: 'SIGTERM', timeout: 1000}
  }
});
