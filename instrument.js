import * as THREE from './assets/vendor/three.module.min.js';

// Original geometric sculpture. All meaning and controls live in semantic HTML.
export function createInstrument(canvas, onFailure) {
  const renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0x080e0d,1);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;
  const scene = new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);
  camera.position.set(0,.12,9.8);
  const sculpture=new THREE.Group();scene.add(sculpture);
  const resting=new THREE.Euler(.22,.64,-.20);
  sculpture.rotation.copy(resting);

  // A small studio environment gives the real glass and metal readable reflections.
  const studio=new THREE.Scene();studio.background=new THREE.Color(0x17221d);
  const panel=(color,intensity,x,y,z,w,h,ry=0,rx=0)=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
    mesh.material.color.multiplyScalar(intensity);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,0);studio.add(mesh);
  };
  panel(0xf3f3e9,2.5,-4,3,3,3,8,.6);panel(0xc8ddd0,2,5,1,1,2,9,-.7);
  panel(0xffffff,3.5,0,6,0,9,4,0,Math.PI/2);panel(0xdbfca9,2,-2,-3,2,1,5,.2);
  panel(0xffffff,3,0,0,-5,3,7);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(studio,.035,.1,50,{size:64});
  scene.environment=environment.texture;
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xedf2dc,0x0a160f,1.5));
  const key=new THREE.DirectionalLight(0xffffff,3.5);key.position.set(-3,4,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0xdbfca9,2);rim.position.set(4,0,-3);scene.add(rim);
  const metal=new THREE.MeshStandardMaterial({color:0xadb7aa,metalness:1,roughness:.23,envMapIntensity:1.2});
  const edgeMetal=new THREE.MeshStandardMaterial({color:0x45544b,metalness:1,roughness:.32});
  const glass=new THREE.MeshPhysicalMaterial({color:0x668b73,metalness:.06,roughness:.18,transparent:true,opacity:.16,depthWrite:false,transmission:0,clearcoat:1,clearcoatRoughness:.2,envMapIntensity:.7});
  const citron=new THREE.MeshStandardMaterial({color:0xdbfca9,emissive:0xb4de75,emissiveIntensity:.8,metalness:.4,roughness:.24});
  function rectangle(w,h,r,target=new THREE.Shape()) {
    const x=-w/2,y=-h/2;
    target.moveTo(x+r,y);target.lineTo(x+w-r,y);target.quadraticCurveTo(x+w,y,x+w,y+r);target.lineTo(x+w,y+h-r);target.quadraticCurveTo(x+w,y+h,x+w-r,y+h);target.lineTo(x+r,y+h);target.quadraticCurveTo(x,y+h,x,y+h-r);target.lineTo(x,y+r);target.quadraticCurveTo(x,y,x+r,y);return target;
  }
  const plateGeometry=new THREE.ExtrudeGeometry(rectangle(2.72,3.5,.21),{depth:.1,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:12});
  plateGeometry.center();
  const frameShape=rectangle(2.91,3.69,.26);frameShape.holes.push(rectangle(2.74,3.52,.2,new THREE.Path()));
  const frameGeometry=new THREE.ExtrudeGeometry(frameShape,{depth:.16,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:12});frameGeometry.center();
  const plates=[];
  for(let i=0;i<3;i++){
    const group=new THREE.Group();const s=i-1;group.position.set(s*.42,s*.29,s*.64);group.rotation.z=s*.045;
    const pane=new THREE.Mesh(plateGeometry,glass);group.add(pane);
    const frame=new THREE.Mesh(frameGeometry,i===1?metal:edgeMetal);group.add(frame);
    // A second hairline on each edge catches light as the planes change perspective.
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(frameGeometry,28),new THREE.LineBasicMaterial({color:i===1?0xb9c5b4:0x597066,transparent:true,opacity:.38}));group.add(outline);
    for(const x of [-1.33,1.33])for(const y of [-1.67,1.67]){
      const fastener=new THREE.Mesh(new THREE.CylinderGeometry(.034,.034,.022,12),metal);fastener.rotation.x=Math.PI/2;fastener.position.set(x,y,.125);group.add(fastener);
    }
    sculpture.add(group);plates.push({group,base:group.position.clone()});
  }
  const seam=new THREE.Mesh(new THREE.BoxGeometry(.029,3.18,.045),citron);seam.position.set(1.73,.29,.74);sculpture.add(seam);
  const spine=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1.67,24),metal);spine.rotation.x=Math.PI/2;spine.position.set(-.7,-1.42,0);sculpture.add(spine);
  let frame=0,stopped=false,visible=true,paused=false,interactive=false,complete=false,start=0,previous=0,quality=0,windowStart=0,frameTimes=[];
  let targetX=0,targetY=0,x=0,y=0;
  const clamp=v=>Math.max(-.07,Math.min(.07,v));
  function fail(){if(stopped)return;stopped=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();renderer.dispose();environment.dispose();onFailure();}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail();},{once:true});
  function size(){if(stopped)return;const b=canvas.parentElement.getBoundingClientRect();if(!b.width||!b.height)return;renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();draw();}
  function draw(){if(stopped)return;try{renderer.render(scene,camera);}catch{fail();}}
  function tick(now){
    frame=0;if(stopped||paused||!visible||document.hidden)return;
    if(!start)start=now;
    if(previous){frameTimes.push(now-previous);if(!windowStart)windowStart=now;if(now-windowStart>=3000){const median=frameTimes.sort((a,b)=>a-b)[Math.floor(frameTimes.length/2)];if(median>33){if(quality===0){quality=1;renderer.setPixelRatio(1);glass.transmission=0;glass.transparent=true;glass.opacity=.78;glass.needsUpdate=true;size();}else{fail();return;}}windowStart=now;frameTimes=[];}}
    previous=now;
    const progress=Math.min(1,(now-start)/1400),ease=1-Math.pow(1-progress,3);
    if(!complete){plates.forEach(({group,base},i)=>{group.position.copy(base);group.position.x+=(i-1)*.5*(1-ease);group.position.z+=(i-1)*.3*(1-ease);});if(progress===1)complete=true;}
    x+=(targetX-x)*.09;y+=(targetY-y)*.09;sculpture.rotation.set(resting.x+y,resting.y+x,resting.z);
    draw();
    if(!complete||Math.abs(targetX-x)+Math.abs(targetY-y)>.0003)frame=requestAnimationFrame(tick);
    else{previous=0;windowStart=0;frameTimes=[];}
  }
  function run(){if(!frame&&!stopped&&!paused&&visible&&!document.hidden){previous=0;frame=requestAnimationFrame(tick);}}
  function stop(){cancelAnimationFrame(frame);frame=0;previous=0;}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?run():stop();},{threshold:.05});observer.observe(canvas);
  const resize=new ResizeObserver(size);resize.observe(canvas.parentElement);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():run());
  size();run();
  return {
    setPaused(value){paused=value;if(value){stop();complete=true;plates.forEach(({group,base})=>group.position.copy(base));x=targetX;y=targetY;draw();}else run();},
    explore(value){interactive=value;if(!value){targetX=0;targetY=0;}run();},
    point(px,py){if(!interactive||paused)return;targetX=clamp(px*.07);targetY=clamp(py*.07);run();},
    turn(direction){if(paused)return;if(direction==='reset'){targetX=0;targetY=0;}if(direction==='left')targetX=clamp(targetX-.025);if(direction==='right')targetX=clamp(targetX+.025);if(direction==='up')targetY=clamp(targetY-.025);if(direction==='down')targetY=clamp(targetY+.025);run();}
  };
}
