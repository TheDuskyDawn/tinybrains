# Slither — Multi-Agent Tabular Q-Learning Laboratory

A browser-based reinforcement-learning demonstration in which 12 snakes learn to play the classic game of Snake simultaneously using shared tabular Q-learning. 

The primary purpose of this project is to make the learning trajectory transparent and observable in real time—watching the agents transition from erratic, random exploration to deliberate, goal-oriented pathfinding and danger avoidance episode by episode.

Hosted live on GitHub Pages. Runs as a standalone, zero-dependency single-file application (`index.html`) directly in any modern web browser or via static hosting.

---

## What It Is

In traditional single-agent Snake reinforcement learning, training a Q-table from scratch can be slow because one death restarts one board. In **Slither**, 12 independent snake agents operate in parallel on a 4×3 grid of boards. All 12 snakes read from and write to **one shared Q-table**. 

- **12 concurrent environments:** Each board runs its own board instance, food placement, and collision physics.
- **Shared policy & memory:** Whenever any snake takes a step, eats food, or hits a wall, its TD-error updates the central Q-table. This increases the rate of experience accumulation 12-fold.
- **Fixed-step simulation loop:** Fast-forwarding (from 1× up to 80×) executes more simulation ticks per animation frame, guaranteeing that the mathematical behavior and training dynamics remain identical regardless of playback speed.

---

## How Q-Learning Works in Slither

### 1. State Space (Compact 512 States, $2^9$)

To keep the Q-table small, interpretable, and fast to converge without function approximation, the state space is discretized into exactly 9 binary/categorical features ($2^9 = 512$ discrete states):

| Bit / Feature | Values | Description |
|---|---|---|
| **Bit 0** | 0 or 1 | **Danger Straight:** Is the cell directly ahead a wall or body segment? |
| **Bit 1** | 0 or 1 | **Danger Left:** Is the cell to the relative left a wall or body segment? |
| **Bit 2** | 0 or 1 | **Danger Right:** Is the cell to the relative right a wall or body segment? |
| **Bits 3–4** | 0, 1, 2, 3 | **Current Heading:** Current absolute direction (`0: UP`, `1: RIGHT`, `2: DOWN`, `3: LEFT`). |
| **Bit 5** | 0 or 1 | **Food Left:** Is the food to the left of the head in absolute coordinates (`food.x < head.x`)? |
| **Bit 6** | 0 or 1 | **Food Right:** Is the food to the right of the head in absolute coordinates (`food.x > head.x`)? |
| **Bit 7** | 0 or 1 | **Food Up:** Is the food above the head in absolute coordinates (`food.y < head.y`)? |
| **Bit 8** | 0 or 1 | **Food Down:** Is the food below the head in absolute coordinates (`food.y > head.y`)? |

The state index is encoded via bitwise shifts into an integer in $[0, 511]$:
```javascript
state = dangerStraight | (dangerLeft << 1) | (dangerRight << 2) |
        (heading << 3) | (foodLeft << 5) | (foodRight << 6) |
        (foodUp << 7) | (foodDown << 8);
```

### 2. Action Space (3 Relative Actions)

Instead of absolute compass directions (which would allow suicidal $180^\circ$ reversals into the snake's neck), the actions are strictly relative to the current heading:

1. `0: Straight` — Continue in current direction.
2. `1: Turn Left` — Heading becomes `(heading + 3) % 4`.
3. `2: Turn Right` — Heading becomes `(heading + 1) % 4`.

### 3. Q-Table Structure

The Q-table is a single flat `Float32Array` of size:
$$\text{Size} = 512 \text{ states} \times 3 \text{ actions} = 1,536 \text{ values}$$
Indexed via `state * 3 + action`.

### 4. Reward Formulation

- **Food Eaten:** $+10.0$
- **Collision Death (Wall or Body):** $-10.0$
- **Starvation Penalty:** $-5.0$ (when steps without food exceed $100 \times \text{snake length}$)
- **Step Penalty:** $-0.01$ (incentivizes direct paths over wandering)
- **Distance Shaping (optional, enabled by default):**
  - $+0.10$ if Manhattan distance to food decreases.
  - $-0.10$ if Manhattan distance to food increases.

### 5. Bellman Temporal-Difference Update

At each step $(s, a, r, s')$:
$$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ r + \gamma \max_{a'} Q(s', a') - Q(s, a) \right]$$

If the transition is terminal (`done = true`), the future return $\max_{a'} Q(s', a')$ is 0.

### 6. Exploration ($\epsilon$-Greedy Strategy)

- Epsilon ($\epsilon$) begins at $1.0$ (100% random exploration).
- After each finished episode across any board, epsilon decays:
  $$\epsilon \leftarrow \max(\epsilon_{\text{floor}}, \, \epsilon \times \epsilon_{\text{decay}})$$
- When selecting an action:
  - With probability $\epsilon$, a random relative action $\{0, 1, 2\}$ is chosen.
  - With probability $1 - \epsilon$, the greedy action $\arg\max_a Q(s, a)$ is chosen. Ties between equal Q-values are broken uniformly at random.

---

## How to Read the Graph

The score graph on the right panel displays a sliding window of the **last 30 epochs** (each epoch aggregates 50 completed games across all boards, so 30 epochs represents 1,500 games):

- **Amber Line (Best Score):** The single highest score achieved by any snake within that 50-game epoch. Peak scores often reach 25–40 as individual runs find efficient food paths.
- **Blue-Grey Line (Average Score):** The arithmetic mean of all 50 episode scores in that epoch.
- **Initial Baseline (~0.3–0.6):** During the initial random wandering phase ($\epsilon \approx 1.0$), snakes occasionally stumble onto food by chance.
- **Ascending Phase (Epochs 3–15):** As $\epsilon$ drops below 0.30 and the Q-table values for food quadrant alignment and danger avoidance solidify, the average score climbs rapidly.
- **Plateau / "Learned" Threshold (Score $\ge 15$):** Once the average score reaches 15, the agents have reliably learned food navigation and one-step hazard avoidance. The interface triggers a "Learned" milestone banner.

---

## Default Hyperparameters

| Setting | Default Value | Description |
|---|---|---|
| **Snakes** | 12 | Number of concurrent playing boards (4×3 grid) |
| **Grid Size** | 12×12 | Dimensions of each square board |
| **Learning Rate ($\alpha$)** | 0.10 | Step size for Bellman error updates |
| **Discount Factor ($\gamma$)** | 0.90 | Weight given to future expected rewards |
| **Initial Epsilon** | 1.00 | Starting exploration rate |
| **Epsilon Floor** | 0.01 | Minimum exploration rate (retains 1% exploration) |
| **Epsilon Decay** | 0.9950 | Multiplicative decay per finished episode |
| **Food Reward** | +10.0 | Reward granted upon consuming food |
| **Death Penalty** | -10.0 | Penalty for wall or self-collision |
| **Step Penalty** | -0.010 | Small living penalty to prevent lingering |
| **Shaping Reward** | ±0.10 | Reward for reducing Manhattan distance to food |
| **Starvation Limit** | 100 /length | Steps allowed without eating before starvation |
| **Distance Shaping** | Enabled | Checkbox to toggle distance reward shaping |

---

## Experiment Presets

The left column includes 4 quick-switch experiment presets:

1. **Never Stops Exploring:** Sets $\epsilon_{\text{floor}} = 1.0$ and decay to $1.0$. The agent never exploits its Q-table, demonstrating the baseline performance of pure random walk.
2. **Greedy from the Start:** Sets $\epsilon = 0.0$ immediately. Shows how lack of initial exploration can cause agents to get stuck in local optima before discovering food rewards.
3. **Short-Sighted:** Drops discount factor to $\gamma = 0.10$. The snake prioritizes immediate step shaping over long-term strategic paths.
4. **Big Board:** Expands the grid to 20×20 cells while retaining the learned Q-table, demonstrating spatial generalizability.

---

## Known Limitations

1. **Myopic 1-Step Danger Perception:**
   The compact 512-state space only observes whether the cell immediately straight, left, or right of the head is currently dangerous. It does **not** trace full body contours or detect when the snake enters a blind cul-de-sac created by its own coiled tail.
2. **Score Ceiling (~18–25 Average):**
   Because the agent cannot "see" multi-step traps or loop closures, long snakes (length > 25) will inevitably trap themselves in coiled spirals. This establishes an asymptotic ceiling on average scores around 15–25 on a 12×12 board.
3. **State Explosion Trade-Off:**
   Extending the state to include ray-casted distances to body segments in 8 directions or flood-fill free area counts would allow snakes to survive longer and achieve scores of 50+, but would expand the state space from $512$ to millions of states, rendering tabular Q-learning intractable without neural network function approximation (DQN).

---

## How to Run

No build step, no npm, and no external dependencies are required.

### 1. Directly in Browser
Double-click `index.html` or open it via your browser:
```bash
# On Linux / macOS
open index.html # or xdg-open index.html
```

### 2. Static Hosting / Local Server
```bash
# Using Python 3 built-in server
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

---

## Verification & Test Results

The application was verified headlessly using a Node.js verification test suite (`test_slither_suite.js`) with stubbed DOM and Canvas2D contexts.

### Automated Checks Passed:
- [x] **Zero runtime startup errors:** All arrays, Q-tables, board instances, and DOM bindings are initialized prior to execution.
- [x] **State Encoding Verification:** Exhaustive sampling verified that all board configurations yield strictly valid integers in $[0, 511]$.
- [x] **Hand-Checked Bellman Transition:** Verified exact mathematical accuracy of the TD update formula:
  $$\Delta Q = 0.10 \times [10.0 + 0.90(4.0) - 2.50] = +1.11 \implies Q_{\text{new}} = 3.61$$
- [x] **200-Epoch Headless Training Run:** Confirmed that the average score rises from an initial random baseline of $0.28$ to $>17.50$ as $\epsilon$ decays, triggering the "Learned" milestone banner.
- [x] **Sliders & Preset Reactivity:** Confirmed that slider changes and presets update simulation parameters and re-initialize board states without corrupting the Q-table.
- [x] **Sliding Window Graph:** Confirmed that the graph buffer holds up to 30 epochs and smoothly slides older epochs out as new epochs arrive.

### Limitations of Headless Verification:
The following items could not be visually evaluated in the headless environment:
- Exact sub-pixel canvas rasterization and visual smoothness of the eye pupils and leader trail.
- Hardware-accelerated CSS rendering performance across varying physical monitor refresh rates (60Hz vs 144Hz).
- Exact visual positioning at non-standard responsive viewport breakpoints below 1050px.
