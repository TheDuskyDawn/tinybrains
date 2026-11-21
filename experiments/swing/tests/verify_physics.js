// verify_physics.js
const DT = 0.02;

function stepPhysics(theta, omega, torque, g = 9.8, friction = 0.05) {
  const alpha = g * Math.sin(theta) + torque - friction * omega;
  omega += alpha * DT;
  omega = Math.max(-8, Math.min(8, omega));
  theta += omega * DT;
  while (theta > Math.PI) theta -= 2 * Math.PI;
  while (theta <= -Math.PI) theta += 2 * Math.PI;
  return { theta, omega };
}

console.log("=== CHECK (a): Small swing period ===");
// start 0.1 rad from hanging down: hanging is PI. So theta = PI - 0.1
{
  let theta = Math.PI - 0.1;
  let omega = 0.0;
  let g = 9.8;
  let friction = 0.0;
  let torque = 0.0;
  let t = 0;
  let prevOmega = 0;
  let crestTimes = [];

  // Run for 10 seconds
  for (let step = 0; step < 500; step++) {
    t = step * DT;
    const res = stepPhysics(theta, omega, torque, g, friction);
    // Turning point when omega changes sign from positive to negative
    if (prevOmega > 0 && res.omega <= 0) {
      crestTimes.push(t);
    }
    prevOmega = res.omega;
    theta = res.theta;
    omega = res.omega;
  }
  let periods = [];
  for (let i = 1; i < crestTimes.length; i++) {
    periods.push(crestTimes[i] - crestTimes[i - 1]);
  }
  const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;
  const theoreticalPeriod = 2 * Math.PI * Math.sqrt(1 / 9.8);
  const err = Math.abs(avgPeriod - theoreticalPeriod) / theoreticalPeriod;
  console.log(`Measured period: ${avgPeriod.toFixed(4)}s, Theoretical: ${theoreticalPeriod.toFixed(4)}s, Error: ${(err * 100).toFixed(2)}%`);
  console.log(`Check (a) passed? ${err < 0.03}`);
}

console.log("\n=== CHECK (b): Falls past 0.5 rad ===");
// start of 0.01 rad from upright, falls past 0.5 rad between 1.0s and 1.5s
{
  let theta = 0.01;
  let omega = 0.0;
  let g = 9.8;
  let friction = 0.0;
  let torque = 0.0;
  let fallTime = null;
  for (let step = 0; step < 200; step++) {
    let t = step * DT;
    if (Math.abs(theta) >= 0.5 && fallTime === null) {
      fallTime = t;
    }
    const res = stepPhysics(theta, omega, torque, g, friction);
    theta = res.theta;
    omega = res.omega;
  }
  console.log(`Fall time past 0.5 rad: ${fallTime}s`);
  console.log(`Check (b) passed? ${fallTime >= 1.0 && fallTime <= 1.5}`);
}

console.log("\n=== CHECK (c): Constant full torque from hanging position ===");
// holding constant full torque from hanging position never lifts pendulum above 90 deg from hanging
{
  let theta = Math.PI;
  let omega = 0.0;
  let g = 9.8;
  let friction = 0.05;
  let motorStrength = 4.0;
  let torque = 4.0; // full positive torque
  let maxDeflectionFromHanging = 0; // measured as Math.abs(theta - PI)

  for (let step = 0; step < 1000; step++) {
    const res = stepPhysics(theta, omega, torque, g, friction);
    theta = res.theta;
    omega = res.omega;
    // deflection from hanging:
    // hanging is PI or -PI.
    let dev = Math.PI - Math.abs(theta); // 0 at PI, PI/2 at horizontal, PI at upright
    if (dev > maxDeflectionFromHanging) {
      maxDeflectionFromHanging = dev;
    }
  }
  const maxDeg = (maxDeflectionFromHanging * 180 / Math.PI);
  console.log(`Max deflection from hanging: ${maxDeg.toFixed(2)} deg (90 deg is horizontal)`);
  console.log(`Check (c) passed? ${maxDeg < 90}`);
}
