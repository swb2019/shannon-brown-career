import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',timeout:45000,fullyParallel:false,workers:1,retries:0,
 reporter:[['list'],['html',{outputFolder:'qa-output/report',open:'never'}]],
 outputDir:'qa-output/results',
 use:{baseURL:'http://127.0.0.1:4180/shannon-brown-career/',trace:'retain-on-failure'},
 webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4180/shannon-brown-career/',reuseExistingServer:!process.env.CI},
 projects:[
  {name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000},launchOptions:{args:['--enable-unsafe-swiftshader']}}},
  {name:'firefox',use:{...devices['Desktop Firefox']}},
  {name:'webkit',use:{...devices['Desktop Safari']}},
  {name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium',viewport:{width:390,height:844}}}
 ]
});
