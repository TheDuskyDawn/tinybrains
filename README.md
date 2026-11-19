# Learn in Browser

Interactive machine-learning models that **train live in your browser**. Each demo is a static HTML page. Training runs client-side in JavaScript, so there's no backend and no data leaves the viewer's device.

> 🚧 **Temporary README.** This project is just getting started. Expect changes.

## Demos

| Demo | Description |
|------|-------------|
| [Two-Spiral Classifier](demos/spiral/) | A small neural net learns to separate two interleaved spirals |

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Adding a demo

1. Create `demos/<name>/index.html` (self-contained; use `../../assets/style.css` for shared styling).
2. Add a card for it in the root `index.html`.
3. Add a row to the table above.

## Deploying

Push to GitHub, then **Settings → Pages → Deploy from branch → `main` / root**.

## License

TBD
