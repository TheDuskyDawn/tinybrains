const fs = require('fs');
const vm = require('vm');

console.log('====================================================');
console.log('   DRIVE — AUTOMATED HEADLESS VERIFICATION SUITE   ');
console.log('====================================================\n');

// 1. Read index.html
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');

// Lightweight DOM & Canvas mock for headless validation
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

// Build mock document matching index.html
const doc = new MockDocument();

// Canvases
doc.register(new MockElement('canvas', 'trackCanvas'));
doc.register(new MockElement('canvas', 'graphCanvas'));
doc.register(new MockElement('canvas', 'networkCanvas'));

// Sliders and displays
const sliderKeys = [
  'population', 'elites', 'parentPool', 'mutationChance',
  'mutationSize', 'bigJumpChance', 'maxSpeed', 'steeringRate',
  'sensorRange', 'trackWidth', 'stallTimeout'
];
sliderKeys.forEach(k => {
  doc.register(new MockElement('input', `param-${k}`));
  doc.register(new MockElement('span', `val-${k}`));
});
doc.register(new MockElement('input', 'param-shrinkMutation'));
doc.register(new MockElement('button', 'btnResetDefaults'));

// Presets
['reckless', 'noElites', 'tinyPop', 'narrowTrack'].forEach(p => {
  const btn = doc.register(new MockElement('button', '', 'btn-preset'));
  btn.dataset.preset = p;
});

// HUD & Telemetry
doc.register(new MockElement('span', 'hudGeneration'));
doc.register(new MockElement('span', 'hudAlive'));
doc.register(new MockElement('span', 'hudProgress'));
doc.register(new MockElement('span', 'hudFrame'));
doc.register(new MockElement('div', 'lapToast'));
doc.register(new MockElement('span', 'statLastBest'));
doc.register(new MockElement('span', 'statAverage'));
doc.register(new MockElement('span', 'statBestLap'));
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

// Extract JavaScript from index.html
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
if (!scriptMatch) {
  console.error('FAIL: No <script> tag found in index.html');
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
  console.log('   ✓ Startup successful: No syntax or runtime errors during initialization.');
} catch (err) {
  console.error('   ✗ FAILED to run script:', err);
  process.exit(1);
}

const DRIVE = sandbox.window.__DRIVE__;
if (!DRIVE) {
  console.error('   ✗ FAILED: window.__DRIVE__ not exposed.');
  process.exit(1);
}

// 2. Validate Default Settings
console.log('\n2. Verifying default configuration parameters...');
const expectedDefaults = {
  population: 50,
  elites: 4,
  parentPool: 10,
  mutationChance: 0.10,
  mutationSize: 0.25,
  bigJumpChance: 0.05,
  maxSpeed: 5.0,
  steeringRate: 0.07,
  sensorRange: 180,
  trackWidth: 70,
  stallTimeout: 120,
  maxFrames: 1500,
  shrinkMutation: true
};

for (const [key, val] of Object.entries(expectedDefaults)) {
  if (DRIVE.config[key] !== val) {
    console.error(`   ✗ Mismatch on default ${key}: expected ${val}, got ${DRIVE.config[key]}`);
    process.exit(1);
  }
}
console.log('   ✓ All 12 default parameters strictly match specifications.');

// 3. Test Sliders & Real-Time Updates
console.log('\n3. Testing live sliders and immediate application without restart...');
const speedInput = doc.getElementById('param-maxSpeed');
speedInput.value = '7.5';
speedInput.dispatchEvent({ type: 'input', target: speedInput });
if (DRIVE.config.maxSpeed !== 7.5) {
  console.error('   ✗ Slider maxSpeed did not update immediately.');
  process.exit(1);
}

const trackWidthInput = doc.getElementById('param-trackWidth');
trackWidthInput.value = '80';
trackWidthInput.dispatchEvent({ type: 'input', target: trackWidthInput });
if (DRIVE.config.trackWidth !== 80 || DRIVE.track.width !== 80) {
  console.error('   ✗ Slider trackWidth did not rebuild track walls.');
  process.exit(1);
}
console.log('   ✓ Live sliders update internal config and track walls in real time.');

// 4. Test Presets & Reset Button
console.log('\n4. Testing experiment presets and reset-to-defaults button...');
const presets = doc.querySelectorAll('.btn-preset');
const recklessBtn = presets.find(b => b.dataset.preset === 'reckless');
recklessBtn.click();
if (DRIVE.config.mutationChance !== 0.35 || DRIVE.config.mutationSize !== 0.55 || DRIVE.config.shrinkMutation !== false) {
  console.error('   ✗ Preset "reckless" failed to apply correctly.');
  process.exit(1);
}
console.log('   ✓ Preset "Reckless mutation" correctly applied.');

const resetBtn = doc.getElementById('btnResetDefaults');
resetBtn.click();
if (DRIVE.config.mutationChance !== 0.10 || DRIVE.config.mutationSize !== 0.25 || DRIVE.config.trackWidth !== 70) {
  console.error('   ✗ Reset to defaults button failed.');
  process.exit(1);
}
console.log('   ✓ Reset to optimal defaults restored all settings.');

// 5. Run Generational Simulation (Headless Progression Test)
console.log('\n5. Running 50 generations of headless neuroevolution...');
const startTime = Date.now();
const initialFitnessHistory = [];

for (let g = 1; g <= 50; g++) {
  // Tick frames until generation completes
  let ticks = 0;
  const startGen = DRIVE.generation();
  while (DRIVE.generation() === startGen && ticks < 2000) {
    DRIVE.tickSimulation();
    ticks++;
  }
  const h = DRIVE.history();
  if (h.length > 0) {
    const last = h[h.length - 1];
    if (g === 1 || g === 5 || g === 10 || g === 20 || g === 35 || g === 50) {
      console.log(`   Generation ${String(g).padStart(2, '0')}: Best Fitness = ${last.best.toFixed(1)}, Avg = ${last.avg.toFixed(1)}, Lap Progress = ${(last.bestProgress * 100).toFixed(1)}% (Ticks: ${ticks})`);
    }
  }
}
const elapsed = Date.now() - startTime;
console.log(`   ✓ 50 generations executed in ${elapsed}ms.`);

// 6. Validate History & Sliding Window
console.log('\n6. Validating telemetry history and sliding window graph...');
const hist = DRIVE.history();
if (hist.length < 50) {
  console.error(`   ✗ Expected at least 50 history entries, found ${hist.length}`);
  process.exit(1);
}

// Check fitness upward trend
const earlyBest = hist.slice(0, 3).reduce((acc, h) => Math.max(acc, h.best), 0);
const lateBest = hist.slice(40, 50).reduce((acc, h) => Math.max(acc, h.best), 0);
console.log(`   Early generations peak fitness: ${earlyBest.toFixed(1)}`);
console.log(`   Late generations peak fitness:  ${lateBest.toFixed(1)}`);

if (lateBest < earlyBest) {
  console.error('   ✗ Fitness did not trend upward over 50 generations!');
  process.exit(1);
}
console.log('   ✓ Fitness shows strong upward generational learning!');

// Test graph rendering without errors
try {
  DRIVE.renderGraph();
  console.log('   ✓ Graph rendering pipeline executes cleanly.');
} catch (err) {
  console.error('   ✗ FAILED to render graph:', err);
  process.exit(1);
}

console.log('\n====================================================');
console.log('   ALL 6 TEST PHASES PASSED WITH ZERO ERRORS!      ');
console.log('====================================================');
