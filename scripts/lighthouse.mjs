import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:'pipe'});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
await mkdir('qa-output/lighthouse',{recursive:true});const results=[];
try{
 for(let i=0;i<5;i++){
  const chrome=await launch({chromeFlags:['--headless','--no-sandbox','--enable-unsafe-swiftshader']});
  try{
   const result=await lighthouse('http://127.0.0.1:4180/shannon-brown-career/',{port:chrome.port,output:'json',onlyCategories:['performance'],logLevel:'error'}, {extends:'lighthouse:default',settings:{formFactor:'mobile',screenEmulation:{mobile:true,width:390,height:844,deviceScaleFactor:1,disabled:false},throttlingMethod:'simulate',throttling:{rttMs:150,throughputKbps:1638.4,cpuSlowdownMultiplier:4,requestLatencyMs:562.5,downloadThroughputKbps:1474.56,uploadThroughputKbps:675}}});
   const a=result.lhr.audits;results.push({run:i+1,lcp:a['largest-contentful-paint'].numericValue,cls:a['cumulative-layout-shift'].numericValue,tbt:a['total-blocking-time'].numericValue,score:result.lhr.categories.performance.score});
   await writeFile(`qa-output/lighthouse/run-${i+1}.json`,JSON.stringify(result.lhr));
  }finally{await chrome.kill();}
 }
 const median=k=>results.map(r=>r[k]).sort((a,b)=>a-b)[2];
 const summary={environment:'GitHub Actions Ubuntu / pinned Lighthouse / Chromium; emulated 390×844 mobile, simulated slow 4G and 4× CPU slowdown. Not real-device or field data.',runs:results,median:{lcp:median('lcp'),cls:median('cls'),tbt:median('tbt')},fieldStatus:'No field measurement collected; INP not certified.'};
 await writeFile('qa-output/lighthouse/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
 if(median('lcp')>2500||median('cls')>.1||median('tbt')>200)process.exitCode=1;
}finally{server.kill();}
