# NEUROFLAP — Avian Neuroevolution Laboratory

NEUROFLAP is an interactive, zero-dependency artificial life simulation that demonstrates real-time neuroevolution. A flock of 50 birds navigates an endless stream of procedural obstacle pipes using lightweight neural networks. Without backpropagation, labeled datasets, or hardcoded game rules, the flock discovers flight dynamics, gap alignment, and rhythmic flapping through Darwinian natural selection alone.

The simulation runs entirely in the browser using vanilla HTML5 Canvas, modern CSS, and ES6 JavaScript. No frameworks, no external libraries, and no build steps are required.

---

## Table of Contents

1. [Key Features](#key-features)
2. [How to Run Locally](#how-to-run-locally)
3. [Step-by-Step GitHub Pages Deployment](#step-by-step-github-pages-deployment)
4. [How the Neuroevolution Works](#how-the-neuroevolution-works)
5. [Table of Default Values](#table-of-default-values)
6. [Experiments & Presets to Explore](#experiments--presets-to-explore)
7. [Architecture & Implementation Details](#architecture--implementation-details)

---

## Key Features

- **Real-Time Flocking in a Shared World**: All alive birds share identical physical obstacles simultaneously, creating fair generational selection criteria.
- **5-Input Neural Controller**: Evaluates normalized altitude, vertical velocity, distance to oncoming obstacle, relative gap center height, and gap aperture size.
- **Darwinian Genetic Algorithm**: Preserves top elite genomes intact, reproduces children from an elite candidate parent pool, and perturbs synaptic weights with Gaussian noise.
- **Adaptive Mutation Annealing**: Mutation magnitude automatically scales down as flock fitness approaches the pipe cap (60), facilitating fine-grained trajectory optimization.
- **Sliding Generational Telemetry**: A real-time, non-blocking 30-generation sliding chart tracking elite peak performance and flock mean score.
- **Hardware-Accelerated Time Dilation**: Accelerate training from 1x to 80x physics steps per animation frame with responsive 60fps rendering.
- **Responsive Single-Viewport Interface**: High-density desktop dashboard with zero page scrolling; stacks gracefully on screens under 980px.
- **Real-Time AI Thought Stream**: A live HUD stream at the bottom of the simulation world explaining the active flock leader's perception, sensory interpretation, neural output, and flight decisions (e.g., when and why it chooses to flap vs. glide).
- **Animated Architecture Visualizer**: An interactive "How it works" modal rendering live synaptic signal pulses and hidden-layer activation states from the active flock leader.

---

## How to Run Locally

Because NEUROFLAP consists of a single static file (`index.html`) with no dependencies or compilation requirements, you can run it immediately on any computer.

### Method 1: Direct File Launch
1. Download or clone this repository to your computer.
2. Double-click `index.html` (or right-click and choose **Open With** &rarr; your favorite web browser such as Chrome, Firefox, Safari, or Edge).
3. The simulation begins running immediately.

### Method 2: Local HTTP Server (Python)
If you prefer running through a local development server:
1. Open your terminal or command prompt in the directory containing `index.html`.
2. Start Python's built-in web server:
   ```bash
   python3 -m http.server 8000
   ```
3. Open your browser and navigate to:
   ```text
   http://localhost:8000
   ```

---

## Step-by-Step GitHub Pages Deployment

You can host this project for free on GitHub Pages using only the GitHub web interface in your browser. No command-line tools or Git installations are required.

### Step 1: Create a New GitHub Repository
1. Log in to your account at [GitHub](https://github.com).
2. In the top-right corner of the page, click the **+** (plus) icon and select **New repository**.
3. Choose a name for your repository (for example, `neuroflap` or `flappy-neuroevolution`).
4. Set the visibility to **Public** (GitHub Pages is free for public repositories).
5. Leave the checkboxes for "Add a README file", ".gitignore", and "license" unchecked.
6. Click the green **Create repository** button.

### Step 2: Upload `index.html`
1. On the new repository page that appears, look for the section titled **Quick setup**.
2. Click the link that says **uploading an existing file**.
3. Drag and drop `index.html` (and optionally `README.md`) into the upload box, or click **choose your files** and select the file from your computer.
4. Scroll to the bottom of the page to the **Commit changes** box.
5. In the commit message box, type `Initial release` and ensure **Commit directly to the main branch** is selected.
6. Click the green **Commit changes** button.

### Step 3: Enable GitHub Pages
1. Near the top of your repository page, click the **Settings** tab (the gear icon).
2. In the left-hand navigation sidebar, look under the **Code and automation** section and click **Pages**.
3. Under the **Build and deployment** section:
   - For **Source**, ensure **Deploy from a branch** is selected.
   - Under **Branch**, click the dropdown that says **None** and select **main**.
   - Ensure the folder dropdown next to it remains set to `/(root)`.
4. Click the **Save** button.

### Step 4: Access Your Live Site
1. Wait approximately 1 to 2 minutes while GitHub automatically builds and deploys your static page.
2. Refresh the **Pages** settings screen. You will see a banner at the top displaying:
   `Your site is live at https://[your-github-username].github.io/[your-repository-name]/`
   *(where `[your-github-username]` is your actual GitHub handle and `[your-repository-name]` is the name you gave your repository)*.
3. Click the provided URL to launch your live simulation.

---

## How the Neuroevolution Works

### 1. Neural Architecture
Each bird operates an artificial neural network with three fully connected layers:

```text
Inputs (5)              Hidden Layer (6)          Output (1)
[ Altitude (Y) ] --------\     [ tanh ]     /---- [ Flap > 0? ]
[ Velocity (Vy) ] --------+--- [ tanh ] ---+
[ Dist to Pipe ] ---------+--- [ tanh ] ---+
[ Gap Center ΔY ] -------+--- [ tanh ] ---+
[ Gap Height ] ----------/     [ tanh ]     \
                               [ tanh ]
```

- **5 Inputs** (normalized each frame):
  1. `inY`: Normalized vertical position of the bird (`bird.y / worldHeight`), bounded `[0, 1]`.
  2. `inVy`: Normalized vertical speed (`bird.vy / 12`), bounded `[-1, 1]`.
  3. `inDist`: Normalized horizontal distance from the bird's leading edge to the next pipe's trailing edge (`(pipe.x + pipe.width - bird.x) / worldWidth`), bounded `[0, 1]`.
  4. `inGapRelY`: Vertical displacement of the approaching gap's center relative to the bird (`(pipe.gapCenter - bird.y) / worldHeight`), bounded `[-1, 1]`. Negative values indicate the gap is above; positive values indicate the gap is below.
  5. `inGapSize`: Size of the pipe aperture relative to total world height (`pipe.gapSize / worldHeight`).
- **6 Hidden Units**: Each computes the dot product of the 5 inputs against its incoming synaptic weights plus an independent bias, passed through the hyperbolic tangent (`tanh`) activation function:
  $$\text{hidden}_j = \tanh\left(\sum_{i=0}^{4} x_i \cdot W_{1}[i][j] + B_1[j]\right)$$
- **1 Output Neuron**: Aggregates the 6 hidden activations with its weights and bias:
  $$\text{out} = \tanh\left(\sum_{j=0}^{5} \text{hidden}_j \cdot W_{2}[j][0] + B_2[0]\right)$$
- **Action Threshold**: If $\text{out} > 0$, the bird fires an upward flap impulse, resetting vertical velocity to $-7.5\text{ px/frame}$.

### 2. Fitness Evaluation & Endless High-Score Flight
Generations naturally terminate when **all birds collide** with obstacles or world boundaries, or when manually advanced via the **Next Gen** button.

- **Target Milestone vs. Endless Flight**: The "Pipe Cap (Target)" slider sets the evolutionary milestone for full mutation annealing. Surviving birds are **never artificially terminated** upon reaching the target; they continue flying endlessly to achieve personal and flock high scores (e.g. 100, 250, 500+). If an automated benchmark cutoff is desired, users can check the optional **"Hard stop at pipe cap"** toggle.
- **Individual Fitness Calculation**: Combines temporal longevity and milestone navigation:
  $$\text{Fitness} = \text{Frames Survived} + (\text{Pipes Cleared} \times 60)$$

### 3. Selection & Reproduction
1. **Elitism**: The top 4 birds survive completely unaltered into the next generation. This prevents genetic regression and ensures that discovered strategies are never lost.
2. **Breeding Pool**: Remaining offspring are bred from the top 10 ranked candidates. A parent is selected at random from this elite pool, and its neural weights and biases are cloned.
3. **Gaussian Mutation**: For every synaptic weight and bias, a random draw determines whether mutation occurs:
   $$W_{\text{new}} = W_{\text{old}} + \mathcal{N}(0, 1) \times \sigma_{\text{eff}}$$
4. **Exploratory Jumps**: A 5% slice of children receive a "big jump" mutation ($3.5\times$ base mutation size), preventing the population from getting permanently trapped in local minima.
5. **Adaptive Annealing**: When the "Shrink mutation near perfect" option is enabled, the effective mutation scale $\sigma_{\text{eff}}$ automatically decays as the flock's best score approaches the pipe cap:
   $$\sigma_{\text{eff}} = \sigma_{\text{base}} \times \max\left(0.25, 1.0 - 0.75 \times \frac{\text{Best Pipes Cleared}}{\text{Pipe Cap}}\right)$$
   This stabilizes the population for high-precision flight once broad navigation heuristics are established.

---

## Table of Default Values

| Parameter | Default Value | Range | Description |
| :--- | :--- | :--- | :--- |
| **Population** | `50` | `10 – 120` | Number of simultaneous agents per generation (applies next gen). |
| **Elites Kept** | `4` | `0 – 10` | Top performing genomes preserved unaltered. |
| **Parent Pool** | `10` | `2 – 25` | Candidate pool size from which offspring are bred. |
| **Mutation Chance** | `20%` (`0.20`) | `1% – 100%` | Probability that an individual synaptic weight undergoes mutation. |
| **Mutation Size** | `0.30` | `0.05 – 1.50` | Standard deviation ($\sigma$) of the Gaussian perturbation. |
| **Big-Jump Chance**| `5%` (`0.05`) | `0% – 30%` | Share of offspring receiving a $3.5\times$ exploratory perturbation. |
| **Pipe Gap** | `130px` | `70 – 220px` | Vertical clearance between upper and lower obstacle pillars. |
| **Pipe Speed** | `3.0` | `1.5 – 7.0` | Horizontal velocity of oncoming pipes (pixels per frame). |
| **Gravity** | `0.40` | `0.15 – 0.90` | Downward gravitational acceleration applied to birds each tick. |
| **Flap Strength** | `7.5` | `4.0 – 12.0` | Upward impulse velocity generated when neural output $> 0$. |
| **Pipe Cap (Target)** | `60` | `20 – 200` | Target evolutionary milestone; birds fly beyond it continuously. |
| **Shrink Mutation**| `Checked` | `Boolean` | Anneals mutation size as flock approaches pipe cap. |
| **Hard Stop at Cap**| `Unchecked` | `Boolean` | (Optional) Hard terminates generation at pipe cap if enabled. |

---

## Experiments & Presets to Explore

The laboratory interface provides 4 instant experiment presets in the left column. Each highlights a fundamental principle of evolutionary robotics:

### 1. Reckless Mutation
- **Configuration**: 60% Mutation Chance, 0.80 Mutation Size, 20% Big-Jump Chance.
- **Observed Behavior**: The flock exhibits erratic, chaotic flight patterns. While it explores radical strategies quickly, high generational variance makes it difficult to consolidate long-term mastery.

### 2. No Elites
- **Configuration**: 0 Elites Kept, 25% Mutation Chance, 0.35 Mutation Size.
- **Observed Behavior**: Demonstrates the fragility of purely generative evolution. Even if a bird discovers a flawless flight path, bad luck or slight mutations can erase that breakthrough in the next generation, resulting in jagged generational score charts.

### 3. Tiny Population
- **Configuration**: 12 Birds, 2 Elites, Parent Pool of 4.
- **Observed Behavior**: Simulates genetic drift and severe reproductive bottlenecks. With very few individuals exploring the search space, progress tends to stall for extended periods until a lucky mutation emerges.

### 4. Hard World
- **Configuration**: 85px Pipe Gap, 4.5 Pipe Speed, 0.48 Gravity, 8.2 Flap Strength.
- **Observed Behavior**: Demands extreme precision. With narrow apertures and rapid oncoming obstacles, delayed neural responses result in immediate collision. Notice how the flock learns to maintain altitude near the gap center rather than oscillating broadly.

---

## Architecture & Implementation Details

- **Motion Trails**: The canvas uses a semi-transparent refresh pass (`rgba(7, 9, 12, 0.32)`), giving living birds luminous flight trails that visualize trajectory clusters.
- **Leader Highlighting**: The leading bird at any given frame is dynamically rendered in warm amber (`#f59e0b`) with a glowing halo, distinct beak, and eye rendering, while followers remain translucent off-white.
- **Decay Physics**: Dead birds fade out gracefully over 30 frames with gentle downward drift rather than vanishing abruptly.
- **Sliding Window Chart**: Written directly in HTML5 Canvas without external charting packages. It calculates moving bounds across the trailing 30 generations, displaying generation markers on the X-axis and dynamic dots on the newest datapoint.
- **Live Neural Telemetry**: Opening the "How it works" dialog displays a live visualization of the flock leader's neural network, mapping synaptic weights to connection thickness and streaming signal particles along active pathways.
