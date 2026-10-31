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
- An account-level abuse review queue is not implemented. Text safety refusals can pause individual requests; account review requests are handled manually through the published support address. There is no image moderation workflow.
- The admin area does not yet provide full role separation, operational incident tooling, or finance/refund controls.
- The public site was refreshed from the current build after a browser cache initially displayed an older owner-preview screen. Always use a hard reload when checking launch copy.

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
