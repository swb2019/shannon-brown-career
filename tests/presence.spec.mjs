import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes=['','about/','notes/','notes/security-system-outage/','notes/briefing-before-certainty/','work/hourglass-command/','practice/decision-brief/','privacy/'];

test('all pages, source links, images and accessibility',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const route of routes){
  const response=await page.goto(route);expect(response.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toBeVisible();
  expect(await page.locator('a[href="mailto:shannon@i-mail.se"]').count()).toBeGreaterThan(0);
  expect(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  if(info.project.name==='chromium'||info.project.name==='mobile')await page.screenshot({path:`qa-output/${info.project.name}-${route.replaceAll('/','-')||'home'}.png`,fullPage:true});
 }
});

test('static content survives JavaScript, image and font failures',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const page=await context.newPage();await page.route('**/*.{woff2,webp,png}',r=>r.abort());
 for(const route of routes){await page.goto('http://127.0.0.1:4180/shannon-brown-career/'+route);await expect(page.locator('main')).toBeVisible();await expect(page.locator('h1')).not.toBeEmpty();expect(await page.locator('a[href="mailto:shannon@i-mail.se"]').count()).toBeGreaterThan(0);}
 await context.close();
});

test('reduced motion avoids 3D requests; keyboard menu and contact work',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});const requests=[];page.on('request',r=>requests.push(r.url()));await page.goto('');
 await expect(page.getByRole('button',{name:'Reduced motion on'})).toBeVisible();
 expect(requests.some(u=>u.includes('instrument.js')||u.includes('three.'))).toBe(false);
 if(info.project.name==='mobile'){await page.locator('summary').press('Enter');await expect(page.locator('.mobile-menu')).toHaveAttribute('open','');await page.locator('.mobile-menu a').last().press('Escape');await expect(page.locator('summary')).toBeFocused();}
 await page.locator('.contact-email').press('Tab');
});

test('small-screen identity and reflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('');
 const cta=await page.getByRole('link',{name:'Explore the work'}).boundingBox();expect(cta.y+cta.height).toBeLessThanOrEqual(844);
 await page.setViewportSize({width:320,height:800});
 for(const route of routes){await page.goto(route);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
});

test('3D enhancement, pause persistence, keyboard controls, and context loss',async({page},info)=>{
 test.skip(info.project.name!=='chromium','The software-rendered enhancement is qualified once; other engines exercise the complete fallback.');
 await page.goto('');await expect(page.locator('#instrument')).toHaveClass(/is-ready/,{timeout:20000});
 await page.waitForTimeout(1600);
 await page.locator('#instrument-canvas').screenshot({path:'qa-output/instrument-poster.png',style:'.instrument-index{visibility:hidden}'});
 await page.getByRole('button',{name:'Explore the instrument'}).click();await expect(page.getByRole('button',{name:'Rotate left'})).toBeVisible();
 await page.getByRole('button',{name:'Rotate left'}).press('Enter');await page.getByRole('button',{name:'Reset view'}).click();
 await page.getByRole('button',{name:'Pause motion'}).click();await page.reload();await expect(page.getByRole('button',{name:'Resume motion'})).toBeVisible();
 await page.getByRole('button',{name:'Resume motion'}).click();await expect(page.locator('#instrument')).toHaveClass(/is-ready/);
 await page.locator('#instrument-canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
 await expect(page.locator('#instrument')).not.toHaveClass(/is-ready/);await expect(page.locator('.instrument-poster')).toBeVisible();
});

test('Save-Data and denied storage keep a complete page',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'connection',{value:{saveData:true,addEventListener(){}}});Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable');}});});
 const requests=[];page.on('request',r=>requests.push(r.url()));await page.goto('');await expect(page.getByRole('button',{name:'Data saving on'})).toBeVisible();expect(requests.some(u=>u.includes('instrument.js')||u.includes('three.'))).toBe(false);await expect(page.locator('h1')).toContainText('Clear judgment');
});

test('direct refresh and project-aware 404',async({page})=>{
 await page.goto('notes/security-system-outage/');await page.reload();await expect(page.locator('h1')).toContainText('security-system outage');
 const r=await page.goto('does-not-exist/deep/');expect(r.status()).toBe(404);await expect(page.getByRole('link',{name:'Return home'})).toHaveAttribute('href','https://swb2019.github.io/shannon-brown-career/');
});
