const root = document.documentElement;
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let storedMotion = null;
try { storedMotion = localStorage.getItem('sb-motion'); } catch {}
let motionPaused = motionQuery.matches || storedMotion === 'paused';
let visual = null;
const toggle = document.querySelector('.motion-toggle');
const revealElements = document.querySelectorAll('.reveal');

function updateMotion() {
  root.classList.toggle('motion-paused', motionPaused);
  root.classList.toggle('js-motion', !motionPaused);
  toggle.setAttribute('aria-pressed', String(motionPaused));
  toggle.disabled = motionQuery.matches;
  toggle.querySelector('span').textContent = motionQuery.matches ? 'Reduced motion' : motionPaused ? 'Enable motion' : 'Pause motion';
  toggle.querySelector('svg').innerHTML = motionPaused
    ? '<path d="M3 2l7 5-7 5z" fill="currentColor"/>'
    : '<path d="M3 2v10M9 2v10" stroke="currentColor" stroke-width="2"/>';
  visual?.setPaused(motionPaused);
  if (!motionPaused && !visual && !motionQuery.matches) startArtwork();
}
toggle.addEventListener('click', () => {
  motionPaused = !motionPaused;
  try { localStorage.setItem('sb-motion', motionPaused ? 'paused' : 'enabled'); } catch {}
  updateMotion();
});
motionQuery.addEventListener('change', event => { motionPaused = event.matches; updateMotion(); });

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.07 });
  revealElements.forEach(element => observer.observe(element));
} else { revealElements.forEach(element => element.classList.add('is-visible')); }

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
function closeMenu(returnFocus = false) {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  mobileNav.hidden = true;
  if (returnFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) closeMenu(true); });
window.matchMedia('(min-width: 801px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
document.addEventListener('pointerdown', event => { if (!mobileNav.hidden && !mobileNav.contains(event.target) && !menuButton.contains(event.target)) closeMenu(); });

const progress = document.querySelector('.reading-progress');
let scrollQueued = false;
function updateProgress() {
  const range = root.scrollHeight - window.innerHeight;
  progress.style.width = `${range > 0 ? Math.min(100, Math.max(0, window.scrollY / range * 100)) : 0}%`;
  scrollQueued = false;
}
window.addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateProgress); } }, { passive: true });
window.addEventListener('resize', updateProgress, { passive: true });
updateProgress();

// The photograph remains the baseline: failure or unavailable WebGL never hides it.
// A subdivided, depth-displaced WebGL surface adds light, parallax, and an optical
// response to the original 3D artwork. No library or third-party runtime request.
let artworkStarted = false;
async function startArtwork() {
  if (artworkStarted || navigator.connection?.saveData) return;
  artworkStarted = true;
  const canvas = document.querySelector('#hero-canvas');
  const stage = document.querySelector('.hero-art');
  const sourceImage = document.querySelector('#hero-image');
  try {
    if (!sourceImage.complete) await new Promise((resolve, reject) => {
      sourceImage.addEventListener('load', resolve, { once: true });
      sourceImage.addEventListener('error', reject, { once: true });
    });
    if (!sourceImage.naturalWidth) return;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) return;
    const vertexSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      uniform vec2 u_pointer;
      uniform float u_time;
      uniform float u_motion;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        vec2 p = a_position;
        float depth = exp(-length(p-vec2(.22,0.)) * 1.25);
        p += u_pointer * depth * .022 * u_motion;
        p.y += sin(u_time * .38) * .007 * depth * u_motion;
        gl_Position = vec4(p * 1.035, 0., 1.);
      }`;
    const fragmentSource = `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform vec2 u_imageSize;
      uniform vec2 u_pointer;
      uniform float u_time;
      uniform float u_motion;
      uniform float u_hover;
      void main() {
        vec2 uv = v_uv;
        float canvasAspect = u_resolution.x / u_resolution.y;
        float imageAspect = u_imageSize.x / u_imageSize.y;
        if (canvasAspect > imageAspect) uv.y = (uv.y-.5) * imageAspect / canvasAspect + .5;
        else uv.x = (uv.x-.5) * canvasAspect / imageAspect + .5;
        vec3 original = texture2D(u_image, uv).rgb;
        float lightness = dot(original, vec3(.2126,.7152,.0722));
        vec2 toMouse = uv - (u_pointer*.22 + vec2(.64,.5));
        float lens = exp(-dot(toMouse,toMouse)*20.) * u_hover;
        vec2 drift = u_pointer * .009 * lightness * u_motion;
        vec2 ripple = normalize(toMouse+vec2(.001)) * sin(length(toMouse)*24.-u_time*.55) * .0015 * lens * u_motion;
        vec2 sampleUV = clamp(uv + drift + ripple, .002, .998);
        vec3 color = texture2D(u_image, sampleUV).rgb;
        float shift = .0009 * lightness * lens * u_motion;
        color.r = texture2D(u_image, sampleUV+vec2(shift,0.)).r;
        color.b = texture2D(u_image, sampleUV-vec2(shift,0.)).b;
        float breathe = 1.0 + sin(u_time*.38)*.018*u_motion;
        color *= breathe;
        color += vec3(.07,.08,.035) * lens * lightness * .24 * u_motion;
        gl_FragColor = vec4(color,1.);
      }`;
    const compile = (type, code) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, code); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('Artwork shader unavailable'); }
      return shader;
    };
    const program = gl.createProgram();
    const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertexShader); gl.attachShader(program, fragmentShader); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Artwork unavailable');
    gl.useProgram(program);
    gl.deleteShader(vertexShader); gl.deleteShader(fragmentShader);
    const vertices = [];
    const columns = 40, rows = 28;
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const x0 = x / columns * 2 - 1, x1 = (x + 1) / columns * 2 - 1;
      const y0 = y / rows * 2 - 1, y1 = (y + 1) / rows * 2 - 1;
      vertices.push(x0,y0,x1,y0,x0,y1,x0,y1,x1,y0,x1,y1);
    }
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, 'a_position'); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, sourceImage);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const uniforms = Object.fromEntries(['u_resolution','u_imageSize','u_pointer','u_time','u_motion','u_hover','u_image'].map(name => [name,gl.getUniformLocation(program,name)]));
    gl.uniform1i(uniforms.u_image,0); gl.uniform2f(uniforms.u_imageSize,sourceImage.naturalWidth,sourceImage.naturalHeight);
    let pointer = [0,0], target = [0,0], hover = 0, targetHover = 0;
    let paused = motionPaused, inView = true, frame = 0, elapsed = 0, last = 0, lost = false;
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      canvas.width = Math.round(stage.clientWidth * ratio); canvas.height = Math.round(stage.clientHeight * ratio);
      gl.viewport(0,0,canvas.width,canvas.height); gl.uniform2f(uniforms.u_resolution,canvas.width,canvas.height);
      if (paused) draw(last);
    };
    const draw = now => {
      frame = 0;
      if (lost) return;
      const dt = last ? Math.min((now-last)/1000,.05) : 0; last = now;
      if (!paused) elapsed += dt;
      pointer[0] += (target[0]-pointer[0])*.045; pointer[1] += (target[1]-pointer[1])*.045;
      hover += (targetHover-hover)*.04;
      gl.uniform2f(uniforms.u_pointer,pointer[0],pointer[1]); gl.uniform1f(uniforms.u_time,elapsed);
      gl.uniform1f(uniforms.u_motion,paused?0:1); gl.uniform1f(uniforms.u_hover,hover);
      gl.drawArrays(gl.TRIANGLES,0,vertices.length/2);
      if (!paused && inView && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const schedule = () => { if (!frame && !paused && inView && !document.hidden && !lost) { last = 0; frame = requestAnimationFrame(draw); } };
    const hero = document.querySelector('.hero');
    hero.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const bounds = hero.getBoundingClientRect();
      target = [(event.clientX-bounds.left)/bounds.width*2-1, 1-(event.clientY-bounds.top)/bounds.height*2]; targetHover = 1;
    }, { passive:true });
    hero.addEventListener('pointerleave', () => { target=[0,0]; targetHover=0; }, { passive:true });
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
    const visibility = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (!inView) { cancelAnimationFrame(frame); frame=0; } else schedule();
    }); visibility.observe(hero);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame=0; } else schedule(); });
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost=true; cancelAnimationFrame(frame); stage.classList.remove('is-live'); });
    visual = { setPaused(value) { paused=value; cancelAnimationFrame(frame); frame=0; draw(last); if (!paused) schedule(); } };
    resize(); draw(0); stage.classList.add('is-live');
  } catch { stage.classList.remove('is-live'); }
}
updateMotion();
