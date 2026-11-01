## 2 November 2026 — Self-hosted live browser deployed

Release: launch-20261102-live-browser-v1. No paid browser provider or new remote-desktop service was installed. Existing VPS Chromium now supplies a live CDP screencast over authenticated same-origin SSE. This replaces periodic full screenshots in the customer UI; model inspection still takes screenshots only outside private takeover.

Changes: runtime/pilot-stream.mjs streams JPEG frames with backpressure, one viewer per account, session/auth expiry checks and cleanup. /api/pilot/stream derives account ownership from the existing secure cookie; cross-site viewers are rejected. Metadata polling uses /api/pilot?stream=1 and does not capture screenshots. Customers can open a browser without a model call, navigate using the address bar, click/type/paste directly in the image, then explicitly hand control to Axel. Text input is coalesced while requests are in flight. Password/OTP detection ignores hidden fields. Existing private mode, metering, model/tool approvals and identity login are retained. Browser input is blocked while Axel runs; private values are not recorded in model messages or audit events.

Verification: production build, git diff check and all 35 existing tests pass. runtime/live-browser-smoke.mjs ran as axonadmin with the production Node executable and verified a real live frame, direct typing, hidden password detection, unauthenticated/cross-origin rejection and input blocked during agent control. Live HTTPS UI opened the VPS browser, navigated to a disposable test form, typed Axel via keyboard events and explicitly handed the session to Claude. Axel correctly reported title ITProGuy browser verification and field value Axel without changes. The test session was ended and temporary form removed. API health is HTTP 200. Initial restart produced a transient 503 during the roughly 8-second Node startup, then recovered.

Capacity: German host has 6 CPU cores, about 12 GB RAM (11 GiB shown), about 5.9 GiB available and 63 GB disk free at check. Existing shared applications remain running. After the test, API service MemoryCurrent was about 211 MiB. This is not a concurrency benchmark. Existing two browser slots and 1 GiB API cap remain; each uses an isolated browser context, not a hardened per-customer VM/container. Upgrade capacity only after measuring load and strengthening isolation.

Pending: actual Google/Microsoft customer sign-in and post-login tasks, latency/load tests, mobile/IME/paste/drag/drop/accessibility coverage, durable task/session recovery and stronger browser isolation. The exact per-action approval policy is unchanged; proposed task-plan approval with risk-based routine actions remains to be designed/reviewed. Broad paid production is still blocked by the previously listed checkout, webhook, invoices, renewals/refunds, security/legal and UAT work. No browser engine can guarantee third-party login acceptance or CAPTCHA success. No Browser Use package or cloud account was added.

Rollback: /srv/itproguy/backups/live-pre-20261102 contains pre-update runtime source modules and static webroot. Restore pilot.mjs and customer-server.mjs to /srv/itproguy/runtime and restore public/, restart itproguy-api, then verify health. Do not roll back the customer database. Recovery: Cloud Shell, ssh axon-german. Repo /srv/itproguy/repo; active runtime /srv/itproguy/runtime; webroot /var/www/itproguy.com/public. Tests/logs: /srv/itproguy/staging/live-browser-tests-full.log and live-browser-smoke.log. Ended the disposable test browser; next customer starts with Open browser.


# Axel continuation checkpoint — 31 October 2026

Release `launch-20261031-pilot-takeover-v5` is deployed on the German host. The new right panel is an interactive pilot, not the old public-page screenshot card. This checkpoint supersedes earlier statements that ordinary task execution has no tools; those older entries describe previous releases.

Completed and checked:

- Browser tool loop with Claude Sonnet, isolated customer sessions, live screen updates, action review, Take control, private input, Resume Axel and End session.
- Customer takeover pauses model requests. Login detection includes Google/Microsoft hosts and password/OTP fields in child frames. Explicit resume continues in the same browser session.
- Exact approval/task IDs, stale target checks, origin/authentication guards, no raw private input in the application audit or model conversation.
- Existing trial/paid metering is reused per completed model round. Login/approval waiting is not charged. No new daily request or token allowance was added.
- Compact bottom composer, Markdown replies, signed-in shortcut removal, fixed pilot toolbar, and consistent bottom-left menu rows.
- HTML/interrupted API responses now show a recoverable connection message; successful polling clears it. Both apex and www API paths returned JSON when checked.
- Public FAQ and policy disclosures were updated for the pilot and takeover data flow.
- Full tests: 35 passed, 0 failed. Production build and git diff checks passed. Live API health reports browserActions=true, pilotBrowser=true, publicPagePreview=true. These indicate the controlled pilot is connected; they do not establish that every external service has passed UAT.

Live evidence:

- Axel opened a real public page through its tools.
- In an unlinked temporary form with no customer data, Axel filled a draft title, waited for exact approvals, saved it and verified the changed result in page text and screenshot.
- Customer control changed a harmless field. After explicit resume, Axel read the same session, identified the manual change and did not save it again.
- Opening Google Accounts automatically paused for customer sign-in. No credentials were entered by the development agent, and no completed Google login, Microsoft login, DKIM configuration or external account change was asserted.
- The temporary test form was removed. The workspace menu was cropped and visually checked without inspecting the private pilot screen.

Where work stops:

- The current owner pilot is paused at Google Accounts sign-in, with the customer in control. Preserve it; do not restart the API or close the browser while the customer is signing in. The one-hour idle expiry and in-memory task limit still apply.
- The latest source and deployment instructions are in `runtime/PILOT-ARCHITECTURE.md`. This is the primary technical resume reference.

Pending before broad/paid production:

1. Actual Google/Microsoft sign-in, CAPTCHA and post-login task UAT, including real Exchange/DKIM and website-admin operations.
2. Dedicated scoped provider API integrations where browser operation is blocked or insufficient. Current Google/Microsoft ITProGuy identity sign-in scopes remain openid/email/profile only.
3. Durable conversations/tasks and restart recovery; complete user history/export/deletion and notifications.
4. Uploads/downloads, chat image attachments, richer select/canvas/drag-and-drop interactions and additional app-specific workflows.
5. Checkout, webhooks, paid credit issuance, invoices/taxes, renewals/cancellation/refunds and reconciliation remain disabled.
6. Security/prompt-injection review, load/capacity and isolation tests, moderation/appeals, backup restore drill, legal review, mobile pilot/accessibility QA and customer UAT.

Operating limits: two active pilot slots, existing 1 GiB API memory cap, one-hour browser idle cleanup, process-memory task state, review required for click/fill/key and navigation in an existing browser. Screenshots refresh about every 1.5 seconds. Provider and website restrictions still apply.

Recovery: open the user's configured Google Cloud Shell and run `ssh axon-german`; verify host and `git status` first. Repo: `/srv/itproguy/repo`. Active runtime: `/srv/itproguy/runtime`. Static webroot: `/var/www/itproguy.com/public`. Service: `itproguy-api.service`. A private online DB/runtime/web backup was taken under `/srv/itproguy/backups/pilot-pre-20261031/` before deployment. Restore code/static files for rollback; do not overwrite the current customer DB with an older backup without a separate recovery decision.
