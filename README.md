# Vignesh M R — Portfolio

Personal portfolio built with React, Vite and Three.js.

## Scripts

```bash
npm install
npm run dev      # start dev server
npm run build    # production build to dist/
npm run preview  # serve the production build
```

## Structure

- `src/data.js` — résumé content: profile, stats, skills, the per-planet `stack` lists, experience and education. Edit this to update the site.
- `src/App.jsx` — page markup: name, destination buttons, the Boost control, and one board per stop (About, Screen, Server, Data, Experience, Contact). The short Screen/Server/Data intros live here.
- `src/solarSystem.js` — the three.js scene and flight logic: planets, moons, contact station, ship, camera, and positioning the boards next to each planet's flag. Started from `App` and cleaned up on unmount.
- `src/index.css` — styles and the planet colour palette (`--p-*` variables, also read by the 3D scene).
- `public/Vignesh_M_R_-_Resume.pdf` — résumé linked from the Contact board.

## Controls

Click **Explore**, then hold **Boost** (or Space) to fly, or tap it to jump to the next stop. The buttons top right fly straight to a section.
