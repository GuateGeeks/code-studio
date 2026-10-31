import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: 'tests/journey',
  timeout: 60000,
  workers: 1,
  reporter: 'line',
  use: {viewport: {width: 1366, height: 768}, serviceWorkers: 'block', launchOptions: {args: ['--host-resolver-rules=MAP gg-class.test 127.0.0.1', '--disable-features=LocalNetworkAccessChecks']}},
  webServer: {command: 'node tools/serve.mjs', port: 5310, reuseExistingServer: true}
});
