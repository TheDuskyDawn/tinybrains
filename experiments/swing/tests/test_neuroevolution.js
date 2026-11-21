// test_neuroevolution.js
const DT = 0.02;

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRandom(mean = 0, std = 1) {
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 <= 1e-7) u1 = Math.random();
  return mean + Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * std;
}

function createRandomGenome() {
  const g = new Float32Array(61);
  for (let i = 0; i < 61; i++) {
    // uniform in -1..1 or gaussian 0..0.5
    g[i] = gaussianRandom(0, 0.5);
  }
  return g;
}

function forwardNetwork(genome, inputs) {
  // 4 inputs, 10 hidden tanh, 1 output tanh
  // genome:
  // 0..39: W_in (4 * 10)
  // 40..49: b_h (10)
  // 50..59: W_out (10 * 1)
  // 60: b_out (1)
  const hidden = new Float32Array(10);
  for (let j = 0; j < 10; j++) {
    let sum = genome[40 + j];
    for (let i = 0; i < 4; i++) {
      sum += inputs[i] * genome[j * 4 + i];
    }
    hidden[j] = Math.tanh(sum);
  }

  let outSum = genome[60];
  for (let j = 0; j < 10; j++) {
    outSum += hidden[j] * genome[50 + j];
  }
  return Math.tanh(outSum);
}

function runGeneration(generation, population, settings) {
  const { episodeLength, motorStrength, g, friction, pushSize } = settings;
  const totalSteps = Math.round(episodeLength / DT);
  const rng = mulberry32(generation * 7919 + 12345);

  const theta0 = Math.PI + (rng() * 0.6 - 0.3);
  const omega0 = rng() * 1.0 - 0.5;

  const kick1Step = Math.floor((0.60 + rng() * 0.12) * totalSteps);
  const sign1 = rng() < 0.5 ? -1 : 1;
  const kick1Val = sign1 * pushSize * (0.7 + rng() * 0.3);

  const kick2Step = Math.floor((0.78 + rng() * 0.14) * totalSteps);
  const sign2 = rng() < 0.5 ? -1 : 1;
  const kick2Val = sign2 * pushSize * (0.7 + rng() * 0.3);

  const N = population.length;
  const thetas = new Float32Array(N).fill(theta0);
  const omegas = new Float32Array(N).fill(omega0);
  const lastOutputs = new Float32Array(N).fill(0);
  const fitnesses = new Float64Array(N).fill(0);
  const balancedSteps = new Int32Array(N).fill(0);
  const firstBalanced = new Float32Array(N).fill(-1);

  const inputs = new Float32Array(4);

  for (let step = 0; step < totalSteps; step++) {
    const t = step * DT;
    const isKick1 = (step === kick1Step);
    const isKick2 = (step === kick2Step);

    for (let i = 0; i < N; i++) {
      let th = thetas[i];
      let om = omegas[i];

      if (isKick1) {
        om += kick1Val;
        om = Math.max(-8, Math.min(8, om));
      }
      if (isKick2) {
        om += kick2Val;
        om = Math.max(-8, Math.min(8, om));
      }

      inputs[0] = Math.sin(th);
      inputs[1] = Math.cos(th);
      inputs[2] = Math.max(-1, Math.min(1, om / 8));
      inputs[3] = lastOutputs[i];

      const out = forwardNetwork(population[i], inputs);
      lastOutputs[i] = out;
      const torque = out * motorStrength;

      const alpha = g * Math.sin(th) + torque - friction * om;
      om += alpha * DT;
      om = Math.max(-8, Math.min(8, om));
      th += om * DT;
      while (th > Math.PI) th -= 2 * Math.PI;
      while (th <= -Math.PI) th += 2 * Math.PI;

      thetas[i] = th;
      omegas[i] = om;

      const isBalanced = (Math.abs(th) < 0.2 && Math.abs(om) < 1.5);
      if (isBalanced) {
        balancedSteps[i]++;
        if (firstBalanced[i] < 0) firstBalanced[i] = t;
      }

      // Fitness: (1 + cos(theta))/2 + 2 * balanced - 0.02 * (output)^2 - 0.02 * (omega/8)^2
      const stepFit = (1 + Math.cos(th)) * 0.5 +
        (isBalanced ? 2.0 : 0.0) -
        0.02 * (out * out) -
        0.02 * ((om / 8) * (om / 8));
      fitnesses[i] += stepFit;
    }
  }

  // Sort population by fitness descending
  const indices = Array.from({ length: N }, (_, i) => i);
  indices.sort((a, b) => fitnesses[b] - fitnesses[a]);

  const sortedPop = indices.map(idx => population[idx]);
  const sortedFit = indices.map(idx => fitnesses[idx]);
  const sortedSec = indices.map(idx => balancedSteps[idx] * DT);
  const sortedFirstBal = indices.map(idx => firstBalanced[idx]);

  const bestFit = sortedFit[0];
  const bestSec = sortedSec[0];
  const avgFit = sortedFit.reduce((a, b) => a + b, 0) / N;
  const avgSec = sortedSec.reduce((a, b) => a + b, 0) / N;

  return {
    sortedPop,
    sortedFit,
    sortedSec,
    sortedFirstBal,
    bestFit,
    bestSec,
    avgFit,
    avgSec,
    firstSwingUp: sortedFirstBal[0]
  };
}

function evolvePopulation(sortedPop, bestSec, settings) {
  const { population: popSize, elites, parentPool, mutationChance, mutationSize, bigJumpChance, shrinkMutation, episodeLength } = settings;
  const nextPop = [];

  // Keep elites
  for (let i = 0; i < elites && i < sortedPop.length; i++) {
    nextPop.push(new Float32Array(sortedPop[i]));
  }

  const progress = Math.max(0, Math.min(1, bestSec / episodeLength));
  const baseSigma = shrinkMutation ? Math.max(0.03, mutationSize * (1 - progress)) : mutationSize;

  const poolSize = Math.min(parentPool, sortedPop.length);

  while (nextPop.length < popSize) {
    // Pick two random parents from parent pool
    const p1Idx = Math.floor(Math.random() * poolSize);
    const p2Idx = Math.floor(Math.random() * poolSize);
    const p1 = sortedPop[p1Idx];
    const p2 = sortedPop[p2Idx];

    // Single-point crossover
    const child = new Float32Array(61);
    const cp = 1 + Math.floor(Math.random() * 60); // 1..60
    for (let k = 0; k < cp; k++) child[k] = p1[k];
    for (let k = cp; k < 61; k++) child[k] = p2[k];

    // Mutate
    const isBigJump = Math.random() < bigJumpChance;
    const sigma = isBigJump ? 0.6 : baseSigma;

    for (let k = 0; k < 61; k++) {
      if (Math.random() < mutationChance) {
        child[k] += gaussianRandom(0, sigma);
      }
    }
    nextPop.push(child);
  }

  return nextPop;
}

// Run 100 generations
const settings = {
  population: 50,
  elites: 4,
  parentPool: 10,
  mutationChance: 0.10,
  mutationSize: 0.25,
  bigJumpChance: 0.05,
  motorStrength: 4.0,
  g: 9.8,
  friction: 0.05,
  pushSize: 0.5,
  episodeLength: 12.0,
  shrinkMutation: true
};

console.log("Starting 100 generations test...");
let pop = Array.from({ length: settings.population }, () => createRandomGenome());
const history = [];
let firstSwingUpGen = -1;

for (let gen = 1; gen <= 100; gen++) {
  const res = runGeneration(gen, pop, settings);
  history.push(res);

  if (firstSwingUpGen < 0 && res.sortedSec.some(s => s > 0)) {
    firstSwingUpGen = gen;
  }

  if (gen % 10 === 0 || gen === 1) {
    console.log(`Gen ${gen}: Best Fit = ${res.bestFit.toFixed(1)}, Avg Fit = ${res.avgFit.toFixed(1)}, Best Bal = ${res.bestSec.toFixed(2)}s`);
  }

  pop = evolvePopulation(res.sortedPop, res.bestSec, settings);
}

// Report first 10 vs last 10
const first10 = history.slice(0, 10);
const last10 = history.slice(90, 100);

const avgBestFitFirst10 = first10.reduce((s, h) => s + h.bestFit, 0) / 10;
const avgBestSecFirst10 = first10.reduce((s, h) => s + h.bestSec, 0) / 10;
const avgBestFitLast10 = last10.reduce((s, h) => s + h.bestFit, 0) / 10;
const avgBestSecLast10 = last10.reduce((s, h) => s + h.bestSec, 0) / 10;

console.log("\n=== TREND REPORT ===");
console.log(`First swing-up generation: ${firstSwingUpGen >= 0 ? firstSwingUpGen : 'None'}`);
console.log(`Generations 1-10 : Avg Best Fitness = ${avgBestFitFirst10.toFixed(1)}, Avg Best Seconds Balanced = ${avgBestSecFirst10.toFixed(2)}s`);
console.log(`Generations 91-100: Avg Best Fitness = ${avgBestFitLast10.toFixed(1)}, Avg Best Seconds Balanced = ${avgBestSecLast10.toFixed(2)}s`);
console.log(`Fitness increased? ${avgBestFitLast10 > avgBestFitFirst10 ? 'YES' : 'NO'}`);
