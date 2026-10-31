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
