// test_checks_def.js
const DT = 0.02;

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateWorld(generation, episodeLength = 12, pushSize = 0.5) {
  const rng = mulberry32(generation * 7919 + 12345);
  const totalSteps = Math.round(episodeLength / DT);
  const theta0 = Math.PI + (rng() * 0.6 - 0.3);
  const omega0 = rng() * 1.0 - 0.5;

  const kick1Step = Math.floor((0.60 + rng() * 0.12) * totalSteps);
  const sign1 = rng() < 0.5 ? -1 : 1;
  const kick1Val = sign1 * pushSize * (0.7 + rng() * 0.3);

  const kick2Step = Math.floor((0.78 + rng() * 0.14) * totalSteps);
  const sign2 = rng() < 0.5 ? -1 : 1;
  const kick2Val = sign2 * pushSize * (0.7 + rng() * 0.3);

  return { theta0, omega0, kick1Step, kick1Val, kick2Step, kick2Val, totalSteps };
}

console.log("=== CHECK (d): Determinism of seeds ===");
const w1_a = generateWorld(5);
const w1_b = generateWorld(5);
const w2 = generateWorld(6);
const sameTwice = JSON.stringify(w1_a) === JSON.stringify(w1_b);
const diffSeeds = JSON.stringify(w1_a) !== JSON.stringify(w2);
console.log(`Same seed identical: ${sameTwice}, Diff seed different: ${diffSeeds}`);
console.log(`Check (d) passed? ${sameTwice && diffSeeds}`);

console.log("\n=== CHECK (f): Hand-written Controller ===");
// Let's implement the controller:
// "pump energy with torque in the direction of omega while far from the top,
//  then a PD controller torque = -kp*theta - kd*omega once the pendulum is within about 0.5 rad of upright and slow enough"
// "swings up and keeps the pendulum balanced for at least 80% of the last 4 seconds in at least 18 of 20 different seeds with the default settings, including the kicks."

function runControllerTest(kp = 35.0, kd = 6.0, switchAngle = 0.5, switchOmega = 3.0) {
  let successes = 0;
  const numSeeds = 20;
  const g = 9.8;
  const friction = 0.05;
  const motorStrength = 4.0;
  const episodeLength = 12.0;
  const totalSteps = Math.round(episodeLength / DT);
  const last4SecSteps = Math.round(4.0 / DT); // 200 steps
  const startStepLast4 = totalSteps - last4SecSteps; // from step 400 to 600

  let allInputsValid = true;

  for (let gen = 0; gen < numSeeds; gen++) {
    const world = generateWorld(gen, episodeLength, 0.5);
    let theta = world.theta0;
    let omega = world.omega0;
    let lastOutput = 0.0;
    let balancedCountLast4 = 0;

    for (let step = 0; step < totalSteps; step++) {
      // Check kicks
      if (step === world.kick1Step) {
        omega += world.kick1Val;
        omega = Math.max(-8, Math.min(8, omega));
      }
      if (step === world.kick2Step) {
        omega += world.kick2Val;
        omega = Math.max(-8, Math.min(8, omega));
      }

      // Check inputs:
      const in_sin = Math.sin(theta);
      const in_cos = Math.cos(theta);
      const in_om = Math.max(-1, Math.min(1, omega / 8));
      const in_last = lastOutput;
      if (Math.abs(in_sin) > 1.0001 || Math.abs(in_cos) > 1.0001 || Math.abs(in_om) > 1.0001 || Math.abs(in_last) > 1.0001) {
        allInputsValid = false;
      }

      // Controller logic:
      let desiredTorque = 0;
      // Upright is theta = 0.
      // If close to upright and not moving too fast:
      if (Math.abs(theta) < switchAngle && Math.abs(omega) < switchOmega) {
        // PD controller: torque = -kp * theta - kd * omega
        desiredTorque = -kp * theta - kd * omega;
      } else {
        // Energy pumping:
        // When swinging, if omega > 0 push clockwise (torque > 0), if omega < 0 push counter-clockwise (torque < 0)
        // If omega is very close to 0 near bottom, give a push to start
        if (Math.abs(omega) < 0.1) {
          desiredTorque = (theta > 0 ? 1 : -1) * motorStrength;
        } else {
          desiredTorque = (omega > 0 ? 1 : -1) * motorStrength;
        }
      }

      // Clamp output to -1..1 and scale by motorStrength
      let output = Math.max(-1, Math.min(1, desiredTorque / motorStrength));
      lastOutput = output;
      const torque = output * motorStrength;

      // Physics step
      const alpha = g * Math.sin(theta) + torque - friction * omega;
      omega += alpha * DT;
      omega = Math.max(-8, Math.min(8, omega));
      theta += omega * DT;
      while (theta > Math.PI) theta -= 2 * Math.PI;
      while (theta <= -Math.PI) theta += 2 * Math.PI;

      // Check balanced condition: |theta| < 0.2 and |omega| < 1.5
      const isBalanced = (Math.abs(theta) < 0.2 && Math.abs(omega) < 1.5);
      if (step >= startStepLast4 && isBalanced) {
        balancedCountLast4++;
      }
    }

    const pctLast4 = balancedCountLast4 / last4SecSteps;
    const ok = pctLast4 >= 0.80;
    if (ok) successes++;
    // console.log(`Seed ${gen}: ${(pctLast4 * 100).toFixed(1)}% balanced in last 4s (${ok ? 'PASS' : 'FAIL'})`);
  }

  console.log(`Controller succeeded in ${successes} / ${numSeeds} seeds.`);
  console.log(`Check (e) passed (all inputs in -1..1)? ${allInputsValid}`);
  console.log(`Check (f) passed (>= 18 / 20)? ${successes >= 18}`);
  return successes;
}

runControllerTest();
