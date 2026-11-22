# 🧠 tinybrains

> Machine learning, but the GPU is *your problem* now.

### 👉 [**Open the live site**](https://theduskydawn.github.io/tinybrains/)

Welcome to my collection of tiny experiments where neural networks learn **live, in your browser tab**, while you sit there and judge them.

No server. No backend. No API key. No "please sign in to continue training." Just JavaScript, a canvas, and a model that starts out dumber than a bag of hammers and gets better in front of your eyes. Like a Rocky montage, but with gradient descent.

## 🎮 The Experiments

| # | Name | What's learning | Time to competence |
|---|------|-----------------|--------------------|
| 01 | [**Catch**](experiments/catch/) | 40 tiny neural nets evolve paddles to catch a ball | ~10 seconds (faster than my last relationship) |
| 02 | [**NeuroFlap**](experiments/neuroflap/) | 50 birds evolve neural nets to flap through pipes | a few generations |
| 03 | [**DRIVE**](experiments/drive/) | 50 neural nets learn to race a track from 5 distance sensors | a few generations |
| 04 | [**BALANCE**](experiments/balance/) | 50 neural nets learn to balance a pole on a cart | a few generations |
| 05 | [**Slither**](experiments/slither/) | 12 snakes learn Snake with one shared Q-table | a few minutes |
| 06 | [**Touchdown**](experiments/touchdown/) | A swarm of neural-net landers learns to land softly on a pad | a few generations |
| 07 | [**Rally**](experiments/rally/) | Two populations of tiny neural nets learn Pong by playing each other | generation by generation |
| 08 | [**LEAP**](experiments/leap/) | 50 neural nets learn when to jump and duck in an endless runner | a few generations |
| 09 | [**Climb**](experiments/climb/) | A population of tiny neural nets learns to rock an underpowered car up a hill | a few generations |
| 10 | [**Swing**](experiments/swing/) | A population of tiny neural nets learns to swing up and balance a pendulum | a few generations |
| 11 | [**Stride**](experiments/stride/) | Bipedal walkers evolve neural-net controllers to walk | a few generations |
| 12 | ??? | Currently in training. Loss is going down. Slowly. With complaints. | TBD |

## 🔒 Privacy Policy

Everything runs on your device. Your data goes nowhere, because there is nowhere for it to go. I could not steal it if I tried, and honestly I have tried, and it just *sits there*, in your browser, being yours.

## 🏃 Running It Locally

```sh
git clone https://github.com/TheDuskyDawn/tinybrains
cd tinybrains
python3 -m http.server 8000
# open http://localhost:8000 and watch some math suffer
```

Don't double-click `index.html`. Some browsers get weird about `file://`. They have their reasons. They won't share them.

## 🗂️ How This Place Is Organized

```
.
├── index.html              # the landing page (the shiny bit)
├── 404.html                # loss: NaN
├── assets/
│   ├── css/site.css        # shared styles
│   └── js/
│       ├── experiments.js  # ⭐ the list of experiments. Edit this one.
│       └── home.js         # renders the list + the sad-then-happy loss curve
└── experiments/
    ├── _template/          # copy me to start a new one
    ├── catch/              # experiment 01
    ├── neuroflap/          # experiment 02
    ├── drive/              # experiment 03
    ├── balance/            # experiment 04
    ├── slither/            # experiment 05
    ├── touchdown/          # experiment 06
    ├── rally/              # experiment 07
    ├── leap/               # experiment 08
    ├── climb/              # experiment 09
    ├── swing/              # experiment 10
    └── stride/             # experiment 11
```

Each experiment lives in its own folder and is **fully self-contained**. If one breaks, the others carry on, like siblings at a wedding.

## ➕ Adding a New Experiment

1. `cp -r experiments/_template experiments/my-cool-thing`
2. Teach something to learn something.
3. Add an entry to `assets/js/experiments.js`. That's it. The homepage updates itself. No build step, no framework, no 400 MB of `node_modules` (I checked, and no, there's no node here either).
4. Push. Pretend it was easy.

## 🚀 Deploying

GitHub Pages: **Settings → Pages → Deploy from branch → `main` / `(root)`**. Wait a minute. Refresh. Refresh again. Refresh a third time as an act of faith.

## 🐛 Known Issues

- Some models are, to put it kindly, *not smart*. They are working on it.
- Training on your phone may warm your hands. Winter feature.
- If a model does something weird, that's not a bug, that's *emergent behavior*.
- Yes, I know the title says "learn". No, I won't be taking questions about who's learning.

## 📜 License

TBD. Until then: be nice, give credit, don't train it to do crimes.

---

*Made with curiosity, caffeine, and an unreasonable amount of `Math.random()`.*
