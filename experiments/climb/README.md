# Climb

**Climb** is a browser-based neuroevolution laboratory demonstrating how a population of tiny neural networks learns to solve the classic Mountain Car problem without backpropagation or hand-crafted policies.

An underpowered car starts in a valley and cannot climb the steep hill ahead on engine power alone. By trial, mutation, and crossover across generations, the population discovers that swinging backward up the opposite slope converts gravitational potential energy into kinetic momentum, allowing them to scale the summit and park at the flag.

The demo lets you watch the learning process unfold live—from the initial erratic twitches to synchronized resonant swinging and streamlined, energy-efficient summit ascents.

---

## How It Works

### 1. The Environment & Physics
The world operates in continuous 1D coordinates with fixed-step updates:
- **Position range:** $x \in [-1.2, 0.6]$. Left wall at $x = -1.2$ acts as an inelastic barrier (if $x < -1.2$, $x$ resets to $-1.2$ and negative velocity is zeroed).
- **Hill surface:** $h(x) = 0.45 \sin(3x) + 0.55$.
  - Valley trough: $x = -\pi/6 \approx -0.5236$ ($h = 0.10$).
  - Summit flag: $x = 0.45$ ($h \approx 0.9891$).
- **Physics step:**
  1. $v_{t+1} = v_t + (\text{force} \times \text{power}) - (\text{gravity} \times \cos(3x))$
  2. Velocity is clamped to $[-0.07, 0.07]$.
  3. $x_{t+1} = x_t + v_{t+1}$.
- **Fairness:** Every car in a generation starts from the same initial position $x_0 = -0.5 + (\text{seedRandom} - 0.5) \times \text{spread}$. A new seeded start is drawn each generation so networks cannot simply memorize a single fixed release point.

### 2. The Neural Controller
Each car is driven by an individual feedforward neural network:
- **4 Inputs (normalized roughly to $[-1, 1]$):**
  1. Position: $(x + 0.375) / 0.825$
  2. Velocity: $v / 0.07$
  3. Surface slope: $\cos(3x)$
  4. Previous step throttle force (0 on step 1)
- **Architecture:** 4 inputs $\rightarrow$ 8 hidden units with $\tanh$ activation $\rightarrow$ 1 output unit with $\tanh$ activation.
- **Weights:** $4 \times 8 + 8 + 8 \times 1 + 1 = 49$ parameters stored as a single flat array.
- **Output:** Continuous engine throttle force from $-1.0$ (full reverse left) to $+1.0$ (full drive right).

### 3. Fitness Function
- **Reach:** $\operatorname{clamp}((x_{\max} + 1.2) / 1.65, 0, 1)$
- **Swing:** $\operatorname{clamp}((x_{\max} - x_{\min}) / 1.65, 0, 1)$ (rewards bilateral rocking, providing an early learning gradient).
- **Effort Penalty:** $\text{effortCost} \times \sum \text{force}^2$ (penalizes unnecessary high-frequency thruster jitter).
- **Scoring:**
  - *Did not reach flag:* $\max(0, 300 \times \text{reach} + 200 \times \text{swing} - \text{effort}) < 500$.
  - *Reached flag:* $1000 + 2 \times (\text{maxSteps} - \text{stepsUsed}) - \text{effort} > 900$.
  - Reaching the flag strictly beats not reaching it; faster summit times yield higher scores.

### 4. Genetic Algorithm & Evolution
- **Elitism:** 4 top-performing networks are preserved unchanged.
- **Selection:** Parents are selected from the top parent pool (default: top 10 cars).
- **Crossover:** Single-point crossover on the flat 49-weight genome.
- **Adaptive Mutation:**
  - Base mutation probability is 10% per weight.
  - Gaussian noise standard deviation scales with progress: $\text{mutationSize} \times (1 - \operatorname{min}(1, \text{bestFitness} / 1400))$, floored at 0.03.
  - A 5% "Big-jump" probability grants standard deviation 0.60 to jump out of local optima.
- **Seeded Reproducibility:** Uses independent Mulberry32 pseudo-random number generators for starts and genetic operators.

---

## Reading the Graph

The history chart plots a sliding window of the last 30 generations:
- **Amber line:** Best fitness in the generation.
- **Blue-grey line:** Population average fitness.
- **Dashed line at 1000 ("Flag"):**
  - **Below 1000:** The population has not yet reached the summit. They are discovering that rocking back and forth builds momentum (rewarded by the reach and swing components).
  - **Crossing 1000:** At least one car has successfully parked at the flag ($x \ge 0.45$).
  - **Above 1000:** The population is optimizing for speed and energy conservation. Each step saved adds $+2$ points to fitness.

---

## Default Settings

| Parameter | Default Value | Range | Description |
|---|---|---|---|
| **Population** | 50 | 8 – 100 | Number of concurrent cars evaluated per generation |
| **Elites** | 4 | 0 – 10 | Top cars preserved clone-identical into the next generation |
| **Parent Pool** | 10 | 3 – 40 | Size of the candidate parent pool for crossover |
| **Mutation Chance** | 10% | 1% – 50% | Probability each individual weight is mutated |
| **Mutation Size** | 0.25 | 0.05 – 0.60 | Base standard deviation of Gaussian mutation noise |
| **Big-jump Chance** | 5% | 0% – 20% | Chance a child receives wide ($\sigma = 0.60$) exploratory mutation |
| **Engine Power** | 0.0015 | 0.0008 – 0.0018 | Throttle acceleration coefficient |
| **Gravity Strength** | 0.0025 | 0.0022 – 0.0035 | Downward slope acceleration coefficient |
| **Max Steps** | 300 | 250 – 600 | Maximum simulation steps per run before cutoff |
| **Effort Cost** | 0.05 | 0.00 – 0.20 | Penalty multiplier for $\sum \text{force}^2$ |
| **Start Spread** | 0.20 | 0.00 – 0.40 | Width of randomized initial positions ($[-0.6, -0.4]$) |
| **Shrink Mutation** | Checked (True) | Boolean | Automatically narrows mutation variance as fitness climbs |

---

## Experiment Presets

- **Reckless Mutation:** 50% mutation chance, 0.60 mutation size, 20% big-jump chance, adaptive shrinking off. Produces wild exploratory oscillations and chaos.
- **No Elites:** Elites set to 0. Shows the vulnerability of pure generational replacement to regression.
- **Tiny Population:** Population 8, parent pool 4, elites 1. Tests learning under severe genetic bottlenecks.
- **Hard World:** Engine power reduced to 0.0009 and gravity increased to 0.0033. Requires deeper multi-stage swinging to escape.

---

## Known Limitations

1. **No Internal Memory (Recurrence):** The neural network receives only the immediate state tuple $(x, v, \text{slope}, \text{lastForce})$. Because it lacks recurrent connections (RNN/LSTM) or internal memory gates, it cannot maintain temporal states beyond what is reflected in the physical kinematics. Consequently, evolved networks typically complete the climb in 65–95 steps, compared to ~106 steps for the optimal hand-written bang-bang controller.
2. **Artificial Swing Shaping:** The fitness function explicitly rewards horizontal exploration ($\text{swing} = x_{\max} - x_{\min}$) alongside peak height. In classic reinforcement learning benchmarks, reward is sparse (e.g. $-1$ per step until goal). This reward shaping was deliberately designed to provide early generations with an informative fitness gradient toward resonance.
3. **Stochastic Stalls:** Like all evolutionary strategies, populations can occasionally stall in local sub-optima (e.g., repeatedly slamming into the left wall or oscillating without sufficient amplitude). The presets and sliders allow you to observe how mutation size, elitism, and population diversity alleviate or induce stalls.

---

## How to Run

1. Clone or download this repository.
2. Open `index.html` directly in any modern web browser (`file:///path/to/index.html`), or serve it statically with any web server:
   ```bash
   python3 -m http.server 8000
   ```
   and navigate to `http://localhost:8000`.
3. No build tools, external JavaScript libraries, or package installations are needed. All code, styles, and logic are fully self-contained in `index.html`.
