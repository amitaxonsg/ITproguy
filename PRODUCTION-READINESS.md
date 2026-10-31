# ITProGuy Production Readiness

Last checked: 31 October 2026
Target: German host german.axonserver.com, project /srv/itproguy/repo
Recovery from Google Cloud Shell: ssh axon-german

## Current release

- Email-code, Google and Microsoft sign-in routes are configured. Email and Google owner sign-in passed previously; Microsoft owner-account UAT is still required. Health flags are not end-to-end proof.
- Axel provides text guidance only. The guidance API meters successful work against trial time first and remaining paid time second; failed and review-paused requests are uncharged. No daily task quota is configured. One in-flight request per account is allowed.
- Browser actions and connected-service execution are disabled. No real website or account change can be made by Axel.
- Profile settings include a private account photo. The client resizes accepted images to a 256-pixel JPEG; the authenticated API validates JPEG signature and size, stores it in a user-scoped SQLite table, returns it only to that account, and supports removal. Photos are not sent to Axel and are not automatically content-moderated.
- Public policies.html covers privacy, terms, acceptable use, fair use, security, and payments/refunds. It states current limitations and support contact. Counsel/business-owner review remains required for legal entity details, jurisdiction, DPO/contact, retention schedule, and final enforceability.
- Payments, purchases, credit renewal, invoices, cancellation and refunds are not integrated; checkout remains disabled. No card data is collected in the current site.
- Signed-in users can submit an account-review request or abuse report. Requests enter the restricted admin queue, and the owner can set accounts to active, under review or suspended. Under-review/suspended accounts are blocked from new guidance but can still access account activity. This is manual review only; automated abuse scoring, photo moderation, notifications and an appeal portal are not implemented.
- The admin area does not yet provide full role separation, operational incident tooling, or finance/refund controls.
- The public site was refreshed from the current build after a browser cache initially displayed an older owner-preview screen. Always use a hard reload when checking launch copy.

- 8. Add authenticated per-account usage, sign-in and purchase history; add restricted admin account, usage, payment and review-request views.

## Checks from this release

- node --check runtime/customer-server.mjs
- node --check runtime/claude-router.mjs
- node --test runtime/*.test.mjs: 19 passing tests, including profile-image authentication, validation, private retrieval and removal.
- npm run build: passed; public policy page is included in output.
- git diff --check: passed.
- Manual live customer task and photo upload were not run because this session had no owner-authenticated ITProGuy account tab. Do not describe synthetic/API tests as customer UAT.
- Mobile stylesheet breakpoints are present; visual mobile-device verification remains pending.

## Production gates still open

1. Obtain legal review and confirm Axon operator/legal entity details, applicable jurisdictions, data retention/deletion schedule, data-protection contact and incident process.
2. Implement a real abuse/account-review workflow with case IDs, evidence access controls, decisions, notice and appeal; add safe image moderation before making any photo public. Current avatar is private to the same user.
3. Complete owner UAT for email code, Google and the intended Microsoft identity, profile photo upload/removal, session expiry, and mobile browser layout.
4. Implement payment checkout and webhook verification, idempotent credit ledger, renewal/cancellation, invoices/tax handling, refund/dispute review, and end-to-end recovery tests before accepting customer payment.
5. Build and verify actual browser execution with least-privilege OAuth scopes, explicit approvals, audit logs, action evidence and rollback before enabling browser actions.
6. Complete monitoring/alerts, backup and restore drill, retention/deletion automation, accessibility review, and independent security review.

## Deployment checklist

1. Inspect git status and verify no secrets are staged.
2. Run runtime tests, production build and git diff --check.
3. Back up the current static webroot and database before schema or release changes.
4. Deploy dist/ to /var/www/itproguy.com/public/; restart itproguy-api.service after API changes.
5. Verify https://itproguy.com/, /policies.html, and /api/health from a fresh browser reload.
6. Verify the exact visible feature flags and limitations; do not claim full production readiness while gates above remain open.
7. Commit and push reviewed changes; append outcomes and unresolved work here and in the Drive master knowledgebase.

Current release source commit: 85fb7ee (profile photos, public trust policies, and refreshed release checklist). The build is deployed to the German host and GitHub main is synchronized.

## 31 October 2026 release checkpoint

Deployed to the German host after discovering that systemd runs the separate runtime tree at /srv/itproguy/runtime. The active account, customer API, router, and OIDC files have been synchronized from the repository; itproguy-api.service is healthy.

Completed in this release:
- Added branded FAQ, Help, and Pricing/Billing pages, shared responsive styling, and clearer navigation and policy links.
- Added a signed-in account activity view for balances, sign-ins, guidance usage, purchase/receipt records, and review requests.
- Added an owner-only admin console for account status, sign-ins, usage, purchase records, review queue, and audit events.
- Added private account-review and abuse-report requests, duplicate-pending protection, and owner-controlled active/under-review/suspended status. Under-review or suspended accounts cannot start new guidance.
- Updated privacy and fair-use copy to describe actual behavior and current limitations.

Verification: node --test runtime/*.test.mjs passes 20/20; syntax checks and npm run build pass; git diff --check passes; active runtime files match the repo; /api/health returns ok: true. Customer pages and admin/profile flows were checked while signed in. No real review request or paid purchase was submitted.

Still required before representing the service as fully production-ready:
- Checkout, card charging, receipts/invoices, refunds, renewals, taxes, and payment reconciliation are not enabled. Pricing is a preview; do not accept customer payments.
- Interactive browser actions and external-account execution are unavailable. browserActions=false; publicPagePreview=true means isolated public-page navigation and screenshot only.
- Uploaded-photo/image moderation and automated abuse classification are not implemented. Review requests are manual.
- Data export/deletion self-service, customer notification/appeal workflow, and final legal review of policies remain open.
- Full mobile-device visual QA and customer UAT remain pending. Desktop page checks do not establish mobile UAT.

Do not advertise disabled capabilities as live. Next release should complete payment and moderation decisions, run mobile-device QA and customer UAT, then update this record.


## 31 October 2026 release checkpoint

Deployed to the German host after discovering that systemd runs the separate runtime tree at /srv/itproguy/runtime. The active account, customer API, router, and OIDC files have been synchronized from the repository; itproguy-api.service is healthy.

Completed in this release:
- Added branded FAQ, Help, and Pricing/Billing pages, shared responsive styling, and clearer navigation and policy links.
- Added a signed-in account activity view for balances, sign-ins, guidance usage, purchase/receipt records, and review requests.
- Added an owner-only admin console for account status, sign-ins, usage, purchase records, review queue, and audit events.
- Added private account-review and abuse-report requests, duplicate-pending protection, and owner-controlled active/under-review/suspended status. Under-review or suspended accounts cannot start new guidance.
- Updated privacy and fair-use copy to describe actual behavior and current limitations.

Verification: node --test runtime/*.test.mjs passes 20/20; syntax checks and npm run build pass; git diff --check passes; active runtime files match the repo; /api/health returns ok: true. Customer pages and admin/profile flows were checked while signed in. No real review request or paid purchase was submitted.

Still required before representing the service as fully production-ready:
- Checkout, card charging, receipts/invoices, refunds, renewals, taxes, and payment reconciliation are not enabled. Pricing is a preview; do not accept customer payments.
- Interactive browser actions and external-account execution are unavailable. browserActions=false; publicPagePreview=true means isolated public-page navigation and screenshot only.
- Uploaded-photo/image moderation and automated abuse classification are not implemented. Review requests are manual.
- Data export/deletion self-service, customer notification/appeal workflow, and final legal review of policies remain open.
- Full mobile-device visual QA and customer UAT remain pending. Desktop page checks do not establish mobile UAT.

Do not advertise disabled capabilities as live. Next release should complete payment and moderation decisions, run mobile-device QA and customer UAT, then update this record.


## 31 October 2026  Work execution gap confirmed (commit d5e214b)

- The live owner-session prompt go to login page of gmail.com i can login now opens accounts.google.com in the isolated preview. The preview shows a user-clicked Continue in your browser to sign in link; no credentials were entered or submitted.

- The current Exchange/DKIM task response still returns PowerShell instructions rather than performing changes. This is expected from the current architecture: ordinary tasks are sent to Claude without tool definitions; the only deterministic browser route opens a public URL and captures a screenshot.

- BrowserRuntime has no click, keyboard, form-submit, sign-in, or website-edit operations. The browser is isolated with no customer cookies. Google and Microsoft OAuth request only openid email profile, which authenticates ITProGuy accounts and does not grant Gmail, Drive, Exchange, or Microsoft Graph API access.

- Conclusion: do-for-me task execution is not implemented and must not be presented as live. Production execution requires vetted Google/Microsoft/site integrations with explicit least-privilege grants, consent, per-action approvals, audit evidence and recovery. An alternative generic browser-control route needs a user-controlled browser bridge with a deliberate permission and security design.

- Verification after the latest code release: 24/24 automated tests passed; production build and git diff --check passed; live Gmail navigation succeeded after restoring the public-URL/DNS safety validator; health returned HTTP 200 with email login, Google/Microsoft identity login, task guidance and public browser preview enabled. Functional code commit d5e214b and status-semantics commit 815f6df are pushed to main.

- Still open: actual task execution and delegated integrations; payment checkout, receipts/invoices, refunds, renewals and taxes; email/OAuth production UAT; admin review UAT; formal legal/security/backup reviews; image/abuse moderation and customer UAT.


## 31 October 2026  Capability status clarified

- The live API now reports browserActions=false and publicPagePreview=true. This avoids presenting public-page screenshot preview as interactive task execution.

- The German API service is active and returns HTTP 200 after synchronizing runtime/customer-server.mjs. The 24-test suite and production build passed before deployment; live health reflects the new capability fields.

- Source commit 815f6df is pushed to main. Full do-for-me integrations remain unimplemented.
