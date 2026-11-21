// test_jsdom.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/tmp/node_modules/jsdom');

console.log("Reading index.html...");
const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Mock Canvas 2D Context
function createMockContext() {
  return {
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    stroke: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    setLineDash: () => {},
    fillText: () => {},
    measureText: (text) => ({ width: text.length * 6 }),
    createLinearGradient: () => ({
      addColorStop: () => {}
    }),
    createRadialGradient: () => ({
      addColorStop: () => {}
    }),
    scale: () => {},
    translate: () => {},
    rotate: () => {},
    shadowColor: '',
    shadowBlur: 0,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: ''
  };
}

let uncaughtErrors = [];

const dom = new JSDOM(htmlContent, {
  runScripts: "dangerously",
  resources: "usable",
  beforeParse(window) {
    // Canvas getContext mock
    window.HTMLCanvasElement.prototype.getContext = function(type) {
      if (type === '2d') {
        if (!this._mockCtx) {
          this._mockCtx = createMockContext();
        }
        return this._mockCtx;
      }
      return null;
    };

    // requestAnimationFrame mock
    let lastTime = 0;
    window.requestAnimationFrame = function(callback) {
      // Don't auto-loop infinitely in test unless called
      return setTimeout(() => {
        callback(lastTime += 16);
      }, 0);
    };
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };

    window.addEventListener('error', (event) => {
      console.error("Window Error:", event.error || event.message);
      uncaughtErrors.push(event.error || event.message);
    });
  }
});

const { window } = dom;
const { document } = window;

// Allow DOMContentLoaded and initial scripts to fire
setTimeout(() => {
  console.log("\n=== 1. STARTUP & INITIALIZATION VERIFICATION ===");
  if (uncaughtErrors.length > 0) {
    console.error("FAILED: Errors during startup:", uncaughtErrors);
    process.exit(1);
  } else {
    console.log("PASS: No runtime errors at startup.");
  }

  // Access internal state from window or eval in window scope
  const checkWeights = window.eval(`
    (() => {
      if (!population || population.length === 0) return { error: "No population" };
      const lengths = population.map(g => g.length);
      const all61 = lengths.every(l => l === 61);
      return { count: population.length, all61, sampleLength: lengths[0] };
    })()
  `);

  console.log(`Population size: ${checkWeights.count}, Genome length: ${checkWeights.sampleLength}, All 61 weights? ${checkWeights.all61}`);
  if (!checkWeights.all61 || checkWeights.sampleLength !== 61) {
    console.error("FAILED: Weights count is not exactly 61!");
    process.exit(1);
  } else {
    console.log("PASS: Weight count is exactly 61.");
  }

  console.log("\n=== 2. RUNNING MULTIPLE GENERATIONS ===");
  // Fast forward by invoking stepSimulation and evolve directly or through animationLoop
  const genResult = window.eval(`
    (() => {
      const initialGen = generation;
      // Run 3 full generations
      for (let g = 0; g < 3; g++) {
        const stepsNeeded = totalSteps - currentStep;
        for (let s = 0; s < stepsNeeded; s++) {
          stepSimulation();
        }
      }
      renderSimulation();
      renderGraph();
      return {
        initialGen,
        currentGen: generation,
        historyLength: historyData.length,
        lastBest: historyData[historyData.length - 1].bestFit
      };
    })()
  `);
  console.log(`Generations run: from ${genResult.initialGen} to ${genResult.currentGen}. History items: ${genResult.historyLength}, Last best fit: ${genResult.lastBest.toFixed(1)}`);
  if (genResult.currentGen <= genResult.initialGen || genResult.historyLength < 3) {
    console.error("FAILED: Generations did not advance properly!");
    process.exit(1);
  } else {
    console.log("PASS: Several generations run and history recorded.");
  }

  console.log("\n=== 3. TESTING SLIDERS AND SETTINGS UPDATES ===");
  // Test slider inputs
  const sliderMotor = document.getElementById("sliderMotor");
  sliderMotor.value = "6.5";
  sliderMotor.dispatchEvent(new window.Event("input"));

  const sliderGravity = document.getElementById("sliderGravity");
  sliderGravity.value = "14.2";
  sliderGravity.dispatchEvent(new window.Event("input"));

  const sliderPop = document.getElementById("sliderPop");
  sliderPop.value = "30";
  sliderPop.dispatchEvent(new window.Event("input"));

  const chkShrink = document.getElementById("chkShrink");
  chkShrink.checked = false;
  chkShrink.dispatchEvent(new window.Event("change"));

  const settingsCheck = window.eval(`
    ({
      motorStrength: settings.motorStrength,
      gravity: settings.gravity,
      stagedPop: stagedSettings.population,
      shrinkMutation: settings.shrinkMutation
    })
  `);
  console.log("Updated settings:", settingsCheck);
  if (settingsCheck.motorStrength !== 6.5 || settingsCheck.gravity !== 14.2 || settingsCheck.stagedPop !== 30 || settingsCheck.shrinkMutation !== false) {
    console.error("FAILED: Sliders did not update settings correctly!");
    process.exit(1);
  } else {
    console.log("PASS: Sliders updated live and staged settings correctly.");
  }

  console.log("\n=== 4. TESTING EXPERIMENT PRESETS ===");
  // Click "Hard world"
  const btnHard = document.getElementById("presetHardWorld");
  btnHard.click();

  const hardWorldCheck = window.eval(`
    ({
      motorStrength: settings.motorStrength,
      friction: settings.friction,
      pushSize: settings.pushSize
    })
  `);
  console.log("Hard world preset applied:", hardWorldCheck);
  if (hardWorldCheck.motorStrength !== 2.5 || hardWorldCheck.friction !== 0.25 || hardWorldCheck.pushSize !== 0.4) {
    console.error("FAILED: Hard world preset not applied correctly!");
    process.exit(1);
  } else {
    console.log("PASS: Presets apply correctly.");
  }

  // Click "Reset to optimal values"
  const btnReset = document.getElementById("btnResetOptimal");
  btnReset.click();

  const resetCheck = window.eval(`
    ({
      motorStrength: settings.motorStrength,
      friction: settings.friction,
      pushSize: settings.pushSize,
      stagedPop: stagedSettings.population,
      mutationChance: settings.mutationChance
    })
  `);
  console.log("Optimal values restored:", resetCheck);
  if (resetCheck.motorStrength !== 4.0 || resetCheck.friction !== 0.05 || resetCheck.pushSize !== 0.5 || resetCheck.stagedPop !== 50 || resetCheck.mutationChance !== 0.10) {
    console.error("FAILED: Reset to optimal values failed!");
    process.exit(1);
  } else {
    console.log("PASS: Reset to optimal values restored all defaults.");
  }

  console.log("\n=== 5. TESTING GRAPH SLIDING WINDOW (> 30 GENS) ===");
  const graphSlideCheck = window.eval(`
    (() => {
      // Run until historyData has 35 generations
      while (historyData.length < 35) {
        const stepsNeeded = totalSteps - currentStep;
        for (let s = 0; s < stepsNeeded; s++) {
          stepSimulation();
        }
      }
      renderGraph();
      return {
        totalHistory: historyData.length,
        currentGen: generation
      };
    })()
  `);
  console.log(`Graph history now has ${graphSlideCheck.totalHistory} items. Gen: ${graphSlideCheck.currentGen}.`);
  if (graphSlideCheck.totalHistory < 35) {
    console.error("FAILED: Graph sliding test failed!");
    process.exit(1);
  } else {
    console.log("PASS: Graph history fills and sliding window renders without errors.");
  }

  console.log("\n=== 6. TESTING MODAL AND RENDERING ===");
  const modalCheck = window.eval(`
    (() => {
      const btnOpen = document.getElementById("btnOpenModal");
      btnOpen.click();
      renderModalDiagrams();
      const isOpen = isModalOpen;
      const btnClose = document.getElementById("btnCloseModal");
      btnClose.click();
      return { isOpen, isClosedNow: !isModalOpen };
    })()
  `);
  console.log("Modal open & close check:", modalCheck);
  if (!modalCheck.isOpen || !modalCheck.isClosedNow) {
    console.error("FAILED: Modal toggle failed!");
    process.exit(1);
  } else {
    console.log("PASS: Modal diagram renders and opens/closes cleanly.");
  }

  console.log("\nALL JSDOM SUITE CHECKS PASSED SUCCESSFULLY!");
  process.exit(0);
}, 200);
