# Vignesh M R — Portfolio

Personal portfolio built with React, Vite and Three.js (via `@react-three/fiber` and `@react-three/drei`).

## Scripts

```bash
npm install
npm run dev      # start dev server
npm run build    # production build to dist/
npm run preview  # serve the production build
```

## Structure

- `src/data.js` — all resume content (profile, skills, experience, education). Edit this to update the site.
- `src/components/Scene.jsx` — the 3D background: distorted core, wireframe shell, orbiting skill chips, starfield. Reacts to pointer and scroll.
- `src/App.jsx` — page sections.
- `src/index.css` — styles.
