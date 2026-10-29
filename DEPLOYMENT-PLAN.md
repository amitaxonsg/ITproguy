# ITProGuy staged delivery plan

**Owner:** Amit, Axon 1Pro Group  
**Updated:** 29 October 2026  
**Delivery style:** One small, reviewable phase at a time.

## Phase 0 — product and host preflight

**Status: complete for planning; no application files changed on the server.**

- Product name, Axel persona, task-first experience, visual prototype, and safety principles are recorded in the blueprint.
- Amit reports that the domain and DNS are ready. Verify the exact hostname and its records before binding the site or issuing SSL.
- The German staging server was reviewed through its web console. It is an existing shared environment with active web and container workloads, not an empty VPS.
- The server's software-update screen reports that it cannot refresh the package cache while offline. Investigate connectivity before installing anything.
- No server software, firewall, web-server configuration, existing application, or customer site has been changed.

## Phase 1 — isolated public preview

Deploy the current static homepage/workspace preview to the agreed hostname.

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

## Current blocker before Phase 1

The server's package cache currently reports offline, and the terminal session reached a sudo password prompt. No password was entered and no privileged command was run. The exact hostname and the isolated route also need verification. Phase 1 can start after these checks are resolved without touching the server's existing applications.
