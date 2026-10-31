# Axel pilot runtime and continuation checkpoint

Release: 31 October 2026, `launch-20261031-pilot-takeover-v5`.

## Current outcome

The workspace now has an interactive remote pilot instead of the old public-page screenshot card. Axel uses a browser tool loop, proposes actions for review, and pauses for customer takeover at sign-in. This is a controlled browser pilot, not a claim that all external applications or paid production workflows are complete.

## Code and request flow

- `runtime/pilot.mjs`: `PilotService`, per-account task state, model tool loop, review gates, takeover input, one-hour idle expiry and audit events.
- `runtime/customer-server.mjs`: creates the pilot with the existing account database, model client and metering functions. Dispatches `/api/pilot` after deriving the user from the secure ITProGuy cookie. Logout ends that user's pilot. The old `/api/axel` route remains for compatibility, but cannot conflict with an active pilot.
- `runtime/browser-runtime.mjs`: existing isolated Chromium contexts and DNS/private-IP URL checks. The pilot reuses the same context through task work, customer takeover and resume. No model shell or arbitrary code execution tool is provided.
- `src/PilotPanel.jsx`, `src/pilot.css`: live browser screen, stable toolbar, Take control, Resume Axel, End session, private input, keyboard/scroll controls and action review. Screenshot refresh is about every 1.5 seconds, not a video stream.
- `src/pilot-api.mjs`: validates response content type, translates HTML/interrupted responses to a reconnect message, preserves authentication errors. Successful polling clears transient connection errors.
- `src/main.jsx`: starts pilot tasks, displays progress/results, keeps the composer at the bottom and scrolls only the conversation when following new replies. Signed-in users no longer see the introductory shortcut shelf. Markdown is rendered with react-markdown/remark-gfm without images or raw HTML.
- FAQ and policies describe pilot operation, takeover, data processing and current limitations. Legal review remains open.

`POST /api/pilot` with `action=start` accepts a task. The request returns promptly; the model loop continues asynchronously. `GET /api/pilot` returns the authenticated user's task and current browser screenshot. Other POST actions use the current task ID: `takeover`, `resume`, `approve`, `reject`, `input`, `end`. Approval also requires the exact pending approval ID.

States are running, approval, takeover, complete, paused, error, blocked and ended. A follow-up instruction during an active task is queued; it does not silently resume private takeover. A completed task can be followed by a new task in the same browser context. End session destroys the context and its cookies.

## Model and browser tools

The execution model uses the existing `policy.fallbackModel` (currently Claude Sonnet 5.5) and provider output ceiling from `claude-router.mjs`. No extra daily task or product token allowance was added. Provider limits, model context, timeouts, account time and resource capacity still apply.

Tools: navigate, inspect, click, fill, key, scroll and handoff. Inspection returns visible element targets, page text and a screenshot, including iframe targets. Only the latest model screenshot is kept in the in-memory conversation. Click/fill/key and navigation in an existing browser wait for an exact customer review. Targets are checked for changed page URL, label and visibility before executing. Forms involving private input or specified consequential steps hand control to the customer.

The agent must inspect results before claiming completion. It must use the tools when able to perform the requested work, rather than output a tutorial. Website content is untrusted and cannot change the user's task or grant authority.

## Customer sign-in and privacy

Password or OTP fields, including child frames, and known Google/Microsoft sign-in hosts pause the model before a model screenshot is captured. Other sign-in pages may also be handed off by the model or by the customer choosing Take control.

In takeover, the customer clicks the remote browser image and sends private text or keyboard actions directly to that session over HTTPS. The application does not add these values to model messages or the audit record. No new browser screenshots go to the model while paused. The private input box is cleared when sent, resumed, ended or unmounted. Resume explicitly allows the model to view the current page again. A heuristic rejects obvious password/key/code assignments in chat, but this is not a comprehensive secret-detection system.

The customer signs in inside this remote browser. Existing cookies from the customer's local Chrome are not copied into it. Completing Google or Microsoft identity login to ITProGuy does not delegate Gmail/Drive/Exchange/Graph API permissions.

## Metering, audit and capacity

Each completed model round uses the existing reserveUsage/finishUsage ledger. Trial seconds are used before paid seconds. Waiting for customer login or action approval is not charged. Failed model requests are not charged. Completed model processing can be charged even if a later website step cannot finish; full failed-task refund/reconciliation logic remains a billing requirement.

`pilot_audit` records user ID, task ID, event type, website origin and timestamp. It has no private-input value, screenshot or model transcript columns. Task prompts, model conversation, pending approval and current state are held in process memory. A tab reload can recover the active process state; an API restart cannot. Durable task/conversation recovery and export are still pending.

At present there are two active pilot browser slots. Existing systemd MemoryMax is 1 GiB and browser idle cleanup is one hour from task/input activity. Polling alone does not renew idle activity. Scale/load review, stronger resource isolation and multi-process session routing remain open. The service must not be advertised for unrestricted concurrency.

## Verification performed

- Automated tests cover account ownership, stale task IDs, private takeover input exclusion, no model requests while paused, explicit resume, approval matching/replay, credential-shaped chat rejection, authentication/origin checks and login detection in child frames.
- Live model/browser task opened example.com and read the returned page.
- In an unlinked temporary form with no customer data, Axel filled Draft title with `Pilot test verified`, waited for approval, clicked Save draft, and verified `Saved draft: Pilot test verified` in page text and screenshot.
- Customer takeover changed the field to a harmless manual test value. Resume Axel inspected the same session, reported the changed field and correctly distinguished the unsaved value from the prior saved status. It made no extra changes.
- Google Accounts opened and automatically entered customer takeover. No real credentials, CAPTCHA, consent or external account change was performed.
- The temporary public test form was removed after the tests.
- An HTML-response error appeared during the deployment transition. Both apex and www pilot endpoints returned JSON when checked. The UI now validates API response types and clears transient connection errors after successful polling instead of leaving a raw JSON parse error on screen.
- The full automated suite passes 35/35, the production build passes, and the final menu change was visually checked. The four task shortcuts now have the same alignment, font and spacing as the account links; the menu fits within the viewport and scrolls internally.
- Fresh live workspace inspection showed the active pilot and no lingering HTML/JSON error. No further outage was induced while the customer was using private sign-in.

At the stopping point the owner pilot is paused on Google Accounts sign-in. The customer has control. No successful authentication or real tenant change has been verified. Do not restart the API, end that session or inspect private browser screenshots while the customer completes login. Resume only when the customer chooses Resume Axel. The session can still expire after one hour of inactivity; source, audit and this checkpoint remain, but browser/task memory is not durable.

## Remaining work

1. Real Google/Microsoft/other-service login, CAPTCHA and post-login task UAT. Exchange/DKIM and real website admin edits are not yet verified.
2. Dedicated provider API integrations and scoped delegated consent where browser access is insufficient. Identity sign-in remains separate.
3. More interaction coverage: uploads/downloads, select controls, complex canvas editors, drag-and-drop and app-specific workflows. Current tools do not guarantee every website will work.
4. Durable conversations/tasks, restart recovery, customer history/export/deletion, notifications and cancellation recovery.
5. Checkout, webhooks, paid credit issuance, invoices/tax, renewals/cancellations/refunds and reconciliation remain disabled.
6. Security/prompt-injection review, browser isolation/load tests, moderation/abuse appeals, backup/restore drill, legal approval, mobile pilot/accessibility QA and customer UAT.

## Server recovery and deployment

Use the user's configured Cloud Shell at https://shell.cloud.google.com/?show=ide%2Cterminal and run `ssh axon-german`. Confirm the host and checkout before changing anything. Current checkout is `/srv/itproguy/repo`; the active API runs the separate `/srv/itproguy/runtime` tree. Static webroot is `/var/www/itproguy.com/public`.

Before this release an online SQLite backup, active customer-server module and static webroot copy were saved under `/srv/itproguy/backups/pilot-pre-20261031/` (directory permissions 0700). No secrets are in this document.

To continue: read this file and the newest PRODUCTION-READINESS.md checkpoint, inspect `git status`, check the service/health and active pilot state, then address the first remaining gate. Do not repeat earlier model tests or charge new test work without a reason. Never treat a previous Google sign-in page view as completed account authentication.

For a release: run appropriate tests/build and diff checks, synchronize changed runtime modules into `/srv/itproguy/runtime`, restart `itproguy-api.service`, confirm JSON health, then copy `dist/.` to the static webroot. Bump the frontend cache release for a bundle change. The main module now closes HTTP connections and exits on SIGTERM, with a five-second fallback, instead of waiting through the old service stop timeout. Any restart clears active pilot tasks, so avoid interrupting customer work.

Rollback: restore the backed-up active customer-server module and webroot, restart the API and verify health. The added pilot_audit table is additive; do not restore the old customer database over newer customer records without a separate recovery decision.
