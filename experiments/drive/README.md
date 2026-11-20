# DRIVE — Autonomous Neuroevolution Laboratory

**DRIVE** is an interactive, zero-dependency artificial life laboratory where a population of 50 tiny neural networks learns to drive race cars around a circuit using only 5 distance sensors (raycasts). 

The goal of this demonstration is to let you observe the evolutionary training process in real time: watching how a population of completely random, unguided controllers gradually discovers steering reflexes, braking points, apex clipping, and stable racing lines through natural selection alone.

Hosted live on GitHub Pages with zero external dependencies, no build steps, and no third-party libraries.

---

## What It Is

In traditional machine learning, autonomous driving systems are trained using supervised imitation learning or backpropagation against reward functions. In **DRIVE**, there are no gradients, no labeled datasets, and no predefined driving rules.

Each car starts with random synaptic weights. Some cars immediately veer into the nearest barrier; others drift forward a few pixels before stalling. Through Darwinian reproduction, single-point genetic crossover, and Gaussian weight mutations, successive generations retain successful traits while filtering out failures.

---

## How the Simulation Works

### 1. Shared World & Closed Track
- **50 Cars, Ghost Physics:** All 50 vehicles share a single track simultaneously and start together from the checkered start line. Cars ghost through one another (no car-car collisions), ensuring that selection pressure is strictly based on track mastery rather than traffic congestion.
- **Continuous Spline Track:** The circuit is generated from a fixed loop of control points interpolated with Catmull-Rom splines, creating a realistic racing course featuring high-speed straights, sweeping curves, a technical chicane, and a tight 180° hairpin turn.
- **Dynamic Track Width:** Adjusting track width immediately recalculates the left and right walls in real time without restarting the simulation.

### 2. Distance Sensors (Rays)
Each car projects 5 raycasts relative to its forward heading:
- **Angles:** `-60°`, `-30°`, `0°` (straight ahead), `+30°`, `+60°`.
- **Range:** Default `180 px` maximum range.
- **Output:** Normalized distance to the nearest wall ($0.0 = \text{wall collision}$, $1.0 = \text{clear track}$).

### 3. Neural Architecture (102 Weights)
The controller evaluates a feedforward network on every physics frame:
- **7 Inputs:**
  - 5 normalized raycast sensor values ($0.0 \dots 1.0$)
  - Normalized forward vehicle speed ($0.0 \dots 1.0$)
  - Normalized steering angle from previous frame ($-1.0 \dots +1.0$)
- **10 Hidden Neurons:** Hyperbolic tangent ($\tanh$) activation function providing non-linear spatial reasoning.
- **2 Outputs ($\tanh$):**
  - **Steering:** Turn rate ($-1.0$ full left to $+1.0$ full right).
  - **Throttle:** Acceleration and braking ($-1.0$ full brake to $+1.0$ full acceleration).
- **Weight Budget:** $7 \times 10 + 10 \text{ (biases)} + 10 \times 2 + 2 \text{ (biases)} = 102$ flat synaptic parameters.

### 4. Vehicle Physics
- **Speed Bounds:** Throttle accelerates or brakes between a minimum crawl speed of `0.5 px/frame` and a maximum speed of `5.0 px/frame`.
- **Dynamic Steering Dampening:** At higher velocities, steering responsiveness diminishes slightly, penalizing full-throttle entries into tight corners and demanding braking before the hairpin.
- **Fatal Wall Contact:** Touching either track wall immediately eliminates the car for the remainder of that generation.

### 5. Fitness Function & Anti-Stall Elimination
- **Score Formulation:**
  $$\text{Fitness} = (\text{Checkpoints Passed} \times 100) + (\text{Partial Progress to Next Checkpoint} \times 100) + (\text{Average Speed} \times 2.0)$$
- **Stall Elimination:** If a car fails to reach the next checkpoint within `120 frames`, it is eliminated. This prevents degenerate behaviors such as circling in place or idling on the straight.
- **Generation Duration:** A generation concludes when all 50 cars have crashed or stalled, or after a maximum safety ceiling of `1500 frames`.

### 6. Genetic Algorithm & Adaptive Annealing
- **Elitism:** The top 4 fittest genomes survive completely unmodified into the next generation.
- **Parent Selection & Crossover:** The remaining 46 vehicles are bred from the top 10 parents using single-point crossover.
- **Gaussian Mutation:** Approximately 10% of synaptic weights in each child genome undergo Gaussian perturbation.
- **Big-Jump Mutation:** A 5% chance grants an exploratory "big jump" mutation (step size 0.60) to escape local fitness plateaus.
- **Adaptive Annealing ("Shrink mutation near perfect"):** As the flock's best car approaches a full lap, the base mutation step size automatically scales down:
  $$\text{Step} = \max\left(0.03, 0.25 \times (1.0 - \text{Best Lap Progress})\right)$$
  This stabilizes high-precision cornering reflexes while preventing catastrophic degradation once a successful line is established.

---

## How to Read the Graph

The telemetry chart on the right displays a sliding window of the last 30 generations:

- **Amber Line (Best Fitness):** Represents the single highest fitness achieved in that generation. Sharp upward stair-steps mark generational breakthroughs—such as learning the braking zone for the hairpin or threading the chicane.
- **Blue-Grey Line (Average Fitness):** Represents the mean score across the entire flock.
- **Divergence vs. Convergence:**
  - *Large gap between lines:* Indicates active exploration and high diversity; the elites have found an advancement that the general population has not yet assimilated.
  - *Average line climbing toward the best line:* Indicates genetic convergence; the advantageous mutations have successfully replicated throughout the gene pool, establishing track mastery across the flock.

---

## Default Settings

| Parameter | Default Value | Description |
|:---|:---:|:---|
| **Population Size** | `50` | Total number of concurrent vehicles per generation |
| **Elites Kept** | `4` | Top genomes preserved without mutation |
| **Parent Pool** | `10` | Top-ranking candidate pool for breeding children |
| **Mutation Chance** | `0.10` | Probability of mutating any given synaptic weight (10%) |
| **Mutation Size** | `0.25` | Base Gaussian mutation step standard deviation |
| **Big-Jump Chance** | `0.05` | Fraction of children receiving exploratory step size `0.60` |
| **Max Speed** | `5.0 px/frame` | Upper speed limit under positive throttle |
| **Steering Rate** | `0.070 rad/frame` | Base turn rate under steering torque |
| **Sensor Range** | `180 px` | Maximum reach of distance raycasts |
| **Track Width** | `70 px` | Distance between left and right track walls |
| **Stall Timeout** | `120 frames` | Inactivity timer before eliminating stationary cars |
| **Max Gen Frames** | `1500 frames` | Maximum frame ceiling per generation |
| **Shrink Mutation** | `Enabled` | Automatically scales down mutation step size near lap completion |

### Included Experiment Presets
1. **Reckless Mutation:** High mutation probability (`0.35`) and large step size (`0.55`) with only 2 elites. Rapid chaos and sporadic discoveries, but struggles to retain delicate apex maneuvers.
2. **No Elites:** Zero elite preservation (`0 elites`). Demonstrates genetic drift, generational amnesia, and the risk of losing rare breakthroughs.
3. **Tiny Population:** Reduced population of `15 cars` and `5 parents`. Highlights evolutionary bottlenecks and reduced genetic variance.
4. **Narrow Track:** Track width narrowed to `46 px`. Demands extreme steering accuracy through apexes and punishes excessive corner entry speeds.

---

## How to Run It

### Option 1: Direct File Access
No server, installation, or terminal commands are necessary:
1. Clone or download this repository.
2. Double-click `index.html` or open it directly in any modern browser (Chrome, Firefox, Safari, Edge).
   ```bash
   open index.html
   # or on Linux:
   xdg-open index.html
   ```

### Option 2: Static Hosting (GitHub Pages)
1. Push `index.html` and `README.md` to your GitHub repository.
2. In the repository settings, navigate to **Pages** and enable GitHub Pages on the default branch root (`/`).
3. Access your published URL.

---

## Keyboard Shortcuts & Controls

- **Spacebar:** Toggle simulation pause / resume.
- **R:** Restart the simulation from Generation 1 with fresh random genomes.
- **1x – 80x Speed Pills:** Accelerate physics execution using fixed-step simulation.
- **How It Works Button:** Opens an animated neural network diagram displaying real-time synaptic weights and live activations of the current leading car.
