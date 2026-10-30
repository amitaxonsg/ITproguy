# ITProGuy production-readiness gates

Updated 30 October 2026. This register separates deployed code from end-to-end evidence and launch prerequisites. “Done” means directly verified; configured flags alone do not prove a provider handshake or customer workflow.

## Done and verified

- [x] Public HTTPS site and www redirect; deployment and rollback boundaries documented.
- [x] Customer email-code, Google, and Microsoft sign-in UI/API deployed.
- [x] Durable customer records, one-time code expiry/use limits, sessions, login history, trial and paid balances.
- [x] Returning verified Google identity can resolve to an existing email account while preserving its balances. Unverified email matches are blocked; email sign-in plus explicit linking is required.
- [x] Production build completed; customer API active; live health reported all three login options enabled.
- [x] Account tests passed 4/4, including returning-account balance preservation and unverified-link rejection.
- [x] German Cockpit `[Session] IdleTimeout = 60` minutes verified in its configuration.

## Implemented, but needs Amit's later UAT

- [ ] Complete email one-time-code delivery to a real mailbox and test expiry, resend limits, and welcome-back flow.
- [ ] Complete Google OAuth sign-in and returning-account flow on the production domain.
- [ ] Complete Microsoft organizational-account OAuth sign-in and returning-account/explicit-link flow.
- [ ] Verify sign-out, session persistence/expiry, and account balance display in the browser.
- [ ] Confirm mail provider sender/domain authentication and delivery monitoring.

## Not implemented or not launch-ready

- [x] Customer Claude text-guidance API deployed and verified with one synthetic live request. Server-only key; Haiku, 4,096-token response cap, no fallback, 10 requests globally and 3 per account per UTC day, token/request-ID logging without prompt storage. No browser actions or trial/paid-time deduction.
- [ ] Live isolated browser workflow, visible browser transport, platform allowlist, approval enforcement, audit record, and rollback/recovery.
- [ ] Stripe checkout, webhook verification, idempotent fulfillment, refunds, invoices/tax handling, and monthly auto-top-up cancellation.
- [ ] Durable credit metering/deduction, expiry, usage receipts, and per-customer/model spend limits.
- [ ] Admin console, staff roles/MFA, account support/reset flows, feature kill switch, and admin audit log.
- [ ] Public Terms, Privacy, Acceptable Use, Refund, Cookie, FAQ/contact and service-status pages; legal/business details and guarantee terms need owner review.
- [ ] Operational monitoring/alerts, database backup and restore drill, retention/deletion process, incident response and security review.
- [ ] Accessibility and full mobile/browser cross-device QA.
- [ ] Production end-to-end tests covering purchase-to-credit, task approval/execution, cancellation/refund, and recovery.

## Launch blockers / decisions

- Select and test the first supported website platform and explicitly scope permitted actions.
- Confirm legal entity/contact details, terms, privacy/retention, refund/guarantee language, taxes and supported customer regions.
- Confirm paid pricing and whether monthly billing is enabled at launch.
- Configure and verify sender DNS (SPF, DKIM, DMARC) for the chosen transactional mail service.
- Set monitoring, provider spend alerts, and a hard monthly budget before any customer AI traffic.
- Do not enable public paid service until the open implementation gates are complete and Amit's UAT passes.

## Current customer-visible behavior

- Sign-in is available for email, Google and Microsoft when the corresponding provider values are configured.
- Customer task requests receive Claude text guidance. The API does not change a live site/account and does not deduct trial or paid time; browser actions remain disabled.
- Checkout is disabled. The website remains an owner preview rather than a public paid production service.
- The site health endpoint reports service/provider configuration; it does not verify a completed OAuth or email-delivery transaction.
