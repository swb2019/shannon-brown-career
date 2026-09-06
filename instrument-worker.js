import { createInstrument } from './instrument-scene.js';
let instrument;
self.addEventListener('message',({data})=>{
  try {
    if(data.type==='init'){
      instrument=createInstrument(data.canvas,data.dimensions,()=>self.postMessage({type:'failed'}));
      self.postMessage({type:'ready'});
      return;
    }
    if(!instrument)return;
    if(data.type==='resize')instrument.resize(data.value);
    if(data.type==='visible')instrument.setVisible(data.value);
    if(data.type==='paused')instrument.setPaused(data.value);
    if(data.type==='explore')instrument.explore(data.value);
    if(data.type==='point')instrument.point(data.value.x,data.value.y);
    if(data.type==='turn')instrument.turn(data.value);
  } catch { self.postMessage({type:'failed'}); }
});
