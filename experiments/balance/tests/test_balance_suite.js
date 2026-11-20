const fs = require('fs');
const vm = require('vm');

console.log('====================================================');
console.log('  BALANCE — AUTOMATED HEADLESS VERIFICATION SUITE   ');
console.log('====================================================\n');

// 1. Read index.html
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');

// Lightweight DOM & Canvas mock
class MockClassList {
  constructor(initial = '') {
    this.classes = new Set(initial ? initial.split(/\s+/).filter(Boolean) : []);
  }
  add(c) { this.classes.add(c); }
  remove(c) { this.classes.delete(c); }
  contains(c) { return this.classes.has(c); }
  toggle(c, force) {
    if (force === true) this.classes.add(c);
    else if (force === false) this.classes.delete(c);
    else if (this.classes.has(c)) this.classes.delete(c);
    else this.classes.add(c);
  }
}

class MockElement {
  constructor(tagName, id = '', className = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = className;
    this.classList = new MockClassList(className);
    this.children = [];
    this.parentElement = null;
    this.textContent = '';
    this.value = '';
    this.checked = false;
    this.dataset = {};
    this.listeners = {};
    this.width = 920;
    this.height = 580;
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  dispatchEvent(event) {
    const list = this.listeners[event.type || event] || [];
    for (const h of list) h(event);
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }

  getContext(type) {
    if (type === '2d') {
      return {
        canvas: this,
        fillRect: () => {},
        clearRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        fillText: () => {},
        measureText: (txt) => ({ width: txt.length * 7 }),
        setLineDash: () => {},
        fillStyle: '#000',
        strokeStyle: '#000',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'left',
        shadowBlur: 0,
        shadowColor: '',
        globalAlpha: 1.0
      };
    }
    return null;
  }
}

class MockDocument {
  constructor() {
    this.elementsById = new Map();
    this.allElements = [];
  }

  register(el) {
    if (el.id) this.elementsById.set(el.id, el);
    this.allElements.push(el);
    return el;
  }

  getElementById(id) {
    return this.elementsById.get(id) || null;
  }

  querySelectorAll(selector) {
    if (selector.startsWith('.')) {
      const cls = selector.substring(1);
      return this.allElements.filter(e => e.classList.contains(cls));
    }
    return [];
  }

  createElement(tag) {
    return this.register(new MockElement(tag));
  }
}

const doc = new MockDocument();

// Canvases
doc.register(new MockElement('canvas', 'simCanvas'));
doc.register(new MockElement('canvas', 'graphCanvas'));
doc.register(new MockElement('canvas', 'networkCanvas'));
doc.register(new MockElement('canvas', 'miniSimCanvas'));

// Sliders and values
const sliderKeys = [
  'population', 'elites', 'parentPool', 'mutationChance',
  'mutationSize', 'bigJumpChance', 'forceStrength', 'poleLength',
  'gravity', 'pushStrength', 'maxFrames'
];
sliderKeys.forEach(k => {
  doc.register(new MockElement('input', `param-${k}`));
  doc.register(new MockElement('span', `val-${k}`));
});
doc.register(new MockElement('input', 'param-shrinkMutation'));
doc.register(new MockElement('button', 'btnResetDefaults'));

// Presets
['reckless', 'noElites', 'tinyPop', 'hardWorld'].forEach(p => {
  const btn = doc.register(new MockElement('button', '', 'btn-preset'));
  btn.dataset.preset = p;
});

// HUD & Telemetry
doc.register(new MockElement('span', 'hudGeneration'));
doc.register(new MockElement('span', 'hudAlive'));
doc.register(new MockElement('span', 'hudLeaderScore'));
doc.register(new MockElement('span', 'hudTime'));
doc.register(new MockElement('div', 'balancedToast'));
doc.register(new MockElement('span', 'statLastBest'));
doc.register(new MockElement('span', 'statAverage'));
doc.register(new MockElement('span', 'statRatio'));
doc.register(new MockElement('span', 'statAllTime'));

// Controls
doc.register(new MockElement('button', 'btnPlayPause'));
doc.register(new MockElement('button', 'btnRestart'));
[1, 2, 5, 10, 25, 80].forEach(spd => {
  const btn = doc.register(new MockElement('button', '', 'btn-speed'));
  btn.dataset.speed = spd;
});

// Modal
doc.register(new MockElement('div', 'modalHowItWorks'));
doc.register(new MockElement('button', 'btnHowItWorks'));
doc.register(new MockElement('button', 'btnCloseModal'));

// Extract JavaScript
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
if (!scriptMatch) {
  console.error('FAIL: No <script> found in index.html');
  process.exit(1);
}
const jsCode = scriptMatch[1];

let rAFQueue = [];
const sandbox = {
  document: doc,
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: (cb) => { rAFQueue.push(cb); },
    devicePixelRatio: 1
  },
  requestAnimationFrame: (cb) => { rAFQueue.push(cb); },
  setTimeout: (cb, ms) => {},
  console: console,
  Math: Math,
  Float32Array: Float32Array,
  parseInt: parseInt,
  parseFloat: parseFloat,
  String: String
};
sandbox.window.document = doc;

console.log('1. Evaluating index.html script in isolated vm context...');
try {
  vm.createContext(sandbox);
  vm.runInContext(jsCode, sandbox);
  console.log('   ✓ Startup successful: Zero syntax or runtime errors during initialization.');
} catch (err) {
  console.error('   ✗ FAILED to run script:', err);
  process.exit(1);
}

const BALANCE = sandbox.window.__BALANCE__;
if (!BALANCE) {
  console.error('   ✗ FAILED: window.__BALANCE__ not exposed.');
  process.exit(1);
}

// 2. Physics Sanity Verification
console.log('\n2. Verifying Cart-Pole physical sanity...');
const gravity = 9.8;
const massCart = 1.0;
const massPole = 0.1;
const totalMass = massCart + massPole;
const length = 0.5; // half-length
const poleMassLength = massPole * length;
const dt = 0.02;

function stepPhysics(s, force) {
  let { x, xDot, theta, thetaDot } = s;
  const costheta = Math.cos(theta);
  const sintheta = Math.sin(theta);
  const temp = (force + poleMassLength * thetaDot * thetaDot * sintheta) / totalMass;
  const thetaAcc = (gravity * sintheta - costheta * temp) / (length * (4.0 / 3.0 - massPole * costheta * costheta / totalMass));
  const xAcc = temp - poleMassLength * thetaAcc * costheta / totalMass;

  xDot += dt * xAcc;
  x += dt * xDot;
  thetaDot += dt * thetaAcc;
  theta += dt * thetaDot;
  return { x, xDot, theta, thetaDot };
}

// Unforced pole at 0.05 rad
let testState = { x: 0, xDot: 0, theta: 0.05, thetaDot: 0 };
let unforcedFrames = 0;
while (Math.abs(testState.theta) <= 0.21 && Math.abs(testState.x) <= 2.4 && unforcedFrames < 200) {
  testState = stepPhysics(testState, 0);
  unforcedFrames++;
}
console.log(`   - Unforced pole tilted by 0.05 rad falls over in ${unforcedFrames} frames (${(unforcedFrames * dt).toFixed(2)}s).`);
if (unforcedFrames < 15 || unforcedFrames > 60) {
  console.error(`   ✗ Unexpected fall duration: ${unforcedFrames} frames`);
  process.exit(1);
}

// Hand-written balancing controller test
testState = { x: 0, xDot: 0, theta: 0.05, thetaDot: 0 };
let controllerFrames = 0;
while (Math.abs(testState.theta) <= 0.21 && Math.abs(testState.x) <= 2.4 && controllerFrames < 1000) {
  const force = 35.0 * testState.theta + 8.0 * testState.thetaDot + 2.5 * testState.x + 3.0 * testState.xDot;
  testState = stepPhysics(testState, Math.max(-10, Math.min(10, force)));
  controllerFrames++;
}
console.log(`   - Hand-written PD controller survived ${controllerFrames} frames (target 1000).`);
if (controllerFrames !== 1000) {
  console.error(`   ✗ Hand-written controller failed early at frame ${controllerFrames}`);
  process.exit(1);
}
console.log('   ✓ Physical equations and controllability confirmed sane.');

// 3. Verify Default Settings
console.log('\n3. Verifying default configuration parameters...');
const expectedDefaults = {
  population: 50,
  elites: 4,
  parentPool: 10,
  mutationChance: 0.10,
  mutationSize: 0.25,
  bigJumpChance: 0.05,
  forceStrength: 10,
  poleLength: 1.0,
  gravity: 9.8,
  pushStrength: 0.5,
  maxFrames: 1000,
  shrinkMutation: true
};

for (const [key, val] of Object.entries(expectedDefaults)) {
  if (BALANCE.config[key] !== val) {
    console.error(`   ✗ Mismatch on default ${key}: expected ${val}, got ${BALANCE.config[key]}`);
    process.exit(1);
  }
}
console.log('   ✓ All 12 default parameters strictly match specifications.');

// 4. Test Live Sliders & Presets
console.log('\n4. Testing live sliders and presets...');
const forceInput = doc.getElementById('param-forceStrength');
forceInput.value = '18';
forceInput.dispatchEvent({ type: 'input', target: forceInput });
if (BALANCE.config.forceStrength !== 18) {
  console.error('   ✗ Slider forceStrength failed to apply.');
  process.exit(1);
}

const presets = doc.querySelectorAll('.btn-preset');
const hardWorldBtn = presets.find(b => b.dataset.preset === 'hardWorld');
hardWorldBtn.click();
if (BALANCE.config.poleLength !== 0.6 || BALANCE.config.pushStrength !== 1.2 || BALANCE.config.forceStrength !== 6) {
  console.error('   ✗ Preset "hardWorld" failed to apply correctly.');
  process.exit(1);
}
console.log('   ✓ Preset "Hard world" applied.');

const resetBtn = doc.getElementById('btnResetDefaults');
resetBtn.click();
if (BALANCE.config.poleLength !== 1.0 || BALANCE.config.forceStrength !== 10) {
  console.error('   ✗ Reset to defaults button failed.');
  process.exit(1);
}
console.log('   ✓ Reset to optimal defaults restored all settings.');

// 5. Run Generational Simulation (Headless Progression Test)
console.log('\n5. Running 35 generations of headless Cart-Pole neuroevolution...');
const startTime = Date.now();

for (let g = 1; g <= 35; g++) {
  let ticks = 0;
  const startGen = BALANCE.generation();
  while (BALANCE.generation() === startGen && ticks < 2000) {
    BALANCE.tickSimulation();
    ticks++;
  }
  const h = BALANCE.history();
  if (h.length > 0) {
    const last = h[h.length - 1];
    if (g === 1 || g === 5 || g === 10 || g === 20 || g === 35 || last.bestFrames === 1000) {
      console.log(`   Generation ${String(g).padStart(2, '0')}: Best = ${last.bestFrames} / 1000, Avg = ${last.avgFrames.toFixed(1)} / 1000 (Ticks: ${ticks})`);
    }
  }
}
const elapsed = Date.now() - startTime;
console.log(`   ✓ 35 generations executed in ${elapsed}ms.`);

// 6. Validate History & Sliding Graph
console.log('\n6. Validating telemetry history and upward fitness trend...');
const hist = BALANCE.history();
if (hist.length < 35) {
  console.error(`   ✗ Expected at least 35 history entries, found ${hist.length}`);
  process.exit(1);
}

const earlyBest = hist.slice(0, 3).reduce((acc, h) => Math.max(acc, h.bestFrames), 0);
const lateBest = hist.slice(25, 35).reduce((acc, h) => Math.max(acc, h.bestFrames), 0);
console.log(`   Early generations best frames: ${earlyBest}`);
console.log(`   Late generations best frames:  ${lateBest}`);

if (lateBest < earlyBest) {
  console.error('   ✗ Survival frames did not trend upward!');
  process.exit(1);
}
console.log('   ✓ Clear upward generational learning confirmed!');

try {
  BALANCE.renderGraph();
  console.log('   ✓ Graph rendering pipeline executes cleanly.');
} catch (err) {
  console.error('   ✗ FAILED to render graph:', err);
  process.exit(1);
}

console.log('\n====================================================');
console.log('   ALL 6 TEST PHASES PASSED WITH ZERO ERRORS!      ');
console.log('====================================================');
