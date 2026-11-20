const fs = require('fs');
const vm = require('vm');

console.log('=== STARTING HEADLESS VALIDATION FOR NEUROFLAP ===');

const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');

// Simple DOM element mock
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
    this.width = 600;
    this.height = 400;
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
    return { width: 600, height: 400, top: 0, left: 0, right: 600, bottom: 400 };
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

// Build mock document and DOM tree
const elementsById = new Map();
const allElements = [];

function getOrCreateElement(id, tag = 'div', className = '') {
  if (elementsById.has(id)) return elementsById.get(id);
  const el = new MockElement(tag, id, className);
  elementsById.set(id, el);
  allElements.push(el);
  return el;
}

// Preset elements matching index.html
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

// Set dataset for preset buttons
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
  devicePixelRatio: 1,
  addEventListener: () => {},
  requestAnimationFrame: (cb) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  }
};

// Extract JS script from HTML
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('FAIL: No <script> tag found in index.html');
  process.exit(1);
}
const jsCode = scriptMatch[1];

// Run script in vm sandbox
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

try {
  vm.runInContext(jsCode, sandbox);
  console.log('✔ Script parsed and executed initial tick without throwing errors.');
} catch (err) {
  console.error('FAIL: Exception during script execution:', err);
  process.exit(1);
}

// TEST 1: Initial Default Values & Sliders
console.log('\n--- Checking Initial Sliders & Defaults ---');
const popVal = mockDocument.getElementById('valPopulation').textContent;
const elitesVal = mockDocument.getElementById('valElites').textContent;
const speedBadge = mockDocument.getElementById('valSpeedBadge').textContent;
console.log(`Population display: ${popVal} (expected 50)`);
console.log(`Elites display: ${elitesVal} (expected 4)`);
console.log(`Speed badge: ${speedBadge} (expected 1x)`);
if (popVal !== '50' || elitesVal !== '4' || speedBadge !== '1x') {
  console.error('FAIL: Initial slider default displays mismatch!');
  process.exit(1);
}

// TEST 2: Presets Activation & Live Feedback
console.log('\n--- Testing Presets ---');
const btnHard = mockDocument.getElementById('presetHard');
btnHard.dispatchEvent({ type: 'click' });
const pipeGapAfterHard = mockDocument.getElementById('valPipeGap').textContent;
const pipeSpeedAfterHard = mockDocument.getElementById('valPipeSpeed').textContent;
const descAfterHard = mockDocument.getElementById('presetDesc').textContent;
console.log(`After 'Hard World' preset: PipeGap=${pipeGapAfterHard}, PipeSpeed=${pipeSpeedAfterHard}`);
console.log(`Preset Description: "${descAfterHard}"`);
if (!pipeGapAfterHard.includes('85') || !pipeSpeedAfterHard.includes('4.5')) {
  console.error('FAIL: Hard World preset did not apply expected values!');
  process.exit(1);
}

// TEST 3: Reset to Optimal Values
console.log('\n--- Testing Reset to Optimal Values ---');
const btnReset = mockDocument.getElementById('btnResetOptimal');
btnReset.dispatchEvent({ type: 'click' });
const pipeGapAfterReset = mockDocument.getElementById('valPipeGap').textContent;
const elitesAfterReset = mockDocument.getElementById('valElites').textContent;
console.log(`After Reset: PipeGap=${pipeGapAfterReset} (expected 130px), Elites=${elitesAfterReset} (expected 4)`);
if (!pipeGapAfterReset.includes('130') || elitesAfterReset !== '4') {
  console.error('FAIL: Reset button did not restore optimal parameters!');
  process.exit(1);
}

// TEST 4: Generational Evolution & Progress
console.log('\n--- Running Generational Evolution Simulation ---');
// Trigger frames via RAF callbacks
let initialGen = parseInt(mockDocument.getElementById('hudGenNum').textContent, 10);
console.log(`Starting at Generation ${initialGen}`);

// Simulate fast forward ticks
for (let frame = 0; frame < 500; frame++) {
  const cbs = rafCallbacks.slice();
  rafCallbacks = [];
  for (const cb of cbs) {
    cb();
  }
}

const currentGen = parseInt(mockDocument.getElementById('hudGenNum').textContent, 10);
const bestStat = mockDocument.getElementById('statLastBest').textContent;
const avgStat = mockDocument.getElementById('statLastAvg').textContent;
console.log(`Simulated 500 animation ticks: advanced to Generation ${currentGen}`);
console.log(`Telemetry stats: Last Best=${bestStat}, Last Avg=${avgStat}`);

if (currentGen <= initialGen) {
  console.error('FAIL: Generation counter did not advance after 500 ticks!');
  process.exit(1);
}
console.log('✔ Generations advance properly through natural selection!');

// TEST 5: Modal Toggle & Keyboard escape
console.log('\n--- Testing "How It Works" Modal ---');
const btnHow = mockDocument.getElementById('btnHowItWorks');
const modal = mockDocument.getElementById('howItWorksModal');
btnHow.dispatchEvent({ type: 'click' });
console.log(`Modal open state after click: ${modal.classList.contains('open')}`);
if (!modal.classList.contains('open')) {
  console.error('FAIL: Modal did not open when clicking "How it works" button!');
  process.exit(1);
}

mockDocument.dispatchEvent({ type: 'keydown', key: 'Escape' });
console.log(`Modal open state after Escape: ${modal.classList.contains('open')}`);
if (modal.classList.contains('open')) {
  console.error('FAIL: Modal did not close on Escape key!');
  process.exit(1);
}
console.log('✔ Modal dialog opened and closed cleanly.');

console.log('\n=== ALL HEADLESS CHECKS PASSED PERFECTLY! ===');
