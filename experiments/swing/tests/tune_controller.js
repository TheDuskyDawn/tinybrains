// tune_controller.js
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

function evaluate(params, verbose = false) {
  const { kp, kd, switchAngle, switchOmega, energyPumpGain } = params;
  let successes = 0;
  const numSeeds = 20;
  const g = 9.8;
  const friction = 0.05;
  const motorStrength = 4.0;
  const episodeLength = 12.0;
  const totalSteps = Math.round(episodeLength / DT);
  const last4SecSteps = Math.round(4.0 / DT);
  const startStepLast4 = totalSteps - last4SecSteps;

  for (let gen = 0; gen < numSeeds; gen++) {
    const world = generateWorld(gen, episodeLength, 0.5);
    let theta = world.theta0;
    let omega = world.omega0;
    let balancedCountLast4 = 0;

    for (let step = 0; step < totalSteps; step++) {
      if (step === world.kick1Step) {
        omega += world.kick1Val;
        omega = Math.max(-8, Math.min(8, omega));
      }
      if (step === world.kick2Step) {
        omega += world.kick2Val;
        omega = Math.max(-8, Math.min(8, omega));
      }

      let desiredTorque = 0;
      // Energy
      const E = 0.5 * omega * omega + g * Math.cos(theta);
      const E_target = g;

      if (Math.abs(theta) < switchAngle && Math.abs(omega) < switchOmega) {
        // PD controller
        desiredTorque = -kp * theta - kd * omega;
      } else {
        // Energy pumping controller:
        // Classic pendulum swing-up: u = k * (E - E_target) * sign(omega * cos(theta))
        // Or if simple torque in direction of omega:
        // Let's test standard energy pumping:
        if (Math.abs(theta) < 0.6) {
          // near top but maybe too fast: brake or PD
          desiredTorque = -kp * theta - kd * omega;
        } else {
          // Pump energy in direction of omega
          // If E > E_target, brake (opposite of omega)!
          if (E > E_target + 0.5) {
            desiredTorque = -Math.sign(omega) * motorStrength;
          } else {
            desiredTorque = (omega >= 0 ? 1 : -1) * motorStrength;
          }
        }
      }

      let output = Math.max(-1, Math.min(1, desiredTorque / motorStrength));
      const torque = output * motorStrength;

      const alpha = g * Math.sin(theta) + torque - friction * omega;
      omega += alpha * DT;
      omega = Math.max(-8, Math.min(8, omega));
      theta += omega * DT;
      while (theta > Math.PI) theta -= 2 * Math.PI;
      while (theta <= -Math.PI) theta += 2 * Math.PI;

      const isBalanced = (Math.abs(theta) < 0.2 && Math.abs(omega) < 1.5);
      if (step >= startStepLast4 && isBalanced) {
        balancedCountLast4++;
      }
    }

    const pct = balancedCountLast4 / last4SecSteps;
    if (pct >= 0.80) successes++;
    if (verbose) {
      console.log(`Seed ${gen}: ${(pct * 100).toFixed(1)}% (${pct >= 0.8 ? 'PASS' : 'FAIL'})`);
    }
  }
  return successes;
}

console.log("Testing with braking on excess energy:");
evaluate({ kp: 30, kd: 5, switchAngle: 0.5, switchOmega: 2.5 }, true);
