# ITProGuy

**Axel, your IT Pro Guy by Axon 1Pro Group.**

A guided workspace for everyday website, email, and business-app tasks. Established in Singapore, with headquarters in Clark.

## Live preview

- https://itproguy.com
- https://www.itproguy.com

The interface is built with **React 19.3.1**, bundled locally with esbuild, with **Manrope and DM Sans from Google Fonts** and Lucide icons. It has a full-width workspace, prominent brand logo, task conversation, large composer, session history, and browser/approval previews.

This remains a visual, interactive prototype. AI, customer accounts, payments, trial billing, and live provider actions are not connected. Session history is held in memory and clears on reload; no customer data is stored.

## Source and build

- `src/main.jsx` — React components and preview interactions.
- `src/styles.css` — desktop and mobile layout.
- `index.html` — production HTML entry and Google Fonts links.
- `assets/app.js`, `assets/app.css` — committed production bundle.
- `assets/itproguy-logo.svg`, `assets/axel-avatar.webp` — brand assets.
- `BLUEPRINT.md` — product and rollout plan.
- `DEPLOYMENT-PLAN.md` — server deployment and rollback notes.

Run `npm ci` followed by `npm run build`. The build produces `dist/index.html` and `dist/assets/app.js` / `app.css`. Copy the brand SVG and avatar from `assets/` alongside the generated assets when deploying to a fresh webroot. Publish only production HTML and assets, never source, planning files, package files, or `.git`.

The German server already has the production assets and requires no Node runtime or package installation to serve this preview.
