# Park

A neuroevolution demo in which a population of 50 small neural-network drivers learns to parallel park into a gap between two parked cars by reversing in, using only steering and throttle. The interface is built to let you watch the training process generation by generation — from early drivers crashing into the curb to the population sliding neatly into the slot.

## How to Run

Open [`index.html`](index.html) directly in any modern browser, or serve the `park/` directory statically (for example on GitHub Pages). There are no build steps, no dependencies, and no external scripts aside from Google Fonts.

## How the Simulation Works

### World and Physics
- **Street**: 800 × 460 px top-down world simulated at a fixed step of 1/60 s (1 frame). The opposite wall is at `y = 100` and the curb is at `y = 380`. Four parked cars (60 × 28 px) sit 4 px from the curb, leaving a gap of `gapFactor × 60` px centred at `gc`.
- **Car**: 60 × 28 px body with 10 px rear overhang, 38 px wheelbase, and 12 px front overhang, tracked at the rear axle `(x, y, θ)`.
- **Controls**: Each frame, the network outputs steering `s ∈ [-1, 1]` and throttle `a ∈ [-1, 1]`. Steering moves toward `s × 35°` by at most `4°/frame`. Target speed is `0` for `|a| < 0.05`, `a × 2.4` forward, or `a × 1.6` in reverse, changing by at most `0.1/frame`.
- **Kinematics & Collision**: Rear axle moves by `(v·cos θ, v·sin θ)` and heading updates by `(v / 38)·tan δ`. Collisions are checked via Separating Axis Test (SAT) against the four parked cars plus curb (`y > 380`), opposite wall (`y < 100`), and world bounds (`x < 0` or `x > 800`).
- **Fairness**: Every car in a generation shares the exact same street and start pose, drawn from a seeded `mulberry32` generator (`1000 + generation × 7919`).

### Sensors & Network
Each car is driven by an `11 → 10 → 2` `tanh` multilayer perceptron (`142` weights total):
- **Target vector (2)**: forward and right-hand components from the body centre to the slot centre `(gc, 362)` in the car's frame, divided by `150` and `100` and clamped to `[-1, 1]`.
- **Pose & state (4)**: `sin θ`, `cos θ`, `v / 2.4`, `δ / 35°`.
- **Ultrasonic range rays (5)**: distances (divided by `80`, capped at `1`) from front centre `(50, 0)` at `0°`, rear centre `(-10, 0)` at `180°`, front-right `(50, 14)` at `45°`, rear-right `(-10, 14)` at `135°`, and right centre `(20, 14)` at `90°`.

### Fitness Formula
Closeness to the target pose is `C = 1 / (1 + e/30 + 3·|θ|)`, where `e` is the distance from the body centre to `(gc, 362)` and `θ` is wrapped to `[-π, π]`. Tracking best closeness `B`, final closeness `Fend`, and forward/reverse gear switches `switches`:

```
fitness = max(0, 200·B + 200·Fend + (parked ? 800 + 200·(1 - tPark / timeLimit) : 0) - (crashed ? 150 : 0) - 2·switches)
```

A car counts as **parked** after staying inside the gap (`[g0, g1] × [336, 380]`) within the angle tolerance and `|v| ≤ 0.05` for 45 consecutive frames. Maximum fitness is `1400`.

### Evolution Rules
After each generation (when all cars have parked, crashed, stalled, or hit the time limit), cars are sorted by fitness:
- **Elitism**: The top `E` elites pass unchanged into the next generation.
- **Crossover**: Remaining slots are filled by picking two parents at random from the top `P` cars and performing single-point crossover on the 142-weight array.
- **Mutation**: Each weight mutates with probability `mutationChance` by Gaussian noise of standard deviation `size`, or `0.6` with probability `bigJumpChance`. When *Shrink mutation near perfect* is enabled, `size = max(0.03, mutationSize × (1 - bestFitness / 1400))`. Evolution uses its own seeded `mulberry32(424242)` stream.

## Reading the Graph

The graph displays a sliding window of the last 30 generations on a `0` to `1400` scale:
- **Amber line**: Best fitness in each generation.
- **Blue-grey line**: Population average fitness.
- **Up to ~400**: Cars are driving toward the gap but have not finished parking.
- **Jump above 800**: Cars are successfully parking and holding position inside the slot.
- **Average catching best**: The whole population has learned the maneuver.

## Default Settings

| Setting | Default |
| --- | --- |
| Population | 50 |
| Elites | 4 |
| Parent pool | 10 |
| Mutation chance | 10% |
| Mutation size | 0.25 |
| Big-jump chance | 5% |
| Gap size | 2.1× car length |
| Start distance | 0 px |
| Start scatter | 12 px |
| Time limit | 1500 frames |
| Angle tolerance | 6° |
| Shrink mutation near perfect | On |

## Known Limitations

- **Purely reactive network**: The network has no memory, so it must infer which phase of the parking maneuver it is in from its current pose, speed, and steering alone. This makes the first successful parkings slow to evolve and can occasionally leave a population stuck driving up to the gap and clipping the curb.
- **Single street layout**: The street always has the same orientation (right-hand curb, one gap between two parked cars), so a trained driver will not generalize to other road layouts.
- **Kinematic car model**: Physics uses a simple kinematic bicycle model with no tyre slip, which allows the car to follow a tight ~54 px turning radius at any speed.
