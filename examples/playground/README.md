# Playground

A tiny [Vite](https://vite.dev) app that renders `<Chatbot>` against the repo's
built `dist/`, for eyeballing changes in a real browser. Used as the manual /
visual-regression harness for the toolkit (the automated suite is `npm test` in
the repo root).

## Run it

From the repo root, build the library first, then start the playground:

```bash
npm run build                 # build dist/ in the repo root
cd examples/playground
npm install
npm run dev                   # open http://localhost:5173
```

It renders the widget with `preset="ecommerce"` and WhatsApp enabled (panel CTA
and launcher), over a small FAQ set that uses `category` and `keywords`.

## Drive it headlessly (screenshots)

With the dev server running, in another terminal:

```bash
npm run drive
```

This uses `puppeteer-core` against an installed Chrome to open the panel, run a
keyword search and capture screenshots to `shots/`. Override the browser path
with `CHROME_PATH` if needed:

```bash
CHROME_PATH="/path/to/chrome" npm run drive
```
