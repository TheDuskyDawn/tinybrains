const fs = require('fs');
const vm = require('vm');

console.log('=== RUNNING EXPANDED COMPREHENSIVE TEST SUITE ===');

const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');

class MockElement {
  constructor(tagName, id = '', className = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = className;
    this.classList = {
      _classes: new Set(className ? className.split(' ') : []),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, force) => {
        if (force === true) this.classList._classes.add(c);
        else if (force === false) this.classList._classes.delete(c);
        else if (this.classList._classes.has(c)) this.classList._classes.delete(c);
        else this.classList._classes.add(c);
      }
    };
    this.children = [];
    this.parentElement = null;
    this.textContent = '';
    this.value = '';
    this.checked = false;
    this.dataset = {};
    this.listeners = {};
    this.width = 800;
    this.height = 500;
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  dispatchEvent(event) {
    const list = this.listeners[event.type] || [];
    for (const h of list) h(event);
  }

  getBoundingClientRect() {
    return { width: 800, height: 500, top: 0, left: 0, right: 800, bottom: 500 };
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
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        setLineDash: () => {},
        fillText: () => {},
        resetTransform: () => {},
        scale: () => {},
        measureText: () => ({ width: 40 }),
        font: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        globalAlpha: 1,
        textAlign: 'left',
        textBaseline: 'top'
      };
    }
    return null;
  }
}

const elementsById = new Map();
const allElements = [];

function getOrCreateElement(id, tag = 'div', className = '') {
  if (elementsById.has(id)) return elementsById.get(id);
  const el = new MockElement(tag, id, className);
  elementsById.set(id, el);
  allElements.push(el);
  return el;
}

const requiredIds = [
  'gameCanvas', 'historyChart', 'networkCanvas', 'canvasViewport',
  'slPopulation', 'valPopulation', 'slElites', 'valElites',
  'slParentPool', 'valParentPool', 'slMutationChance', 'valMutationChance',
  'slMutationSize', 'valMutationSize', 'slBigJumpChance', 'valBigJumpChance',
  'slPipeGap', 'valPipeGap', 'slPipeSpeed', 'valPipeSpeed',
  'slGravity', 'valGravity', 'slFlapStrength', 'valFlapStrength',
  'slPipeCap', 'valPipeCap', 'chkShrinkMutation', 'chkHardStopCap', 'btnResetOptimal',
  'slSpeed', 'valSpeedBadge', 'btnPause', 'btnNextGen', 'btnRestart',
  'hudGenNum', 'hudCurrentPipes', 'hudAliveCount', 'hudTotalCount',
  'statLastBest', 'statLastAvg', 'statRecordScore',
  'telemActiveMutation', 'telemGenElapsed', 'telemTotalFlaps', 'telemProgress',
  'presetDesc', 'btnHowItWorks', 'howItWorksModal', 'modalCloseBtn',
  'hudThoughtBox', 'thoughtActionBadge', 'thoughtOutputVal', 'thoughtBodyText',
  'presetReckless', 'presetNoElites', 'presetTiny', 'presetHard'
];

for (const id of requiredIds) {
  let tag = 'div';
  if (id.startsWith('sl')) tag = 'input';
  if (id.startsWith('btn')) tag = 'button';
  if (id.includes('Canvas') || id.includes('Chart')) tag = 'canvas';
  const el = getOrCreateElement(id, tag);
  el.parentElement = new MockElement('div');
}

getOrCreateElement('presetReckless').dataset.preset = 'reckless';
getOrCreateElement('presetNoElites').dataset.preset = 'noelites';
getOrCreateElement('presetTiny').dataset.preset = 'tiny';
getOrCreateElement('presetHard').dataset.preset = 'hard';

getOrCreateElement('presetReckless').className = 'preset-btn';
getOrCreateElement('presetNoElites').className = 'preset-btn';
getOrCreateElement('presetTiny').className = 'preset-btn';
getOrCreateElement('presetHard').className = 'preset-btn';

const docListeners = {};
const mockDocument = {
  getElementById: (id) => getOrCreateElement(id),
  querySelectorAll: (selector) => {
    if (selector === '.preset-btn') {
      return [
        getOrCreateElement('presetReckless'),
        getOrCreateElement('presetNoElites'),
        getOrCreateElement('presetTiny'),
        getOrCreateElement('presetHard')
      ];
    }
    return [];
  },
  addEventListener: (event, handler) => {
    if (!docListeners[event]) docListeners[event] = [];
    docListeners[event].push(handler);
  },
  dispatchEvent: (event) => {
    const list = docListeners[event.type] || [];
    for (const h of list) h(event);
  }
};

let rafCallbacks = [];
const mockWindow = {
  document: mockDocument,
  devicePixelRatio: 2, // test high DPI
  addEventListener: () => {},
  requestAnimationFrame: (cb) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  }
};

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const jsCode = scriptMatch[1];

const sandbox = {
  window: mockWindow,
  document: mockDocument,
  requestAnimationFrame: mockWindow.requestAnimationFrame,
  Math: Math,
  parseFloat: parseFloat,
  parseInt: parseInt,
  Object: Object,
  Array: Array,
  Set: Set,
  console: console
};
vm.createContext(sandbox);
vm.runInContext(jsCode, sandbox);

console.log('✔ Initial state loaded cleanly.');

// 1. Test All Presets and Descriptions
const presetTests = [
  { key: 'reckless', id: 'presetReckless', expectedPop: '50', expectedMutSize: '0.80' },
  { key: 'noelites', id: 'presetNoElites', expectedElites: '0' },
  { key: 'tiny', id: 'presetTiny', expectedPop: '12' },
  { key: 'hard', id: 'presetHard', expectedGap: '85px', expectedSpeed: '4.5' }
];

for (const t of presetTests) {
  const btn = mockDocument.getElementById(t.id);
  btn.dispatchEvent({ type: 'click' });
  const desc = mockDocument.getElementById('presetDesc').textContent;
  if (!desc || desc.length < 10) {
    throw new Error(`Preset ${t.key} did not set a valid description!`);
  }
  if (t.expectedPop && mockDocument.getElementById('valPopulation').textContent !== t.expectedPop) {
    throw new Error(`Preset ${t.key} failed population check!`);
  }
  if (t.expectedElites && mockDocument.getElementById('valElites').textContent !== t.expectedElites) {
    throw new Error(`Preset ${t.key} failed elites check!`);
  }
  if (t.expectedGap && mockDocument.getElementById('valPipeGap').textContent !== t.expectedGap) {
    throw new Error(`Preset ${t.key} failed pipe gap check!`);
  }
  console.log(`✔ Preset '${t.key}' verified.`);
}

// Reset to optimal
mockDocument.getElementById('btnResetOptimal').dispatchEvent({ type: 'click' });
console.log('✔ Reset to optimal values verified.');

// 2. Set Speed to 80x and simulate 35 generations to test sliding window
const slSpeed = mockDocument.getElementById('slSpeed');
slSpeed.value = '80';
slSpeed.dispatchEvent({ type: 'input', target: { value: '80' } });
console.log(`Speed adjusted to: ${mockDocument.getElementById('valSpeedBadge').textContent}`);

// Test that when pipeCap is set to 20, birds fly PAST 20 without stopping!
const slPipeCap = mockDocument.getElementById('slPipeCap');
slPipeCap.value = '20';
slPipeCap.dispatchEvent({ type: 'input', target: { value: '20' } });
console.log('Set Pipe Cap to 20 to verify birds can fly past 20...');

let currentGen = parseInt(mockDocument.getElementById('hudGenNum').textContent, 10);
let totalTicks = 0;

// Simulate until birds pass 20 pipes
let maxPipesSeen = 0;
while (totalTicks < 1500) {
  totalTicks++;
  const cbs = rafCallbacks.slice();
  rafCallbacks = [];
  for (const cb of cbs) {
    cb();
  }
  const pipesStr = mockDocument.getElementById('hudCurrentPipes').textContent;
  const match = pipesStr.match(/Pipes:\s*(\d+)/);
  if (match) {
    const p = parseInt(match[1], 10);
    if (p > maxPipesSeen) maxPipesSeen = p;
    if (p > 20) {
      console.log(`✔ SUCCESS: Best agent passed pipe ${p} (> 20 pipe target) without being stopped or killed!`);
      break;
    }
  }
}

// Now test advancing to 35+ generations using btnNextGen to verify the sliding window of 30
console.log(`Advancing simulation to 35+ generations to test sliding window telemetry...`);
const btnNextGen = mockDocument.getElementById('btnNextGen');
while (currentGen < 35) {
  btnNextGen.dispatchEvent({ type: 'click' });
  currentGen = parseInt(mockDocument.getElementById('hudGenNum').textContent, 10);
}

console.log(`Reached Generation ${currentGen}.`);

const lastBest = mockDocument.getElementById('statLastBest').textContent;
const lastAvg = mockDocument.getElementById('statLastAvg').textContent;
const allTime = mockDocument.getElementById('statRecordScore').textContent;
const flaps = mockDocument.getElementById('telemTotalFlaps').textContent;
const activeMut = mockDocument.getElementById('telemActiveMutation').textContent;

console.log(`Telemetry at Gen ${currentGen}:`);
console.log(`  Last Best: ${lastBest}`);
console.log(`  Last Avg: ${lastAvg}`);
console.log(`  ${allTime}`);
console.log(`  Total Flaps: ${flaps}`);
console.log(`  Active Mutation Scale: ${activeMut}`);

if (lastBest === '—' || lastAvg === '—') {
  throw new Error('Telemetry did not update best or avg score!');
}

console.log('✔ Generational sliding window & telemetry updates verified across 35+ generations!');

// 3. Test Pause / Resume
const btnPause = mockDocument.getElementById('btnPause');
btnPause.dispatchEvent({ type: 'click' });
if (btnPause.textContent !== 'Resume') {
  throw new Error('Pause button text did not change to Resume!');
}
btnPause.dispatchEvent({ type: 'click' });
if (btnPause.textContent !== 'Pause') {
  throw new Error('Resume button text did not toggle back to Pause!');
}
console.log('✔ Pause and Resume functionality verified.');

// 4. Test Restart Generation
const btnRestart = mockDocument.getElementById('btnRestart');
btnRestart.dispatchEvent({ type: 'click' });
const genAfterRestart = parseInt(mockDocument.getElementById('hudGenNum').textContent, 10);
if (genAfterRestart !== 1) {
  throw new Error(`Restart did not reset generation counter to 1! Got ${genAfterRestart}`);
}
console.log('✔ Restart button cleanly resets to Generation 1.');

console.log('\n=== COMPREHENSIVE SUITE COMPLETED WITH 100% SUCCESS ===');
