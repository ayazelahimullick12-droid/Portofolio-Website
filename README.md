# Portfolio Website

Portfolio of **Ayaz Elahi Mullick**: a scroll-driven story through my BRAC internship and university projects.
A WebGL particle swarm reshapes into each project's symbol as you scroll, and most projects run **live on the page**.

Live at **https://ayazelahimullick12-droid.github.io/Portofolio-Website/**

## What runs where

| Project | How it appears | Hosted |
|---|---|---|
| Accessible Agami | Live in a phone frame | Static copy in `live/agami/` (GitHub Pages) |
| Schedule Miss Register | Live: mobile app + web portal | Static copy in `live/schedule-miss/` |
| brac QR Generator | Live in a browser frame | Static copy in `live/qr/` |
| Kinba | Live: the real React client on its seed data | Built copy in `live/kinba/` (`demo-api.js` stands in for the Express + MongoDB API) |
| Field Visit Tracker | Live in a browser frame | Render: `field-visit-v1-8.onrender.com` |
| Voice Assistant (cloud) | Opens in its own window | Render: `brac-voice-assistant.onrender.com` |
| The Second Opinion Doctor | Live: the original React frontend | Built copy in `live/second-opinion/`; `demo.js` answers a few sample cases in place of the Express + n8n backend |
| Student Management System | Live replica of the Laravel app | `live/student-management/`: the Blade views and controller rules in JavaScript, original `style.css` + Bootstrap 5.1.3 |
| TaskTracker | Live replica of the Laravel app | `live/tasktracker/`: Blade views with Breeze components expanded, CSS compiled from the project's own Tailwind config, Alpine.js |
| Car-Workshop | Live replica of the PHP app | `live/car-workshop/`: each PHP page's markup, its logic ported to `cw.js`, Bootstrap 5.3.3 |
| Tetris | Playable port of the PyOpenGL game | `live/tetris/`: `grp13.py` ported to a canvas, with the same midpoint algorithms, coordinates and rules |
| Voice Assistant (local) | Story and animated diagrams | — (runs on dedicated hardware) |

## Run it locally

```bash
python -m http.server 8080
```

Then open http://localhost:8080. Opening `index.html` straight from disk also works, but the live apps need a server.

## Publish

Repository: [ayazelahimullick12-droid/Portofolio-Website](https://github.com/ayazelahimullick12-droid/Portofolio-Website).
Push to `main` and GitHub Pages serves it from the root (Settings → Pages → Deploy from a branch → `main` / `/ (root)`).
Every path in the site is relative, so it works under the `/Portofolio-Website/` sub-path. `.nojekyll` makes Pages
serve every file as-is.

## The university replicas

These projects need servers that GitHub Pages can't run (PHP, MySQL, n8n, Python/OpenGL), so each runs as a
browser replica built from its own repository:

- **Markup and styles are the originals.** Blade templates and PHP pages were turned into JavaScript templates
  without changing their markup; the stylesheets are the projects' own (TaskTracker's is compiled from its
  `tailwind.config.js` with Tailwind 3.4.19, the version in its lock file).
- **Behaviour follows the controllers.** Validation messages, redirects and rules (booking limits, course levels,
  owner-only actions) are ported as written. Data is sample data stored in the visitor's browser (`localStorage`),
  and every app has a **Reset data** button in its demo bar.
- **Second Opinion Doctor:** the frontend source isn't in the repository (only `node_modules` was committed), but
  CRA's build cache inside it held the original `App.js`, components, `App.css` and `public/index.html`. They're
  rebuilt here unchanged with Vite and React 18.3.1.
- **Tetris** is a line-for-line port of `grp13.py`; only the frame timing is approximated, since the Python
  version's speed came from `time.sleep` calls and PyOpenGL overhead. It pauses while scrolled out of view.

To rebuild TaskTracker's CSS after editing `live/tasktracker/app.js`: install `tailwindcss@3.4.19` and
`@tailwindcss/forms`, point the project's Tailwind config at `app.js`, and compile `@tailwind base; @tailwind components; @tailwind utilities;`
to `live/tasktracker/app.css`.

## Update the CV

Replace `assets/Ayaz-Elahi-Mullick-CV.pdf` (keep the file name, or change the two links in `index.html`).

## Render and the free tier

The page wakes Field Visit as soon as someone arrives and the voice assistant once they reach the BRAC chapter, shows
both statuses in the header, and pings whatever it woke every 10 minutes while the page stays open. Visitors usually
reach each app a minute or more after it starts waking, so it is normally ready by then.

Render gives **750 free instance hours per workspace per month**, shared by all free web services, and suspends them
all when they run out. One service kept awake around the clock uses 720–744 hours. So if you use an external pinger:

- Ping **only one** service (Field Visit), never both.
- Better still, ping it only during the hours recruiters are likely to look (for example 08:00–24:00 Dhaka time), which
  leaves room for the voice assistant to wake on demand.

Static sites on Render (like the old Agami deployment) don't use instance hours.

## Updating a live copy

- **Agami**: copy `agami.html` to `live/agami/index.html` and `assets/` to `live/agami/assets/`.
- **QR Generator**: copy the repo's `public/` folder into `live/qr/`.
- **Schedule Miss**: copy the three HTML files and `database.json` into `live/schedule-miss/`.
- **Kinba**: in `client/`, set `base: './'` in `vite.config.js`, add `<script src="./demo-api.js"></script>` to
  `index.html` before the app script, put `demo-api.js` in `public/`, run `npx vite build`, and copy `dist/` into `live/kinba/`.

## Files

- `index.html`: the page and all of its text
- `assets/css/main.css`: styles (dark and light themes, phone layout)
- `assets/js/main.js`: scrollytelling, live embeds, Render wake-ups, gallery
- `assets/js/swarm.js`: the particle swarm (three.js, loaded from jsDelivr)
- `assets/data/bd-map.js`: Bangladesh division and district shapes
- `live/`: the projects that run in the page (BRAC apps, university replicas, the Tetris port)

## Credits

Map boundaries: [geoBoundaries](https://www.geoboundaries.org/) (CC BY 4.0), via the Field Visit Tracker.
3D: [three.js](https://threejs.org/) (MIT). Fonts: Unbounded, Space Grotesk, JetBrains Mono and Hind Siliguri from Google Fonts.
