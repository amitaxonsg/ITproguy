## 2 November 2026 — Public credits navigation and live-screen recovery
Release: launch-20261102-stream-recovery-v6.

Reported issue: the Buy Credits request appeared correct in chat but the browser stayed on the Axon homepage. Confirmed cause: PilotService.perform matched the word buy and handed control to the customer before clicking. This was an overbroad payment guard, not a completed navigation with a merely stale picture. The live interface also showed Connecting and a stale-task message.

Correction: the reviewed, ordinary same-origin Axon anchor to /credit-top-up.html is now recognized as public navigation. The live DOM must still show an anchor with no onclick, download attribute, enclosing form, button role, query or hash, on axon.com.sg or www.axon.com.sg. This is a narrow exception for the verified information page. Other payment/consequential controls still hand off; no payment authority or unrestricted buy-link exception was added. Handoff wording explicitly states that nothing was clicked.

Stream recovery: same-account task replacement now retains the existing CDP capture hub when the browser session is unchanged, rather than closing/replacing the capture on every task ID. Capture restarts on main-page DOM content loading and a stalled-frame watchdog retries after five seconds without frames/restart. Browser-page changes clear the cached frame and signal updating. Under output backpressure, the newest pending frame is sent when the connection drains, without an endless resend loop. Account/session ownership and private takeover protections remain.

Frontend: stream connection depends on browser availability rather than task ID. Metadata refresh uses a generation counter so older responses cannot overwrite newer task state. Input on a stale task is discarded and state refreshed; it is never replayed into another task/session. Resolved stale-task warnings clear after successful refresh. Existing plan and exact action review remain.

Validation: all 40 automated tests pass. Added regression cases cover the narrow credits link, rejection of form/button/handler/query/external/checkout variants, two viewers across task replacement, and navigation frame restart. Real Chromium smoke passed for reviewed Buy Credits navigation with no form/payment submission, direct typing, authorization/origin checks and two-viewer streaming. A fresh live ITProGuy task repeated the owner's request: Axel proposed a public-page-only plan, received plan and click approval, clicked Buy Credits, the address and displayed live image changed to https://axon.com.sg/credit-top-up.html, and Axel reported the page content without entering/submitting payment data.

VPS observations: approximately 5.7 GiB memory available; API about 484 MiB versus 1 GiB cap at initial check, six CPU cores with load around 4.7. This does not establish unrestricted capacity or absence of all resource pressure; concurrency/load and stronger isolation remain pending. It does not explain the confirmed pre-click safety handoff. During rollout HTTPS briefly refused connections while Apache's journal showed a stop/start; Apache and API subsequently returned active and public health HTTP 200. No Apache config change was made for this fix.

Recovery: Cloud Shell -> ssh axon-german. Repo /srv/itproguy/repo; active runtime /srv/itproguy/runtime; static /var/www/itproguy.com/public. Backup /srv/itproguy/backups/stream-navigation-pre contains pre-fix pilot/stream modules and public webroot. Restore code/static only, restart API and verify health; do not restore an older customer DB. Restart clears process-memory pilot sessions. Logs: /srv/itproguy/staging/stream-navigation-tests.log, credits-navigation-smoke.log, stream-navigation-smoke.log. Current demonstration browser is on the public credits page; no credentials/card details entered and no payment made.

Pending remains: durable task recovery, broader payment-navigation classification, Google/Microsoft post-login UAT, load/isolation/security/legal and billing/invoice/refund gates recorded in earlier checkpoints. This fix is not a claim of end-to-end production readiness.


## 2 November 2026 — Browser-first workspace and scrolling improvements
Release: launch-20261102-browser-first-v5. Supersedes the earlier fixed split-view presentation; product/accounts/billing/identity login remain.

Deployed UI: full-size browser by default; top-left hamburger with task/history/profile/usage/invoices/pricing/help/privacy/security/terms/fair-use/sign-out options; Ask Axel opens a collapsible right panel with a bottom-fixed composer. Compact browser controls replace the large heading and private-control banner. Mobile 390x844 check passed for panel open/close and fixed composer; temporary viewport override was reset. Current limitations on checkout remain accurately visible.

Performance fixes: wheel input now uses bounded actual pixel deltas, merges pending wheel events and prevents outer-page scrolling. ResizeObserver fits the remote Chromium viewport to available space, preserving pointer coordinates. Live stream uses a shared account-bound CDP hub rather than disconnecting another authenticated tab on every connection; a real two-viewer smoke test confirmed no reconnect ping-pong. Hidden tabs stop their viewer connection and metadata polling; foreground reconnect receives the latest frame. Frames use quality 55, a bounded output buffer and latest-frame scheduling. Private frames exist only in the active account's stream hub/client memory, never model/audit storage, and are released when the hub closes. Model browser inspection still pauses during private takeover.

Startup now uses about:blank with a branded browser-home prompt, avoiding a Google navigation/cookie wall. Manual navigation returns after response commit without an unused page-text/screenshot capture. Model navigation also avoids the redundant capture, then performs its own checked inspection. Existing URL/DNS/private-network checks remain; only exact about:blank is additionally allowed. Native/manual controls still have cross-region network delay.

Observed single live checks, not a controlled benchmark: manual Axon navigation control response previously 5148 ms, after optimization 852 ms; a wheel response was 388 ms. These times are measured in the customer UI and do not mean the whole website finished rendering. Heavy site assets/animations, user network distance to Germany and model thinking time still affect experience. No multi-customer load/capacity claim is made.

Plan approval: new browser actions must first obtain approval through propose_plan. Live test proposed example.org navigation, waited for Approve and start, retained the existing exact navigation review, then navigated and verified Example Domain without other changes. Read-only inspection/reporting can finish without changing the browser. Existing click/fill/key/navigation action approvals were not weakened; plan approval does not grant unrestricted execution. Broader risk-based routine-action consent remains pending.

Validation: build and diff checks pass; 38 automated tests pass, including new plan-gate and bounded pixel-scroll/viewport cases. Real Chromium smoke passed for frames, direct typing, hidden-login detection, unauthenticated/cross-origin denial, input blocking while agent runs, and two authenticated simultaneous viewers. Live UI verified browser default, drawer, mobile layout, plan approval/result, actual Axon navigation and scrolling. API health is HTTP 200. No external browser subscription/service, generic shell tool for Axel, or new customer-facing credentials were added.

Runtime changes: runtime/browser-runtime.mjs, pilot.mjs, pilot-stream.mjs; tests pilot.test.mjs and live-browser-smoke.mjs. Frontend src/main.jsx, styles.css, PilotPanel.jsx, pilot.css, index.html. Server checkout /srv/itproguy/repo; active modules /srv/itproguy/runtime; static /var/www/itproguy.com/public. Backup /srv/itproguy/backups/browser-first-pre-20261102 contains previous public webroot and pilot/stream/browser runtime modules. Restore these modules and public/, restart itproguy-api, verify health; never replace the current customer DB with an older backup. Restart clears in-memory tasks. For recovery use Cloud Shell, ssh axon-german. Test logs /srv/itproguy/staging/browser-first-tests.log and browser-first-smoke.log.

Remaining: real Google/Microsoft sign-in/post-login UAT; robust browser isolation and concurrent-load review; durable recovery; richer input/upload/download/canvas/drag and accessibility coverage; moderation/security/legal/backup review; checkout/webhooks/invoices/renewal/refund work and broader UAT. The product must not be described as fully production-ready on the basis of these UI/browser checks.


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
