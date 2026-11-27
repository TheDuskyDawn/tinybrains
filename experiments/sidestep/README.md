# Sidestep

**Sidestep** is a self-contained browser neuroevolution demo in which a squadron of 50 tiny spaceships learns to dodge bombs dropped by a marching alien formation. Nobody shoots—the only skill is staying alive, and the focus is watching the squadron improve generation by generation.

## How to Run

Open [index.html](index.html) directly in any modern browser (no build step, no server, and no external JavaScript libraries required), or host it directly on GitHub Pages.

## How the Simulation Works

- **Shared world**: All 50 ships share a single `480 × 640` playfield simulated at a fixed 60 steps per second. Ships do not collide with each other, cannot shoot, and cannot affect the aliens or bombs, so every ship in a generation faces the exact same test.
- **Alien formation**: A 5 × 8 grid of aliens sways horizontally as a deterministic triangle wave at `0.7 px/frame` across a `112 px` span and drops `10 px` on edge contact up to 6 times.
- **Bombs & volleys**: Each frame spawns bombs with probability `(0.02 + 0.10 × d) × bombRate`, where `d = min(1, frame / 2400)`. Some launches become 3-column volleys, and 20% of bombs are fast bombs (`1.5×` speed, capped at `9 px/frame`).
- **Neural network**: Each ship is steered by a feed-forward network with **8 inputs**, **10 `tanh` hidden units**, and **1 `tanh` output** (`101` weights total):
  1. Normalized ship `x` position
  2. Normalized previous velocity
  3–8. Horizontal offset (`tanh(dx / 32)`, giving sharp sensitivity near the hull) and urgency (`1 - ttl / 90`) for the 3 most urgent bombs within 90 frames of arrival
- **Fitness & evolution**: Fitness is `frames survived + 25 × bombs dodged - 0.02 × pixels travelled - 1.5 × edge frames` (floored at 0), where a bomb counts as dodged when it passes within `55 px` horizontally of a living ship and edge frames penalize camping outside the `40..440` safe corridor bounds. The top elites are copied unchanged; remaining slots use rank-biased single-point crossover from the top parent pool and Gaussian weight mutation that shrinks as the best ship approaches the generation ceiling (with an occasional big-jump mutation).

## The Hidden Safe Path

Every generation starts by seeding `mulberry32` with `1000 + generation × 7919` and pre-generating an invisible safe corridor (`x` centers in `40..440`, moving at `2.4 px/frame`). Any candidate bomb that would come within `30 px` of the corridor center during the frames it passes ship altitude is skipped. Because the minimum ship speed (`3 px/frame`) exceeds the corridor speed (`2.4 px/frame`), a ship following the corridor can never be hit—guaranteeing every wave is solvable. The corridor is never drawn and never exposed to the neural network.

## Reading the Graph

The right-hand chart shows a sliding window of the last 30 generations measured in seconds survived:

- **Amber line (Best)**: The strongest pilot in each generation.
- **Blue-grey line (Average)**: Mean survival time across the entire squadron.

When the amber line rises while the average stays flat, mutation may be too destructive or elites too scarce. When both rise together, the squadron as a whole is converging on reactive dodging.

## Default Settings

| Parameter | Default | Range |
| --- | --- | --- |
| Population size | `50` | `10 – 100` |
| Elites | `4` | `0 – 10` |
| Mutation chance | `10%` | `1% – 50%` |
| Mutation size | `0.25` | `0.05 – 1.00` |
| Big-jump chance | `5%` | `0% – 30%` |
| Parent pool | `20%` | `5% – 50%` |
| Bomb rate | `1.00x` | `0.50x – 2.00x` |
| Bomb speed | `1.00x` | `0.50x – 1.50x` |
| Volley chance | `15%` | `0% – 40%` |
| Ship speed | `5.0 px/frame` | `3.0 – 8.0` |
| Generation length | `3600 frames (60s)` | `600 – 3600` |
| Shrink mutation near perfect | `On` | `On / Off` |

## Known Limitations

- **Limited radar & no memory**: The radar only sees the 3 most urgent bombs and the network has no recurrent memory, so dense late-game volleys can trap or overwhelm even a well-evolved ship.
- **Not every run reaches 60 seconds**: The hidden safe corridor guarantees that a *perfect* pilot with full awareness could always survive, not that a pilot restricted to a 3-bomb radar can always find the path.
- **Pure dodger**: Ships cannot shoot, by design, so the demo stays focused on evasive control.
