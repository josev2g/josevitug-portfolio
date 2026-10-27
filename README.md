# Jose Vitug portfolio

Static site (no build step), served by GitHub Pages from the `main` branch at https://automate.projectjehv.site (see `CNAME`).

- `index.html`, `css/style.css`
- `js/main.js`: smooth scroll, hero video scrub, story passages, section reveals
- `js/core3d.js`: the Three.js "automation core" shared by About, Services and Case Studies
- `assets/`: Higgsfield-generated images (WebP) and the all-keyframe hero videos

Preview locally: `python -m http.server 5173` in this folder, then open http://localhost:5173.

Placeholders to replace: case study numbers (marked `placeholder`) and the Upwork link (`data-placeholder="upwork"`).
