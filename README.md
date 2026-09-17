# alpayozkan personal site

Static, hand-written HTML/CSS/JS. No build step.

## Run locally
```sh
cd 2026/website
python3 -m http.server 8000
# open http://localhost:8000
```

Debug flags (only for checking things, not needed by visitors):
- `?theme=light` / `?theme=dark` — force a theme
- `?cloud=0.7` — jump the hero point-cloud scan to 70 % so screenshots show it

## Files
- `index.html` — all content lives here (bio, news, papers, timeline, projects, skills)
- `css/style.css` — palette in the `:root` / `[data-theme="dark"]` blocks; `--accent` is the one signal colour
- `js/cloud.js` — the hero animation: a synthetic scene is rescanned as a point cloud; points start uncertain (accent, jittery) and settle into confident dots
- `js/main.js` — theme toggle, bibtex toggles, scroll-spy, reveal-on-scroll
- `assets/alpay.jpg` — portrait (`alpay_headshot.jpg` is the white-background CV photo, if you prefer it)
- `assets/cv.pdf` — the CV linked from the hero

## To do before publishing
- Replace the `href="#"` paper/code links on the ECCV and BMVC papers (they render greyed-out until filled)
- Add a line or two of non-research life to the "Elsewhere" section (see the TODO comment)
- Point the CV pill at the latest PDF

## Deploy
Any static host works (GitHub Pages: push this folder to a `<user>.github.io` repo).
