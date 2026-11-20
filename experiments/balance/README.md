# BALANCE — Inverted Pendulum Neuroevolution Laboratory

**BALANCE** is an interactive, zero-dependency artificial life laboratory where a population of 50 tiny neural networks learns to balance an upright pole on a moving cart (the classic inverted pendulum problem) using only direct physical feedback.

The goal is to let you observe the evolutionary training process generation by generation in real time: watching how an initially helpless swarm of unguided controllers discovers corrective nudges, momentum damping, track centering, and resilience against sudden wind gusts.

Hosted live on GitHub Pages with zero external dependencies, no build steps, and no third-party libraries.

---

## What It Is

In control theory and reinforcement learning, the Cart-Pole inverted pendulum is a fundamental benchmark. Typically solved via linear-quadratic regulators (LQR) or deep reinforcement learning (DQN/PPO), **BALANCE** solves it through pure Darwinian natural selection without backpropagation or training sets.

Each controller starts with completely randomized synaptic weights. Most carts immediately dump their pole or slam into the track limits. By selecting the top performers, crossing over their genetic code, and introducing exploratory mutations, succeeding generations discover robust balancing reflexes.

---

## How the Simulation Works

### 1. Shared Track & Swarm Dynamics
- **50 Concurrent Systems:** 50 independent cart-pole systems run simultaneously across one shared physical rail and are rendered on top of each other as a translucent swarm. They do not collide or interfere with one another.
- **Track Bounds:** The track spans from $-2.4\text{ m}$ to $+2.4\text{ m}$ ($4.8\text{ m}$ total) with visual end bumpers. Carts leaving the track are immediately eliminated.
- **Fairness & Reproducibility:** Every cart within a generation starts from the exact same initial state: cart centered at $x=0$, with a slight random tilt (up to $\pm 0.05\text{ rad}$). Every cart also experiences the exact same sequence of random sideways wind impulses on the pole (every 3 seconds). A new pseudorandom sequence is generated each generation to prevent simple hardcoded memorization.

### 2. Physical Equations of Motion
The physics engine integrates the classical non-linear equations of motion using semi-implicit Euler integration at 50 Hz ($\Delta t = 0.02\text{ s}$):

$$\text{temp} = \frac{F + m \cdot l \cdot \dot{\theta}^2 \cdot \sin(\theta)}{M + m}$$

$$\ddot{\theta} = \frac{g \cdot \sin(\theta) - \cos(\theta) \cdot \text{temp}}{l \left( \frac{4}{3} - \frac{m \cdot \cos^2(\theta)}{M + m} \right)}$$

$$\ddot{x} = \text{temp} - \frac{m \cdot l \cdot \ddot{\theta} \cdot \cos(\theta)}{M + m}$$

Where:
- Cart mass $M = 1.0\text{ kg}$
- Pole mass $m = 0.1\text{ kg}$
- Pole half-length $l = 0.5\text{ m}$ (full length $1.0\text{ m}$)
- Gravity $g = 9.8\text{ m/s}^2$
- Time step $\tau = 0.02\text{ s}$

### 3. Neural Architecture (49 Weights)
Each vehicle is governed by a lightweight feedforward neural controller:
- **4 Normalized Inputs:**
  - Cart position: $x / 2.4$ ($-1 \dots 1$)
  - Cart velocity: $\dot{x} / 3.0$
  - Pole angle: $\theta / 0.21$ (normalized against the $12^\circ$ failure angle)
  - Pole angular velocity: $\dot{\theta} / 3.0$
- **8 Hidden Neurons:** Evaluated with hyperbolic tangent ($\tanh$) activation.
- **1 Output ($\tanh$):** Multiplied by the force parameter (default $10\text{ N}$) to yield continuous horizontal force applied to the cart.
- **Weight Budget:** $4 \times 8 + 8 \text{ (biases)} + 8 \times 1 + 1 \text{ (bias)} = 49$ flat synaptic parameters.

### 4. Failure Conditions & Fitness Function
- **Termination Thresholds:** A cart fails if the pole angle exceeds $|\theta| > 0.21\text{ rad}$ ($\approx 12^\circ$) or if the cart position exceeds $|x| > 2.4\text{ m}$.
- **Generational End:** A generation ends when all 50 carts have failed or when the maximum frame ceiling is reached (default 1,000 frames = 20 seconds).
- **Fitness Formula:**
  $$\text{Fitness} = \text{Frames Survived} + 10 \times \left(1 - \frac{|x|}{2.4}\right) - 20 \times \left(\frac{\sum |\theta|}{\text{Frames}}\right)$$
  - *Frames Survived:* Primary evolutionary driver. The user score reflects this directly (e.g. `1000 / 1000`).
  - *Center Bonus:* Rewards keeping the cart near the middle of the track.
  - *Flailing Penalty:* Penalizes erratic, high-angle oscillation so that smooth, upright balance dominates.

### 5. Genetic Algorithm & Adaptive Annealing
- **Elites:** The top 4 fittest genomes survive intact into the next generation.
- **Single-Point Crossover:** 46 children are created by combining genetic fragments from two randomly selected parents within the top 10 pool.
- **Gaussian Mutation:** Approximately 10% of weights in each child undergo Gaussian perturbation.
- **Big-Jump Mutation:** A 5% chance grants an exploratory step size of $0.60$ to dislodge the population from local behavioral traps.
- **Adaptive Annealing ("Shrink mutation near perfect"):** As the best score approaches 1,000 frames, mutation step size automatically scales down:
  $$\text{Step} = \max\left(0.03, 0.25 \times \left(1 - \frac{\text{Best Frames}}{\text{Max Frames}}\right)\right)$$
  This locks in high-precision micro-adjustments while preventing catastrophic forgetting.

---

## How to Read the Graph

The telemetry chart on the right tracks a sliding window of the last 30 generations:

- **Amber Line (Best Cart):** The maximum frames survived by any cart in that generation. Sharp jumps mark generational breakthroughs (e.g., learning to push against sudden wind impulses).
- **Blue-Grey Line (Flock Average):** The mean frames survived across all 50 carts.
- **Interpreting Convergence:**
  - *Large gap:* Active evolutionary exploration; elites have discovered a strategy not yet diffused across the swarm.
  - *Average line climbing toward the best line:* Population convergence; successful alleles have propagated across the gene pool.
  - *Plateau at 1,000 frames:* Full generational mastery of the inverted pendulum under external disturbances.

---

## Default Settings

| Parameter | Default Value | Description |
|:---|:---:|:---|
| **Population** | `50` | Total number of concurrent cart-poles |
| **Elites** | `4` | Top-performing genomes preserved without mutation |
| **Parent Pool** | `10` | Top candidate pool for breeding children |
| **Mutation Chance** | `0.10` | Probability of mutating any given weight (10%) |
| **Mutation Size** | `0.25` | Base standard deviation for Gaussian mutations |
| **Big-Jump Chance** | `0.05` | Fraction of children receiving exploratory step size `0.60` |
| **Force Strength** | `10 N` | Maximum motor force applied to the cart |
| **Pole Length** | `1.0 m` | Total pole length (half-length $l = 0.5\text{ m}$) |
| **Gravity** | `9.8 m/s²` | Downward gravitational acceleration |
| **Push Strength** | `0.5` | Magnitude of periodic lateral wind impulses on the pole |
| **Max Frames** | `1000` | Duration of each generation (20 seconds at 50 Hz) |
| **Shrink Mutation** | `Enabled` | Automatically scales down mutation step size near perfection |

### Included Experiment Presets
1. **Reckless Mutation:** High mutation probability (`0.35`) and step size (`0.55`) with only 2 elites. Rapid chaos and sudden discoveries, but struggles to retain delicate balancing reflexes.
2. **No Elites:** Zero elite preservation (`0 elites`). Demonstrates genetic drift and generational amnesia.
3. **Tiny Population:** Reduced population of `15 carts` and `5 parents`. Highlights evolutionary bottlenecks.
4. **Hard World:** Short pole (`0.6 m`), strong pushes (`1.2`), reduced motor force (`6 N`), and high gravity (`12.0 m/s²`). Extremely challenging dynamic environment.

---

## How to Run It

### Option 1: Direct File Access
No server or build setup required:
1. Double-click `index.html` or open it directly in any modern web browser:
   ```bash
   open index.html
   # or on Linux:
   xdg-open index.html
   ```

### Option 2: Static Hosting (GitHub Pages)
1. Push `index.html` and `README.md` to your GitHub repository.
2. Under repository **Settings > Pages**, enable GitHub Pages from the root directory (`/`).
3. Access your published URL.

---

## Keyboard Shortcuts & Controls

- **Spacebar:** Toggle simulation pause / resume.
- **R:** Restart the simulation from Generation 1 with randomized weights.
- **1x – 80x Speed Buttons:** Accelerate training using fixed-step simulation.
- **How It Works Button:** Opens an animated neural network diagram alongside a live mini cart-pole showing real-time controller inference.
