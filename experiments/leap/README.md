# LEAP — Neuroevolution Runner Laboratory

**LEAP** is an interactive, zero-dependency artificial life laboratory where a population of 50 tiny neural networks learns the exact timing of jumping and ducking in an endless runner as cacti and flying birds rush toward them faster and faster under dynamic skies.

Rather than presenting an opaque pre-trained model, LEAP allows you to watch the entire Darwinian training process unfold generation by generation in real time: observing how an initially unguided swarm discovers obstacle proximity, learns to duck under overhead threats, ignores hazards safely out of reach, and preserves jump airtime for ground hazards across shifting seasons and changing weather.

Hosted live on GitHub Pages with zero external dependencies, no build steps, and no third-party libraries.

---

## What It Is

In control theory and reinforcement learning, multi-action reflex benchmarks are often tackled with deep reinforcement learning (DQN or PPO). **LEAP** solves the challenge through pure Darwinian natural selection without backpropagation, loss gradients, or external datasets.

Each runner is governed by a lightweight feedforward neural controller with 132 synaptic weights. In Generation 1, runners jump randomly, duck into low hazards, or crash into early obstacles. By selecting the top performers, crossing over their genetic code through single-point crossover, and applying adaptive Gaussian mutation, succeeding generations discover robust multi-action timing reflexes.

---

## How the Simulation Works

### 1. Swarm Dynamics & Shared Course
- **50 Translucent Competitors:** 50 runners race concurrently through the exact same obstacle sequence. They do not collide with or impede each other, appearing as an organic ghostly pack with the leading runner highlighted in amber.
- **Fair & Reproducible Evaluation:** Every runner in generation $G$ faces an identical obstacle stream generated from a deterministic seeded pseudorandom generator (`Mulberry32`). When generation $G+1$ begins, a fresh course is seeded, preventing networks from simply memorizing a fixed sequence and forcing them to learn generalized distance-to-speed timing.
- **Original Character:** A stylized lizard runner drawn directly with HTML5 Canvas bezier paths, featuring animated running legs, a responsive whip tail, dynamic ducking poses, and an amber sensory beam tracking upcoming hazards.

### 2. Obstacles: Cacti & Flying Birds
The desert contains two distinct obstacle classes:
- **Cacti Clusters:** Saguaro cacti clusters of $1 \dots 3$ trunks ($20 \dots 60\text{ px}$ wide, $35 \dots 70\text{ px}$ tall). Stationary on the ground, scrolling at world speed. Must be jumped over.
- **Flying Birds:** An original stylized flyer (40 px wide, 28 px tall) with flapping wings that appears only after the 6th obstacle (default 25% chance). Birds fly $1.5\text{ px/frame}$ faster than the ground scrolls, approaching the runner at $\text{World Speed} + 1.5\text{ px/frame}$.
- **Three Bird Elevations (Three Different Problems):**
  1. *Low Bird (bottom edge $10\text{ px}$ above ground, span $[10, 38]$):* Collides with both standing ($48\text{ px}$) and ducking ($26\text{ px}$) runners. **Must be jumped over.**
  2. *Middle Bird (bottom edge $30\text{ px}$ above ground, span $[30, 58]$):* Collides with standing runners ($48\text{ px} > 30\text{ px}$), but clears ducking runners ($26\text{ px} < 30\text{ px}$). **Can be ducked under** (or jumped over).
  3. *High Bird (bottom edge $70\text{ px}$ above ground, span $[70, 98]$):* Passes safely over standing runners ($48\text{ px} < 70\text{ px}$) and ducking runners. However, a jumping runner reaches an apex of $\approx 95.4\text{ px}$, causing a fatal collision with the high bird at apex! **Must be ignored.**

### 3. Runner Actions & Hitbox Mechanics
- **Standing Hitbox:** $48\text{ px}$ tall by $24\text{ px}$ wide.
- **Ducking Hitbox:** $26\text{ px}$ tall by $28\text{ px}$ wide. Ducking is permitted only while on the ground.
- **Fast-Falling:** Ducking while airborne triggers fast-falling, multiplying downward gravitational pull by $3\times$ to bring the runner back to the ground rapidly.
- **Action Priority:** A runner cannot jump while ducking.

### 4. World Physics & Mathematical Solvability
- **Gravity:** $g = 0.60\text{ px/frame}^2$ downward (or $1.80\text{ px/frame}^2$ during fast-fall).
- **Jump Power:** $v_0 = 11.0\text{ px/frame}$ upward.
- **Apex & Airtime:** Standard jump reaches apex at $95.4\text{ px}$ and lasts $\approx 37\text{ frames}$, clearing $70\text{ px}$ tall cacti with over $25\text{ px}$ of margin.
- **Speed Acceleration:** World speed starts at $6.0\text{ px/frame}$ (fixed) and increases by $+0.002\text{ px/frame}$ each frame up to $16.0\text{ px/frame}$.
- **Solvability Guarantee:** Even considering the birds' faster approach ($+1.5\text{ px/f}$) and worst-case weather wind gusts ($+1.5\text{ px/f}$), the minimum gap between consecutive obstacles is strictly maintained by:
  $$\text{minGap} = \left(\text{Max Approach Speed} \times \text{Airtime} + 80\text{ px}\right) \times \text{Obstacle Spacing}$$
  This guarantees that after clearing any obstacle, a landing runner always has at least $80\text{ px} \times \text{spacing}$ of flat ground before the next hazard arrives.

### 5. Neural Controller Architecture (132 Weights)
Each runner is governed by a feedforward network:
- **10 Normalized Inputs:**
  1. $d_{\text{next}}$: Distance to the next obstacle front edge ($0.0 \dots 1.0$, scaled by $600\text{ px}$).
  2. $w_{\text{next}}$: Width of next obstacle ($0.0 \dots 1.0$, scaled by $60\text{ px}$).
  3. $h_{\text{next}}$: Height of next obstacle ($0.0 \dots 1.0$, scaled by $70\text{ px}$).
  4. $b_{\text{next}}$: Bottom edge height above ground ($0.0 \dots 1.0$, scaled by $70\text{ px}$).
  5. $\text{isBird}$: Binary flag ($1.0$ for birds, $0.0$ for cacti).
  6. $g_{\text{follower}}$: Gap between next obstacle and the one following it ($0.0 \dots 1.0$, scaled by $600\text{ px}$).
  7. $v_{\text{world}}$: Current effective world scroll speed ($0.0 \dots 1.0$, scaled by $17.5\text{ px/f}$).
  8. $y_{\text{runner}}$: Runner vertical elevation above ground ($0.0 \dots 1.0$, scaled by $100\text{ px}$).
  9. $\dot{y}_{\text{runner}}$: Runner vertical velocity ($-1.0 \dots +1.0$, scaled by $11\text{ px/f}$).
  10. $\text{isDucking}$: Binary flag ($1.0$ if currently ducking, $0.0$ if standing).
- **10 Hidden Units:** Evaluated with hyperbolic tangent ($\tanh$) activation.
- **2 Output Neurons ($\tanh$):**
  - Output 0: **Jump** (triggers jump if $> 0.0$ and grounded and not ducking).
  - Output 1: **Duck** (triggers ducking if $> 0.0$ while grounded, or fast-fall if airborne).
- **Weight Budget:**
  $$10 \times 10 \text{ (synapses)} + 10 \text{ (biases)} + 10 \times 2 \text{ (synapses)} + 2 \text{ (biases)} = 132 \text{ flat weights}$$

### 6. Fitness Function & Penalties
To penalize unguided jump-spamming and perpetual ducking:
```
fitness = distanceRun + (50 * obstaclesCleared) - (2 * jumpsStarted) - (0.5 * ducksStarted)
```
- **Distance Run:** Base survival reward.
- **Obstacle Bonus ($+50$ per obstacle):** Primary evolutionary goal, counting both cacti and birds.
- **Jump Cost ($-2$ per jump):** Penalizes continuous jumping.
- **Duck Cost ($-0.5$ per duck):** Discourages constant crawling, encouraging standing posture when safe.
- **User Score:** Displayed as `obstaclesCleared / maxObstacles` (e.g. `54 / 80`).

### 7. Genetic Evolution
At generation end (when all runners die or 80 obstacles are passed):
1. **Elites:** Top 4 individuals survive unchanged as verbatim clones.
2. **Parent Pool:** Remaining 46 slots are children of the top 10 performers.
3. **Single-Point Crossover:** A random split point $k \in [1, 131]$ splices parent weights.
4. **Adaptive Gaussian Mutation:**
   - 10% probability per weight of perturbation: $w \leftarrow w + \mathcal{N}(0, 1) \times \text{step}$.
   - **5% Big Jump:** Exploratory mutation with step size $0.60$.
   - **Adaptive Annealing:** When *Shrink mutation near perfect* is enabled:
     $$\text{step} = \max\left(0.03, \; 0.25 \times \left(1 - \frac{\text{Best Cleared}}{\text{Max Obstacles}}\right)\right)$$

---

## Day/Night Cycle, Seasons & Weather

### Day and Night Cycle
- Operates on an autonomous ambient clock of $5,400\text{ frames}$ at 1x ($\approx 90\text{ seconds}$):
  - **Day:** $2,700\text{ frames}$ with a pale sun crossing the sky.
  - **Dusk:** $400\text{ frames}$ smooth transition.
  - **Night:** $1,900\text{ frames}$ with deep near-black sky, twinkling stars, and a moon that progresses through 8 rotating phases (one phase per night).
  - **Dawn:** $400\text{ frames}$ smooth return to day.
- During fast-forward ($2\times \dots 80\times$), the ambient clock is clamped to advance at most $4\times$, keeping visual transitions calm and legible.

### The Four Seasons
Every 2 full day/night cycles ($10,800\text{ frames}$), the season shifts:
- **Spring:** Fresh green-grey cacti with small pink flowers, light cool palette, high chance of rain.
- **Summer:** Warm amber desert glow, visible sun, ground heat shimmer, chance of dust wind.
- **Autumn:** Rust-brown soil, falling leaves drifting across the desert, wind and fog.
- **Winter:** Frosty slate-blue palette, snow dusting the ground and capping cacti, high chance of snowfall.

### Dynamic Weather State Machine
- Changes every $600 \dots 1,200\text{ frames}$ on the ambient clock according to seasonal probabilities.
- Smooth 3-second crossfades between states: `clear`, `clouds`, `rain`, `snow`, `fog`, and `wind`.
- Strict particle cap ($\le 300$ active particles) with batched canvas draws for fluid 60 FPS performance even at $80\times$ speed.
- In heavy rain, soft lightning glows illuminate the sky (at most once every 8 seconds, never a harsh strobe). Respects `prefers-reduced-motion`.

### Atmosphere Popover & Gameplay Effects
Click the **Atmosphere** button in the playback bar to toggle:
- Independent switches for Day/Night, Seasons, and Weather.
- Manual Season & Weather selectors (Auto, or pinned states).
- **"Weather affects the game" checkbox:**
  > [!NOTE]
  > When enabled, wind gusts dynamically alter the world scroll speed for all runners equally by up to $\pm 1.5\text{ px/frame}$ for $3 \dots 6\text{ seconds}$. Because wind introduces stochastic speed variations into the course, scores become less directly comparable between generations. Disabled by default.

---

## Default Settings

| Parameter | Default | Range | Description |
| :--- | :--- | :--- | :--- |
| **Population** | `50` | 10 – 150 | Number of concurrent runners per generation |
| **Elites** | `4` | 0 – 10 | Top performers copied verbatim into next gen |
| **Parent Pool** | `10` | 2 – 25 | Best individuals eligible for sexual crossover |
| **Mutation Chance** | `0.10` | 0.01 – 0.50 | Probability of mutating each individual weight |
| **Mutation Size** | `0.25` | 0.05 – 0.80 | Standard Gaussian perturbation magnitude |
| **Big-Jump Chance** | `0.05` | 0.00 – 0.30 | Fraction of children receiving exploratory $\sigma = 0.6$ kicks |
| **Shrink Mutation** | `true` | On / Off | Automatically cools mutation step size near $80/80$ |
| **Jump Power** | `11.0` | 8.0 – 15.0 | Initial upward impulse velocity ($\text{px/frame}$) |
| **Gravity** | `0.60` | 0.30 – 1.20 | Downward acceleration ($\text{px/frame}^2$) |
| **Bird Chance** | `0.25` | 0.00 – 0.60 | Probability of obstacles after #6 being flying birds |
| **Start Speed** | `6.0` | Fixed | Constant base world scroll speed ($\text{px/frame}$) |
| **Speed-Up** | `0.0020` | 0.000 – 0.008 | Scroll speed acceleration per frame |
| **Obstacle Spacing**| `1.00` | 0.60 – 2.00 | Gap multiplier guaranteeing landing reaction space |
| **Obstacles / Gen** | `80` | Constant | Total obstacles required for a complete Marathon |

---

## Experiment Presets

- **Reckless Mutation:** High mutation probability (0.35) and magnitude (0.60) with 25% big-jump chance. Demonstrates explosive early breakthroughs followed by volatile population averages.
- **No Elites:** Sets elites to 0. Every child must be reconstructed through crossover and mutation, highlighting genetic drift and fragile discoveries.
- **Tiny Population:** Restricts population to 12 runners with a parent pool of 3. Illustrates evolutionary bottlenecks and high variance.
- **Hard World:** High bird frequency (45%), accelerated speed increase (0.0040), and tight obstacle spacing (0.85).

---

## How to Run It

1. **Direct Browser Execution:**
   - Clone or download the repository.
   - Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
   - No servers, Node.js, build steps, or command line tools are required.
2. **GitHub Pages:**
   - Host `index.html` in a GitHub repository with GitHub Pages enabled from the root branch.
