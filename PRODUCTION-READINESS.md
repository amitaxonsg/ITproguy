# ITProGuy production-readiness gates

Updated 30 October 2026. “Done” means directly verified; configured flags do not prove a completed provider flow.

## Done and verified

- [x] Public HTTPS site and www redirect; deployment and rollback boundaries documented.
- [x] Email-code, Google, and Microsoft sign-in UI/API deployed. Health endpoint reports `emailLogin=true`, `google=true`, `microsoft=true`.
- [x] Owner email-code sign-in tested on the production domain. The code arrived in the owner mailbox; the message passed SPF, DKIM, and DMARC; sign-in succeeded.
- [x] Owner Google OAuth sign-in tested on the production domain and resolved to the existing owner profile.
- [x] Owner-only admin dashboard at `/admin/` opened successfully after email and Google sign-in. The admin overview, sign-in history, and audit event were visible; unauthenticated access was previously verified as rejected.
- [x] Durable customer profile, one-time-code expiry/use limits, sessions, sign-in history, trial and paid-balance fields are present.
- [x] Verified Google identity can resolve to an existing email account while preserving balances. Unverified email-based linking is blocked.
- [x] Production build completed; customer API active. All 13 runtime account/router/customer API tests passed; npm audit reported 0 vulnerabilities.
- [x] German Cockpit `Session IdleTimeout = 60` minutes was previously verified.
- [x] After a fresh reload, the public page no longer shows the stale “Your workspace, coming together” dialog or PREVIEW header. It identifies the experience as text guidance and states browser actions are disabled.

## Implemented, with UAT or follow-up still needed

- [ ] Test Microsoft organizational-account OAuth with Amit’s intended account. The current account chooser did not show the owner identity; no account was linked. The open Microsoft 365 admin session belongs to a different tenant user. Do not link that identity without Amit identifying it.
- [ ] Verify sign-out, session persistence/expiry, returning-user behavior, one-time-code expiry/resend limits, and mobile browser behavior.
- [ ] Email delivery to the owner passed SPF/DKIM/DMARC once; add ongoing sender and delivery monitoring.
- [ ] Clarify or remove the visible 30-minute trial balance. It is still shown in the signed-in owner UI and is stored as 1,800 seconds.
- [ ] Confirm or remove the 10% 10-hour volume discount currently displayed in the Hire Axel dialog; it is not recorded as an approved commercial term.
- [ ] Review current text-guidance limits against Amit’s stated no-token/no-task-limit requirement. The deployed guidance path still uses a 4,096-token response cap and 10 global / 3 per-account daily request quotas.

## Not implemented or not launch-ready

- [ ] Live isolated browser workflow, visible browser transport, platform allowlist, approval enforcement, audit evidence, and rollback/recovery. Health currently reports `browserActions=false`; do not enable by changing a flag alone.
- [ ] Stripe checkout, webhook verification, idempotent fulfillment, credit ledger/metering/deduction, expiry, usage receipts, refunds, invoices/tax handling, and monthly auto-top-up cancellation.
- [ ] The Stripe product has catalog prices but no ITProGuy checkout/payment link or application integration. The old default one-time price still says 24-month validity, while product policy says 12 months. A new one-time and monthly price were created, but no customer purchase flow is connected.
- [ ] Staff roles/MFA, support/reset flows, financial controls, and full admin operations. Current owner dashboard is read-only for profiles, sign-in history, stored payment/receipt records, customer requests, and audit; status updates are audited. There are no payment or customer-request records yet.
- [ ] Public final Terms, Privacy, Acceptable Use, Refund, Cookie, FAQ/contact and service-status pages; legal/business details and guarantee terms need owner review.
- [ ] Operational monitoring/alerts, database backup and restore drill, retention/deletion process, incident response, security review, accessibility and full mobile/browser cross-device QA.
- [ ] End-to-end tests for purchase-to-credit, task approval/execution, cancellation/refund, and recovery.

## Current customer-visible behavior

- Sign-in is available for email, Google and Microsoft when provider values are configured. Email-code and Google OAuth have passed an owner-account sign-in check; Microsoft has not.
- Text guidance is available. It does not change a live site/account. The current system still applies the listed request and response limits. The verified synthetic route previously returned zero trial deduction; Amit has now confirmed guidance must consume trial or paid time. Metering is still pending.
- The Hire Axel dialog offers one-time packs; monthly renewal and checkout are disabled. It states that payment, invoices and automatic renewals are unavailable. Credits are shown as valid for 12 months. The dialog still displays an unverified 10% discount.
- The signed-in owner UI displays 30 minutes of trial balance. No customer payment records exist.
- The health endpoint currently reports `ok=true`, `emailLogin=true`, `google=true`, `microsoft=true`, `taskGuidance=true`, `browserActions=false`. Provider flags do not substitute for end-to-end OAuth verification.
- The German Cockpit terminal currently requires a separate server-user login before more server changes or deployment can be made; its login screen labels the host “Axon German Staging VPS,” so verify this is the intended deployment target. During reauthentication, a value that may be a credential appeared as shell output; rotate the server-user password before continuing. The latest feature-code commit is `66080ef`; the readiness checklist was updated in commits `c437551`, `adea7ed`, and `db07e5f`.
- Do not describe the service as production-ready or accept paid customer work until the open implementation gates and owner UAT are complete.
