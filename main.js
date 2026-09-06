const media = matchMedia('(prefers-reduced-motion: reduce)');
const connection = navigator.connection;
let explicitPause = false;
try { explicitPause = localStorage.getItem('sb-motion') === 'paused'; } catch { /* Preferences are optional. */ }
let instrument, importing = false, failed = false;
const figure = document.querySelector('#instrument');
const motion = document.querySelector('.motion-toggle');
const explore = document.querySelector('#explore');
const controls = document.querySelector('#instrument-controls');
const reduced = () => media.matches || connection?.saveData === true;
const paused = () => reduced() || explicitPause;
function sync() {
  document.documentElement.dataset.motion = paused() ? 'paused' : 'running';
  if (motion) { motion.hidden = false; motion.textContent = media.matches ? 'Reduced motion on' : connection?.saveData ? 'Data saving on' : explicitPause ? 'Resume motion' : 'Pause motion'; motion.setAttribute('aria-pressed', String(paused())); motion.disabled = reduced(); }
  if (explore) explore.hidden = reduced() || failed;
  instrument?.setPaused(paused());
  if (reduced()) { figure?.classList.remove('is-ready'); if (controls) controls.hidden = true; explore?.setAttribute('aria-expanded','false'); }
  else if (instrument && !failed) figure?.classList.add('is-ready');
}
async function loadInstrument(interact=false) {
  if (!figure || reduced() || explicitPause || importing || failed) return;
  if (instrument) { if(interact) instrument.explore(true); return; }
  importing=true;
  try {
    const module = await import('./instrument.js');
    if (reduced() || explicitPause) return;
    instrument = await module.createInstrument(document.querySelector('#instrument-canvas'), () => { failed=true; figure.classList.remove('is-ready'); if(controls)controls.hidden=true; if(explore)explore.hidden=true; });
    if (failed) return;
    figure.classList.add('is-ready');
    if(interact)instrument.explore(true);
    sync();
  } catch { failed=true; figure.classList.remove('is-ready'); if(explore)explore.hidden=true; }
  finally { importing=false; }
}
motion?.addEventListener('click',()=>{explicitPause=!explicitPause;try{localStorage.setItem('sb-motion',explicitPause?'paused':'running');}catch{}sync();if(!paused())loadInstrument();});
media.addEventListener('change',()=>{sync();if(!paused())loadInstrument();});
connection?.addEventListener('change',()=>{sync();if(!paused())loadInstrument();});
explore?.addEventListener('click',async()=>{const open=explore.getAttribute('aria-expanded')!=='true';if(open&&explicitPause){explicitPause=false;try{localStorage.setItem('sb-motion','running');}catch{}sync();}await loadInstrument(open);if(!instrument||failed||reduced())return;controls.hidden=!open;explore.setAttribute('aria-expanded',String(open));explore.innerHTML=open?'Close exploration':'Explore the instrument <span aria-hidden="true">↗</span>';instrument.explore(open);});
controls?.addEventListener('click',e=>{const button=e.target.closest('[data-turn]');if(button)instrument?.turn(button.dataset.turn);});
figure?.addEventListener('pointermove',e=>{if(explore?.getAttribute('aria-expanded')==='true'){const b=figure.getBoundingClientRect();instrument?.point((e.clientX-b.left)/b.width*2-1,(e.clientY-b.top)/b.height*2-1);}});
figure?.addEventListener('pointerleave',()=>instrument?.point(0,0));
const menu=document.querySelector('.mobile-menu');
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(menu?.open){menu.open=false;menu.querySelector('summary').focus();}if(explore?.getAttribute('aria-expanded')==='true'){controls.hidden=true;explore.setAttribute('aria-expanded','false');explore.textContent='Explore the instrument ↗';instrument?.explore(false);explore.focus();}}});
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.open=false;}));
document.querySelector('.print-button')?.addEventListener('click',()=>window.print());
const printButton=document.querySelector('.print-button');if(printButton)printButton.hidden=false;
sync();
// Static content and its poster finish first. Never enhance reduced-motion or Save-Data visits.
if(figure&&!paused())window.addEventListener('load',()=>{if('requestIdleCallback'in window)requestIdleCallback(()=>loadInstrument(),{timeout:3000});else setTimeout(()=>loadInstrument(),1200);},{once:true});
