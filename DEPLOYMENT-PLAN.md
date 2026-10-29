# ITProGuy staged delivery plan

**Owner:** Amit, Axon 1Pro Group  
**Updated:** 30 October 2026 (UTC+8)  
**Delivery style:** One small, reviewable phase at a time.

## Phase 0 — product and host preflight

**Status: complete. Phase 1 static preview is now deployed.**

- Product name, Axel persona, task-first experience, visual prototype, and safety principles are recorded in the blueprint.
- Verified in Cloudflare and from the server: `itproguy.com` and `www.itproguy.com` both resolve to `161.97.137.234` (DNS only).
- The German staging server was reviewed through its web console. It is an existing shared environment with active web and container workloads, not an empty VPS.
- Existing Apache, Git, and Certbot were sufficient for this static deployment. GitHub access and ACME validation succeeded; no package installation or package-cache changes were needed.
- Added only ITProGuy's site files, dedicated Apache virtual host, and certificate. No global Apache settings, firewall rules, packages, or other site configurations were modified. Apache was gracefully reloaded after configuration validation.

## Phase 1 — isolated public preview

**Status: deployed and verified at https://itproguy.com and https://www.itproguy.com.**

- Source: `5473ee5` (full-width workspace); original preview source: `246865a`.
- Dedicated source checkout: `/srv/itproguy/repo`, owned by `axonadmin`.
- Public files: `/var/www/itproguy.com/public` (only HTML and assets; repository and planning documents are outside the document root).
- Site configuration: `/etc/apache2/sites-available/itproguy.com.conf`.
- HTTP redirects to HTTPS; ACME challenge paths remain available for renewal.
- Let's Encrypt certificate covers both names and expires 27 January 2027. Existing Certbot timer is active; the existing Apache renewal hook was inspected and left unchanged. A renewal dry run scoped to ITProGuy succeeded.
- Validation: Apache syntax OK; both HTTPS names returned 200; both HTTP names returned 301; logo and avatar returned 200; `.git/HEAD` was denied and the blueprint was not served. Browser verified the layout starts at the left edge, has no fixed maximum width, and has no horizontal overflow.
- Backups: initial HTTP-only site configuration at `/srv/itproguy/itproguy.http.conf`; original preview HTML at `/srv/itproguy/index.before-fullwidth.html`.
- Roll back the width edit by restoring that HTML file. To withdraw only this preview: disable `itproguy.com.conf`, validate Apache, and gracefully reload. Do not change other virtual hosts or remove shared services.

**Before deployment:** confirm the exact hostname and current DNS destination; inspect the existing web route; confirm a dedicated deployment directory or isolated container; make a site-level backup; confirm a rollback path; and restore package-cache connectivity only if installation is required.

**Scope:** branded landing/workspace, Axel introduction, task examples, and a clearly visible preview-only browser panel. No customer credentials, authentication, provider actions, database, payments, or API keys.

**Protection:** keep this application separate from existing hosted sites and services. Do not change global firewall, Apache, Docker, network, or package settings as part of a site-only deployment.

## Phase 2 — accounts and admin essentials

Add verified customer accounts, one-time trial tracking, password reset, a private admin area, task and payment history, email templates, spend limits, and Stripe test mode. Store secrets only on the server, masked after saving. Never use a fixed shared admin password.

## Phase 3 — one supervised browser workflow

Choose one supported website platform. Begin with read-only inspection and plain-language findings. Show the exact proposed edit, require approval, execute only the approved action, and record the result. Keep customer sign-in in the provider's own login flow; pause for MFA or CAPTCHA when needed.

## Phase 4 — expand supported services

Add tested website builders, hosting panels, and official Google Workspace, Microsoft 365, and Zoho connections. Each integration needs limited permissions, a read-only-first path, explicit approval for changes, audit records, and a documented recovery route.

## Phase 5 — optional local computer helper

Only after the browser service is stable, consider a signed Windows/macOS helper. Start with consent-based read-only diagnostics; add a small, named set of user-approved repairs later. Do not run arbitrary shell or PowerShell commands from natural-language prompts.

## Cost and credit controls

- Start with one low-cost hosted model and strict per-task token limits; route to a stronger model only when a task needs it.
- Do not install or operate a local LLM for the static preview.
- Cap free-trial use, browser session duration, and daily/monthly model spend.
- Keep automated service pricing at the proposed **US$5/hour pilot rate**; assess real usage and payment fees before opening paid service. Human engineer work remains separate.
- Make one phase's change set at a time and record what was deployed and how to roll it back.

## Next phase

Phase 1 is complete. Customer accounts, AI/API integration, billing, and live browser actions remain unconfigured. Continue with Phase 2 as a separate, bounded change set. Domain email routing is also not configured; no MX/SPF/DKIM/DMARC records were added during the website deployment.

## React workspace redesign — 30 October 2026

- Deployed application source: `ec04879`, based on `8d6ede5`.
- Rebuilt with React 19.3.1, locally bundled with esbuild; Manrope and DM Sans are linked from Google Fonts.
- Prominent logo with corrected SVG bounds; full-width chat/browser workspace; large task composer; session-only history; sample approval flow.
- Production assets: `assets/app.js`, `assets/app.css`; static HTML references versioned asset URLs to refresh cached copies.
- Source and production assets are tracked in Git. No server package installation, service restart, firewall change, or Apache configuration change was needed for the redesign.
- Staged first at `/preview/`, then copied the validated HTML into the main webroot. Source files and the repository remain outside the public document root.
- Desktop validation: task suggestions fill the composer, submitting displays the demo response, approval updates sample status, session history lists the task, and New task resets the workspace. Logo and Google Font declarations were checked visually / in the DOM. The composer is about 660px wide by 180px high at the current desktop size, and Send remains visible.
- Mobile CSS includes a chat/workspace switch; the connected browser's viewport override did not change its measured width, so phone-size visual verification remains outstanding.
- Backup before replacing the homepage: `/srv/itproguy/index.before-react.html`. To restore the previous static layout, copy that file over the public `index.html`. Retain the current JS/CSS assets until rollback is complete; they do not affect the previous self-contained HTML.
- React builds do not enable AI, authentication, payments, live browser operation, or real trial deductions.
