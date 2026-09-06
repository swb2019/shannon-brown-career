import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:'pipe'});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
await mkdir('qa-output/lighthouse',{recursive:true});const results=[];
const route=process.env.PERF_ROUTE||'';
const device=process.env.PERF_DEVICE||'mobile';
const mobile=device==='mobile';
try{
 for(let i=0;i<5;i++){
  const chrome=await launch({chromeFlags:['--headless','--no-sandbox','--enable-unsafe-swiftshader']});
  try{
   const result=await lighthouse('http://127.0.0.1:4180/shannon-brown-career/'+route,{port:chrome.port,output:'json',onlyCategories:['performance'],logLevel:'error'}, {extends:'lighthouse:default',settings:{formFactor:device,screenEmulation:{mobile,width:mobile?390:1440,height:mobile?844:1000,deviceScaleFactor:1,disabled:false},throttlingMethod:'simulate',throttling:mobile?{rttMs:150,throughputKbps:1638.4,cpuSlowdownMultiplier:4,requestLatencyMs:562.5,downloadThroughputKbps:1474.56,uploadThroughputKbps:675}:{rttMs:40,throughputKbps:10240,cpuSlowdownMultiplier:1,requestLatencyMs:40,downloadThroughputKbps:10240,uploadThroughputKbps:10240}}});
   const a=result.lhr.audits;results.push({run:i+1,lcp:a['largest-contentful-paint'].numericValue,cls:a['cumulative-layout-shift'].numericValue,tbt:a['total-blocking-time'].numericValue,score:result.lhr.categories.performance.score});
   await writeFile(`qa-output/lighthouse/run-${i+1}.json`,JSON.stringify(result.lhr));
  }finally{await chrome.kill();}
 }
 const median=k=>results.map(r=>r[k]).sort((a,b)=>a-b)[2];
 const summary={route,device,environment:mobile?'GitHub Actions Ubuntu / pinned Lighthouse / Chromium; emulated 390×844 mobile, simulated slow 4G and 4× CPU slowdown. Not real-device or field data.':'GitHub Actions Ubuntu / pinned Lighthouse / Chromium; emulated 1440×1000 desktop, 40 ms RTT, 10 Mbps and 1× CPU. Not real-device or field data.',runs:results,median:{lcp:median('lcp'),cls:median('cls'),tbt:median('tbt')},outliers:results.filter(r=>r.lcp>median('lcp')*1.2||r.tbt>Math.max(50,median('tbt')*1.2)),fieldStatus:'No field measurement collected; INP not certified.'};
 await writeFile('qa-output/lighthouse/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
 if(median('lcp')>2500||median('cls')>.1||median('tbt')>200)process.exitCode=1;
}finally{server.kill();}
