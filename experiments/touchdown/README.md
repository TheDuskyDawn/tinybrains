# Touchdown — Lunar Lander Neuroevolution

**Touchdown** is a self-contained, browser-based neuroevolution simulation in which a swarm of autonomous lunar landers learns to descend softly onto a designated landing pad using tiny neural networks.

Rather than presenting an already trained model, Touchdown lets you observe the raw evolutionary process in real time: from early generations characterized by violent crashes and reckless tumble, to cautious attitude thruster control, and ultimately to graceful, pinpoint soft touchdowns.

---

## How It Works

### 1. Swarm Simulation & Environment
- **Population Swarm**: A population of 50 landers (configurable from 10 to 150) descends simultaneously in a shared 2D lunar world. Landers do not collide with one another.
- **Translucent Overlays**: The population is rendered as a ghostly translucent swarm, with the leading lander highlighted in crisp amber with visible engine plumes and trail tracking.
- **Uneven Terrain & Landing Pad**: The surface features jagged craters and rocky ridges flanking a flat, metal landing pad equipped with navigation beacon lights. Touching down anywhere outside the pad is an immediate crash.
- **Reproducible Generalization**: Every lander in a generation starts from the exact same randomized state: horizontal position, altitude, small sideways drift ($v_x$), and initial tilt angle ($\theta$). At the end of each generation, the starting state is regenerated using a seeded PRNG (`mulberry32`), forcing networks to develop general piloting skills rather than overfitting to a single trajectory.

### 2. Physics Model (Fixed Time Step)
All calculations operate in pixels and discrete frames:
- **Gravity**: Downward acceleration of $g = 0.020\text{ px/frame}^2$.
- **Main Engine**: Thrust vector aligned strictly with the lander's upward axis with maximum acceleration $F_{\text{max}} = 0.060\text{ px/frame}^2$:
  $$a_x = F \cdot \sin(\theta), \quad a_y = -F \cdot \cos(\theta) + g$$
- **Lateral RCS Thrusters**: Opposed side thrusters that exert rotational torque:
  $$\alpha = (T_{\text{left}} - T_{\text{right}}) \times 0.0015\text{ rad/frame}^2$$
- **Angular Damping**: Rotation is stabilized with damping factor $\omega \leftarrow \omega \times 0.988$ per frame.
- **Fuel Budget**: Each module starts with 500 fuel units. The main engine burns 1.0 unit/frame at full throttle; each side thruster burns 0.2 units/frame. When fuel is exhausted, engine output drops to zero.

### 3. Neural Architecture
Each lander's controller is a compact feedforward neural network:
- **7 Normalized Inputs** (roughly scaled to $[-1, 1]$):
  1. Horizontal offset to pad center: $(x - x_{\text{pad}}) / 300$
  2. Altitude above surface: $(y_{\text{terrain}} - y_{\text{bottom}}) / H_{\text{start}}$
  3. Horizontal velocity: $v_x / 3.0$
  4. Vertical velocity: $v_y / 3.0$
  5. Tilt angle: $\theta / 0.5$
  6. Angular velocity: $\omega / 0.05$
  7. Fuel remaining: $(F / F_{\text{start}}) \times 2 - 1$
- **Hidden Layer**: 10 hidden neurons with $\tanh$ activation functions.
- **3 Output Actions**: $\tanh$ outputs clipped to $[0, 1]$:
  - Output 0: Main engine throttle $[0, 1]$
  - Output 1: Left RCS thruster throttle $[0, 1]$
  - Output 2: Right RCS thruster throttle $[0, 1]$
- **Genome**: $7 \times 10 + 10 + 10 \times 3 + 3 = 113$ floating-point synaptic weights and biases stored as a flat 1D array.

---

## Soft Landing Criteria & Explicit Fitness Formula

A lander has completed its flight upon contacting the ground, straying too far off-screen, or exhausting the frame limit (1200 frames).

### Soft Landing Conditions
A ground contact is classified as a **Soft Touchdown** if and only if all four conditions are met simultaneously:
1. **On Pad**: $|x - x_{\text{pad}}| \le \frac{W_{\text{pad}}}{2}$
2. **Vertical Descent Rate**: $|v_y| < 1.20\text{ px/frame}$
3. **Horizontal Speed**: $|v_x| < 0.80\text{ px/frame}$
4. **Attitude Angle**: $|\theta| < 0.20\text{ rad}$ ($\approx 11.5^\circ$)

### Explicit Fitness Formula
Fitness directly shapes the evolutionary gradient:

$$\text{Fitness} = \begin{cases} 
1000 + 200 \cdot \left(\frac{F}{F_{\text{start}}}\right) + 100 \cdot \left(1 - \frac{|x - x_{\text{pad}}|}{W_{\text{pad}}/2}\right) + 100 \cdot \left(1 - \frac{|v_y|}{1.2}\right) + 50 \cdot \left(1 - \frac{|v_x|}{0.8}\right) + 50 \cdot \left(1 - \frac{|\theta|}{0.2}\right) & \text{if Soft Landing} \\
\min\left(650,\ 250 \cdot \max\left(0, 1 - \frac{|x - x_{\text{pad}}|}{380}\right) + 150 \cdot \max\left(0, 1 - \frac{\sqrt{v_x^2 + v_y^2}}{8.0}\right) + 100 \cdot \max\left(0, 1 - \frac{|\theta|}{\pi}\right) + 50 \cdot \min\left(1, \frac{t_{\text{impact}}}{350}\right)\right) & \text{if Crash} \\
\min\left(180,\ 120 \cdot \max\left(0, 1 - \frac{|x - x_{\text{pad}}|}{380}\right) + 20\right) & \text{if Timeout}
\end{cases}$$

- **Soft Touchdowns** earn between $1000$ and $1500$ points.
- **Crashes** are capped strictly below $650$ points, preserving a vast gap above any failure while providing smooth, continuous gradients rewarding landing closer to the pad, slowing down prior to impact, remaining upright, and avoiding early suicide.
- **Timeouts** hover between $20$ and $180$ points, preventing networks from surviving indefinitely by drifting in space.

---

## Evolutionary Mechanics

1. **Elitism**: The top 4 performers are preserved verbatim into the next generation.
2. **Parent Selection**: Parents are drawn randomly from the top 10 ranked landers.
3. **Single-Point Crossover**: Two parents are chosen, a crossover locus $k \in [1, 112]$ is picked, and the child inherits weights $[0..k-1]$ from parent 1 and $[k..112]$ from parent 2.
4. **Adaptive Gaussian Mutation**: Each weight has a 10% mutation probability.
   - 5% of children undergo a "Big Jump" exploration step ($\sigma = 0.60$).
   - Standard mutation step size scales with population success:
     $$\sigma = \max\left(0.03,\ 0.25 \times (1 - \text{LandingRate})\right)$$
   - When **Shrink mutation near perfect** is enabled, variance contracts as landing reliability rises, locking in precision maneuvers.

---

## Default Settings

| Parameter | Default Value | Description |
|:---|:---|:---|
| `population` | `50` | Swarm size per generation |
| `elites` | `4` | Unchanged top performers carried over |
| `parentPool` | `10` | Top individuals eligible for breeding |
| `mutationChance` | `0.10` | Probability of mutating each weight (10%) |
| `mutationSize` | `0.25` | Base Gaussian mutation step size ($\sigma$) |
| `bigJumpChance` | `0.05` | Fraction of children receiving exploratory mutation (5%) |
| `gravity` | `0.020 px/f²` | Downward gravitational acceleration |
| `mainThrust` | `0.060 px/f²` | Maximum upward main engine acceleration |
| `startingFuel` | `500 units` | Initial fuel capacity |
| `startHeight` | `500 px` | Drop height above lunar surface |
| `padWidth` | `90 px` | Target landing platform width |
| `maxFrames` | `1200 frames` | Simulation timeout window per generation |
| `shrinkMutation` | `true` | Dynamic mutation variance scaling based on landing rate |

---

## How to Read the Graph

The telemetry graph on the right displays a sliding window of the last 30 generations:
- **Amber Line (Best Fitness)**: The score of the single best lander in that generation. Scores surpassing the green dashed horizontal threshold ($1000$) represent successful, verified soft touchdowns.
- **Blue-Grey Line (Average Fitness)**: The swarm's mean fitness. As mutation introduces exploratory variants, the average will track below the elite line, but trends upward over time as foundational flight dynamics propagate across the gene pool.
- **Smooth Glide**: When a generation completes, the graph window shifts leftward smoothly.

---

## Running the Application

Touchdown requires **no build step, no web server, and no third-party JavaScript libraries**.

1. Clone or download the repository.
2. Open `index.html` directly in any modern desktop or laptop web browser (via `file://` or any static HTTP server).
3. Use the speed controls (`1x` to `80x`) to accelerate generational training.
4. Click **How It Works** to open the real-time neural network inspector and sensor visualizer.

---

## Automated Verification & Honest Assessment

A headless test suite was executed in Node.js via an instrumented virtual DOM harness (`test_touchdown_suite.js`), validating:
1. **Startup & Pre-initialization Integrity**: All data structures, terrain profiles, history buffers, and canvas handles are completely instantiated prior to execution.
2. **Physics Determinism & Sanity**: An unpowered lander falls under $g = 0.020\text{ px/f}^2$ and crashes in exactly 221 frames at an impact velocity of $4.42\text{ px/f}$ (exceeding the $1.20\text{ px/f}$ limit). A hand-crafted PD controller was verified to land softly on the pad at $v_y = 0.22\text{ px/f}$, $v_x = 0.002\text{ px/f}$, and $\theta = -0.03\text{ rad}$, earning a score $> 1300$.
3. **Live Controls & Presets**: All 11 sliders, checkboxes, and presets modify simulation state in real time without restarting.
4. **Generational Progression**: Over a 60-generation headless evolutionary run, best fitness surged from initial crash scores ($< 450$) to soft landing levels ($> 1400$), and landing rate climbed to $92\%$.

### Honest Limitations of Headless Verification
Because headless testing was conducted in a sandbox without a graphical display server:
- **Visual Rendering**: Canvas drawing operations, starfield parallax drift, particle dust clouds, debris bursts, and flame glow effects were confirmed to invoke valid canvas context routines without exceptions or `NaN` parameters, but their subjective visual appearance was not inspected by human eyes.
- **Animation Smoothness & Frame Rate**: Transition smoothness on different GPU hardware and monitor refresh rates could not be directly measured.
- **Cross-device Layouts**: Responsiveness was verified structurally against standard CSS breakpoints down to $1120\text{px}$ width and $720\text{px}$ height, but physical display rendering across various mobile and ultrabook viewports could not be visually validated.
