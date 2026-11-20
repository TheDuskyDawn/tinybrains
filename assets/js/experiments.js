// The one file you edit to publish a new experiment.
// Newest first. `slug` must match the folder name inside /experiments.
window.EXPERIMENTS = [
  {
    slug: "touchdown",
    title: "Touchdown",
    blurb: "A swarm of tiny neural-net lunar landers learns to land softly. Early generations crash spectacularly. Later ones stick the landing.",
    tags: ["neuroevolution", "genetic algorithm", "control"],
    meta: "watch generations evolve live",
    date: "2026-11"
  },
  {
    slug: "slither",
    title: "Slither",
    blurb: "Twelve snakes share one Q-table and learn Snake together. They start by hitting walls. They end by, mostly, not.",
    tags: ["reinforcement learning", "Q-learning", "multi-agent"],
    meta: "watch 12 snakes learn live",
    date: "2026-11"
  },
  {
    slug: "balance",
    title: "BALANCE",
    blurb: "Fifty tiny neural networks try to balance a pole on a moving cart. The pole falls. A lot. Then, eventually, it doesn't.",
    tags: ["neuroevolution", "genetic algorithm", "control"],
    meta: "watch generations evolve live",
    date: "2026-11"
  },
  {
    slug: "drive",
    title: "DRIVE",
    blurb: "Fifty tiny neural networks learn to race around a track using five distance sensors and nothing else. They start by hitting walls. They end by clipping apexes.",
    tags: ["neuroevolution", "genetic algorithm"],
    meta: "watch generations evolve live",
    date: "2026-11"
  },
  {
    slug: "neuroflap",
    title: "NeuroFlap",
    blurb: "Fifty birds with tiny neural networks learn to flap through an endless pipe course using nothing but natural selection. No backprop, no dataset, no mercy.",
    tags: ["neuroevolution", "genetic algorithm"],
    meta: "watch generations evolve live",
    date: "2026-11"
  },
  {
    slug: "catch",
    title: "Catch",
    blurb: "Forty tiny neural networks control forty paddles and try to catch a falling ball. The bad ones die. The good ones breed. Then you change the rules and watch them panic.",
    tags: ["neuroevolution", "genetic algorithm"],
    meta: "learns in ~10 seconds",
    date: "2026-11"
  }
];
