# Hunt

**Hunt** is a browser-based co-evolution simulation where a population of predators and a population of prey learn to chase and evade each other from scratch, generation by generation.

Everything lives in a single self-contained `index.html` file with no build step, no external scripts, and no dependencies beyond Google Fonts.

## How to Run

Open `index.html` directly in any modern browser (as a local `file://` URL or served statically on GitHub Pages).

## How the Simulation Works

- **Populations & Rounds:** Two separate populations (16 predators and 16 prey by default) evolve independently. Each generation consists of 3 rounds of simultaneous 1-on-1 duels in an 800 × 500 walled arena. Before each round, pairings are shuffled with a seeded RNG. In the final round (when there are at least 2 rounds and the Hall of Fame is non-empty), current agents face a past champion drawn from the other side's Hall of Fame (up to the last 10 champions per side).
- **Physics & Power:** Fixed 1/60 s time step. Both sides start at `power = 1` and base speed `3.0` units/frame, while prey are smaller and more agile (`radius 7`, `turn 0.100` rad/frame) than predators (`radius 9`, `turn 0.060` rad/frame). Agents slide along walls without bouncing. Prey have their own food pellets (`radius 5`) that respawn when eaten; eating food increases the prey's `power` (`+1`) and `maxSpeed` (`+0.35`, up to `1.6x` base speed). When a predator catches a prey (`distance < 16`): if `prey.power > pred.power`, the weaker predator cannot kill the stronger prey and is pushed back; if `pred.power >= prey.power`, the predator gains `+1` power and speed (`+0.40`, up to `1.6x`) and keeps hunting while the prey respawns at `power = 1`.
- **Neural Network:** Both populations are pure neural networks with **no scripted bots**. Both sides share the same 13-input, 10-hidden (`tanh`), 2-output (`tanh`) network (`162` weights total):
  1. `sin(bearing)` to opponent
  2. `cos(bearing)` to opponent
  3. Normalized distance (`dist / 600`, clamped `0..1`)
  4. Opponent velocity along own heading (`vFwd / 4.0`, clamped `-1..1`)
  5. Opponent velocity sideways, positive to left (`vSide / 4.0`, clamped `-1..1`)
  6. Own speed (`speed / maxSpeed`)
  7–9. Wall ray distances at `-45°`, `0°`, and `+45°` (`ray / 150`, clamped `0..1`)
  10–11. `sin(bearing)` and `cos(bearing)` to the prey's food pellet (`0` for predators)
  12–13. Own power and opponent power (`clamp((power - 1) / 4, 0, 1)`)
- **Evolution:** At the end of each generation, each population is sorted by average fitness. The top 2 elites are kept unchanged; children are bred via single-point crossover from the top 5 parents and mutated with Gaussian noise (10% chance per weight, `sigma = 0.25` by default, optionally shrinking toward `0.03` as the side's benchmark score improves, plus 5% big-jump children with `sigma = 0.6`).

## Fitness Formulas

Let `T` be the match length in frames, `d` the center distance, and `idle` the share of frames where own speed `< 0.3`. Fitness is clamped to `>= 0` and averaged across a generation's matches:

- **Predator:**
  `+ (catches * 100 + 100 * (1 - firstCatchFrame / T))` if at least 1 catch
  `+ 30 * clamp(1 - (minD - 16) / (startD - 16), 0, 1)`
  `+ 20 * mean(1 - min(d, 600) / 600)`
  `- 10 * idle`
- **Prey:**
  `100 * (framesAliveBeforeFirstCatch / T)`
  `+ 60` if never caught (otherwise `- 35 * catches`)
  `+ 25 * foodEaten`
  `+ 20 * mean(min(d, 300) / 300)`
  `- 20 * (share of frames within 25 units of a wall)`
  `- 10 * idle`

## Reading the Graphs

Head-to-head win rates stay roughly flat as both sides improve together. To measure real progress without any scripted bots, every agent is tested at the end of each generation against the frozen Generation 1 neural baseline across 8 seeded benchmark spawns:

- **Predators vs baseline prey:** Share of 8 matches caught against the Generation 1 prey model (amber = best predator, blue-grey = population average).
- **Prey vs baseline hunters:** Share of 8 matches survived against the Generation 1 predator model (amber = best prey, blue-grey = population average).

When both curves climb, the arms race is working. A dip on one side often means the other side just discovered a new maneuver. Both graphs display a sliding window of the last 30 generations.

## Default Settings

| Setting | Default |
| --- | --- |
| Population per side | 16 |
| Elites | 2 |
| Parent pool | 5 |
| Mutation chance | 10% |
| Mutation size | 0.25 |
| Predator speed / turn | 3.0 / 0.060 rad/frame |
| Prey speed / turn | 3.0 / 0.100 rad/frame |
| Match length | 600 frames |
| Rounds per generation | 3 |
| Shrink mutation near perfect | Enabled |

## Known Limitations

- The networks have no memory and no vision beyond the opponent and three wall rays, so they react to the opponent's current position and velocity but cannot plan around a remembered path.
- The arena is empty, so there are no obstacles to hide behind, and every match is a one-on-one duel, so there is no herd or pack behavior.
- Co-evolution can stall or cycle (a new trick on one side can be answered and forgotten again). The scripted benchmark and the Hall of Fame reduce this but do not remove it, and the benchmark only measures skill against one scripted style of opponent.
