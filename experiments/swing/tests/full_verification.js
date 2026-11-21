// full_verification.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/tmp/node_modules/jsdom');

const DT = 0.02;

console.log("==================================================");
console.log("SWING PROJECT — FULL VERIFICATION SUITE");
console.log("==================================================\n");

// --- 1. DOMAIN SANITY CHECKS ---
console.log("--- 1. PHYSICS & DOMAIN SANITY CHECKS ---");

function stepPhysics(theta, omega, torque, g = 9.8, friction = 0.05) {
  const alpha = g * Math.sin(theta) + torque - friction * omega;
  omega += alpha * DT;
  omega = Math.max(-8, Math.min(8, omega));
  theta += omega * DT;
  while (theta > Math.PI) theta -= 2 * Math.PI;
  while (theta <= -Math.PI) theta += 2 * Math.PI;
  return { theta, omega };
}

// (a) Small swing period
{
  let theta = Math.PI - 0.1;
  let omega = 0.0;
  let prevOmega = 0;
  let crestTimes = [];
  for (let s = 0; s < 500; s++) {
    const t = s * DT;
    const res = stepPhysics(theta, omega, 0, 9.8, 0.0);
    if (prevOmega > 0 && res.omega <= 0) crestTimes.push(t);
    prevOmega = res.omega;
    theta = res.theta;
    omega = res.omega;
  }
  let periods = [];
  for (let i = 1; i < crestTimes.length; i++) periods.push(crestTimes[i] - crestTimes[i - 1]);
  const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;
  const theoretical = 2 * Math.PI * Math.sqrt(1 / 9.8);
  const err = Math.abs(avgPeriod - theoretical) / theoretical;
  console.log(`(a) Small swing period: ${avgPeriod.toFixed(4)}s (theo: ${theoretical.toFixed(4)}s, err: ${(err*100).toFixed(2)}%) -> PASS: ${err < 0.03}`);
}

// (b) Falls past 0.5 rad
{
  let theta = 0.01;
  let omega = 0.0;
  let fallTime = null;
  for (let s = 0; s < 200; s++) {
    const t = s * DT;
    if (Math.abs(theta) >= 0.5 && fallTime === null) fallTime = t;
    const res = stepPhysics(theta, omega, 0, 9.8, 0.0);
    theta = res.theta;
    omega = res.omega;
  }
  console.log(`(b) Falls past 0.5 rad: ${fallTime}s (expected 1.0s - 1.5s) -> PASS: ${fallTime >= 1.0 && fallTime <= 1.5}`);
}

// (c) Holding constant full torque from hanging position
{
  let theta = Math.PI;
  let omega = 0.0;
  let maxDeflection = 0;
  for (let s = 0; s < 1000; s++) {
    const res = stepPhysics(theta, omega, 4.0, 9.8, 0.05);
    theta = res.theta;
    omega = res.omega;
    let dev = Math.PI - Math.abs(theta);
    if (dev > maxDeflection) maxDeflection = dev;
  }
  const maxDeg = maxDeflection * 180 / Math.PI;
  console.log(`(c) Constant full torque max deflection from hanging: ${maxDeg.toFixed(2)}° (< 90°) -> PASS: ${maxDeg < 90}`);
}

// (d) Seed determinism
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function genWorld(gen) {
  const rng = mulberry32(gen * 7919 + 12345);
  const totalSteps = 600;
  const theta0 = Math.PI + (rng() * 0.6 - 0.3);
  const omega0 = rng() * 1.0 - 0.5;
  const kick1Step = Math.floor((0.60 + rng() * 0.12) * totalSteps);
  const kick1Val = (rng() < 0.5 ? -1 : 1) * 0.5 * (0.7 + rng() * 0.3);
  const kick2Step = Math.floor((0.78 + rng() * 0.14) * totalSteps);
  const kick2Val = (rng() < 0.5 ? -1 : 1) * 0.5 * (0.7 + rng() * 0.3);
  return { theta0, omega0, kick1Step, kick1Val, kick2Step, kick2Val };
}
{
  const w1_1 = genWorld(7);
  const w1_2 = genWorld(7);
  const w2 = genWorld(8);
  const passD = (JSON.stringify(w1_1) === JSON.stringify(w1_2)) && (JSON.stringify(w1_1) !== JSON.stringify(w2));
  console.log(`(d) Seed determinism (same seed identical, diff seed different) -> PASS: ${passD}`);
}

// (e) Network inputs in -1..1 and (f) Hand-written controller
{
  let controllerSuccesses = 0;
  let inputsInBounds = true;
  for (let g = 0; g < 20; g++) {
    const w = genWorld(g);
    let th = w.theta0;
    let om = w.omega0;
    let lastOut = 0;
    let balLast4 = 0;
    for (let s = 0; s < 600; s++) {
      if (s === w.kick1Step) om = Math.max(-8, Math.min(8, om + w.kick1Val));
      if (s === w.kick2Step) om = Math.max(-8, Math.min(8, om + w.kick2Val));

      const in0 = Math.sin(th);
      const in1 = Math.cos(th);
      const in2 = Math.max(-1, Math.min(1, om / 8));
      const in3 = lastOut;
      if (Math.abs(in0) > 1 || Math.abs(in1) > 1 || Math.abs(in2) > 1 || Math.abs(in3) > 1) {
        inputsInBounds = false;
      }

      const E = 0.5 * om * om + 9.8 * Math.cos(th);
      let torque = 0;
      if (Math.abs(th) < 0.5 && Math.abs(om) < 2.5) {
        torque = -30.0 * th - 5.0 * om;
      } else if (Math.abs(th) < 0.6) {
        torque = -30.0 * th - 5.0 * om;
      } else {
        if (E > 9.8 + 0.5) torque = -Math.sign(om) * 4.0;
        else torque = (om >= 0 ? 1 : -1) * 4.0;
      }
      lastOut = Math.max(-1, Math.min(1, torque / 4.0));
      torque = lastOut * 4.0;

      const alpha = 9.8 * Math.sin(th) + torque - 0.05 * om;
      om = Math.max(-8, Math.min(8, om + alpha * DT));
      th += om * DT;
      while (th > Math.PI) th -= 2 * Math.PI;
      while (th <= -Math.PI) th += 2 * Math.PI;

      if (s >= 400 && (Math.abs(th) < 0.2 && Math.abs(om) < 1.5)) balLast4++;
    }
    if (balLast4 / 200 >= 0.80) controllerSuccesses++;
  }
  console.log(`(e) All network inputs within [-1, 1] over full episode -> PASS: ${inputsInBounds}`);
  console.log(`(f) Hand-written controller: ${controllerSuccesses}/20 seeds balanced >= 80% in last 4s (target >= 18) -> PASS: ${controllerSuccesses >= 18}`);
}

console.log("\n--- 2. JSDOM & APPLICATION INTEGRATION ---");
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = () => ({
      clearRect: () => {}, fillRect: () => {}, strokeRect: () => {},
      beginPath: () => {}, closePath: () => {}, moveTo: () => {}, lineTo: () => {},
      arc: () => {}, stroke: () => {}, fill: () => {}, save: () => {}, restore: () => {},
      setLineDash: () => {}, fillText: () => {}, measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      scale: () => {}, translate: () => {}, rotate: () => {},
      shadowColor: '', shadowBlur: 0, fillStyle: '', strokeStyle: '', lineWidth: 1, font: ''
    });
    let rafCount = 0;
    w.requestAnimationFrame = (cb) => {
      if (rafCount++ < 10) setTimeout(cb, 0);
    };
  }
});

setTimeout(() => {
  const w = dom.window;
  const weights61 = w.eval("population.every(g => g.length === 61)");
  console.log(`Weight count exactly 61 for all individuals -> PASS: ${weights61}`);

  w.eval(`
    for (let g = 0; g < 5; g++) {
      const stepsNeeded = totalSteps - currentStep;
      for (let s = 0; s < stepsNeeded; s++) {
        stepSimulation();
      }
    }
  `);
  const genVal = w.eval("generation");
  const histLen = w.eval("historyData.length");
  console.log(`Generations ran: ${genVal}, History recorded: ${histLen} -> PASS: ${genVal > 5 && histLen >= 5}`);

  // Test sliders and presets
  w.document.getElementById("presetReckless").click();
  const recklessPass = w.eval("settings.mutationChance === 0.5 && settings.mutationSize === 1.0 && settings.shrinkMutation === false");
  console.log(`Preset 'Reckless mutation' updates settings -> PASS: ${recklessPass}`);

  w.document.getElementById("btnResetOptimal").click();
  const resetPass = w.eval("settings.mutationChance === 0.10 && settings.mutationSize === 0.25 && settings.shrinkMutation === true && settings.motorStrength === 4.0");
  console.log(`'Reset to optimal values' restores defaults -> PASS: ${resetPass}`);

  console.log("\nALL VERIFICATIONS COMPLETE.");
  process.exit(0);
}, 200);
