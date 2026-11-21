# Rally

Rally is a browser-only Pong neuroevolution demo. Two populations of 16 small neural networks play each other and evolve independently; there is no scripted training opponent. Open `index.html` directly in a modern browser, or serve this folder as static files. Google Fonts are optional; the page has local font fallbacks.

## How evolution works

Each generation has three rounds by default. In each round, the right population is shuffled and paired with the left, so every current network plays one opponent per round. When champion testing is enabled, two additional checkpoint phases let each current population face opponents sampled from the other side's hall of fame. They count toward fitness while preserving each population's scheduled current-opponent rounds.

A match ends at five points or after 1,500 frames. Per-network fitness is summed over its matches: **10 per point scored + 1 per successful paddle return**. Each population keeps its top two networks unchanged. Remaining children use single-point crossover from the top six, with each weight mutating at 10% probability. Five percent of children get a larger mutation step of 0.6. Normal mutation is `max(0.03, 0.25 × (1 − min(1, average rally / 15)))` when shrinking is on; otherwise it is 0.25. A generation's average rally is the mean number of paddle returns per completed rally, including zero-return rallies.

## Reading the graph

The amber line is the longest rally in a generation; the slate line is the mean returns per rally. The left-win count is a relative measure: if both populations improve together, it may stay close to even. The separate benchmark tests the best network from each side against the same ball-tracking bot (60% paddle speed) for up to 900 frames; the displayed value is their mean successful returns.

**Known limitation:** co-evolution can stall or cycle because fitness depends on the opponent. The hall of fame and scripted benchmark help expose and reduce this, but do not eliminate it. The benchmark is also a narrow yardstick, not a proof of general Pong skill. Neural-network evolution is stochastic, and faster settings only advance the same fixed-step simulation more quickly.

## Default settings

Population 16 per side; 2 elites; parent pool 6; mutation chance 10%; mutation size 0.25; big-jump chance 5%; ball speed 4 px/frame; 3% speed-up per paddle hit; paddle speed 5 px/frame; paddle height 70 px; 3 rounds per generation. Mutation shrinking and champion testing are on by default. Matches target five points and have a 1,500-frame limit.

## Run it

Open `index.html` in a browser. No installation, build step, server, or external script is required. The Google Fonts link is the only external page resource; if offline, system fonts are used.
