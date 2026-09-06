// The page owns accessible controls. The worker owns GPU initialization and drawing.
export async function createInstrument(canvas, onFailure) {
  if (!canvas.transferControlToOffscreen || !window.Worker) throw new Error('Offscreen rendering unavailable');
  const worker = new Worker(new URL('./instrument-worker.js', import.meta.url), {type:'module'});
  let failed=false, visible=true, settled=false, resolveReady, rejectReady;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const send=(type,value)=>{if(!failed)worker.postMessage({type,value});};
  const size=()=>{const b=canvas.parentElement.getBoundingClientRect();return {width:b.width,height:b.height,pixelRatio:Math.min(devicePixelRatio,1.5)};};
  const resize=new ResizeObserver(()=>send('resize',size()));
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;send('visible',visible&&!document.hidden);},{threshold:.05});
  const visibility=()=>send('visible',visible&&!document.hidden);
  function fail(){if(failed)return;failed=true;clearTimeout(timeout);worker.terminate();resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',visibility);if(!settled)rejectReady(new Error('Rendering unavailable'));onFailure();}
  const timeout=setTimeout(fail,20000);
  worker.addEventListener('error',fail);
  worker.addEventListener('message',({data})=>{if(data.type==='failed')fail();if(data.type==='ready'&&!failed){settled=true;clearTimeout(timeout);resolveReady();}});
  const offscreen=canvas.transferControlToOffscreen();
  worker.postMessage({type:'init',canvas:offscreen,dimensions:size()},[offscreen]);
  resize.observe(canvas.parentElement);observer.observe(canvas);document.addEventListener('visibilitychange',visibility);
  await ready;
  return {setPaused:value=>send('paused',value),explore:value=>send('explore',value),point:(x,y)=>send('point',{x,y}),turn:value=>send('turn',value)};
}
