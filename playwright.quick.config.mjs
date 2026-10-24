import {defineConfig} from '@playwright/test';
import base from './playwright.config.mjs';

export default defineConfig({
  ...base,
  testDir: './tests/quick',
  outputDir: process.env.GG_TEST_TRACE_DIR ?? 'artifacts/test-runs/quick-traces',
  reporter: [['list'], ['json', {outputFile: process.env.GG_TEST_REPORT_FILE ?? 'artifacts/test-runs/quick-browser.json'}]],
  timeout: 30000
});
