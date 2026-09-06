import { readFile, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { notes, caseBody } from './content.mjs';
const root=resolve(existsSync('.openai/hosting.json')?'dist':'.');
const routes=['index.html','about/index.html','notes/index.html',...notes.map(n=>`notes/${n.slug}/index.html`),'work/hourglass-command/index.html','practice/decision-brief/index.html','privacy/index.html','404.html'];
let errors=[];
for(const route of routes){
 const path=join(root,route),html=await readFile(path,'utf8');
 if((html.match(/<h1(?:\s|>)/g)||[]).length!==1)errors.push(`${route}: exactly one H1 required`);
 if(!html.includes('mailto:shannon@i-mail.se'))errors.push(`${route}: contact missing`);
 if(/{{|undefined|lorem ipsum|open to work|seeking (a |new )?opportunit|hire me/i.test(html))errors.push(`${route}: unfinished or prohibited copy`);
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 if(new Set(ids).size!==ids.length)errors.push(`${route}: duplicate IDs`);
 for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  const target=match[1];if(/^(https?:|mailto:|tel:|data:)/.test(target))continue;
  const [name,hash]=target.split('#');let dest=resolve(dirname(path),name||route.split('/').at(-1));
  if(name.endsWith('/'))dest=join(dest,'index.html');
  if(!existsSync(dest)){errors.push(`${route}: missing ${target}`);continue;}
  if(hash&&dest.endsWith('.html')){const other=await readFile(dest,'utf8');if(!other.includes(`id="${hash}"`))errors.push(`${route}: missing anchor ${target}`);}
 }
 for(const tag of html.matchAll(/<img\s[^>]+>/g)){if(!/\salt=/.test(tag[0])||!/\swidth=/.test(tag[0])||!/\sheight=/.test(tag[0]))errors.push(`${route}: image lacks alt/dimensions`);}
 for(const json of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g))try{JSON.parse(json[1]);}catch{errors.push(`${route}: invalid structured data`);}
}
const wordCount=s=>s.replace(/<[^>]*>/g,' ').trim().split(/\s+/).length;
for(const n of notes){const words=wordCount(n.body);console.log(`${n.slug}: ${words} words`);if(words<600||words>900)errors.push(`${n.slug}: outside 600–900 words`);for(const field of ['id','slug','title','summary','type','author','published','reviewed','visibility','judgment','assumptions','alternatives','indicators','references'])if(!n[field])errors.push(`${n.slug}: missing ${field}`);}
console.log(`Case study body: ${wordCount(caseBody)} words`);
const limits={'main.js':[75000,true],'styles.css':[50000,true],'assets/manrope-latin.woff2':[120000,false],'assets/instrument-poster-mobile.webp':[250000,false],'assets/instrument-poster.webp':[450000,false]};
for(const [file,[max,gzip]] of Object.entries(limits)){const bytes=await readFile(join(root,file));const size=gzip?gzipSync(bytes).length:bytes.length;console.log(`${file}: ${size} bytes${gzip?' gzip':''}`);if(size>max)errors.push(`${file}: over budget`);}
const enhanced=(await Promise.all(['instrument.js','instrument-worker.js','instrument-scene.js','assets/vendor/three.module.min.js','assets/vendor/three.core.min.js'].map(async f=>gzipSync(await readFile(join(root,f))).length))).reduce((a,b)=>a+b,0);
console.log(`Optional 3D: ${enhanced} bytes gzip`);if(enhanced>1500000)errors.push('Optional 3D exceeds budget');
const initial=(await Promise.all(['index.html','main.js','styles.css'].map(async f=>gzipSync(await readFile(join(root,f))).length))).reduce((a,b)=>a+b,0)+(await stat(join(root,'assets/manrope-latin.woff2'))).size+(await stat(join(root,'assets/instrument-poster-mobile.webp'))).size;
console.log(`Static mobile critical assets: ${initial} bytes`);if(initial>900000)errors.push('Initial static transfer exceeds budget');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log(`${routes.length} routes: links, anchors, metadata, content schema, and static budgets passed.`);
