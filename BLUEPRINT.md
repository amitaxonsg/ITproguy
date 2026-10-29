# ITProGuy — Product Blueprint (Review Draft)

**Prepared for:** Amit, Axon 1Pro Group  
**Status:** Blueprint only. No server changes, installs, DNS or SSL changes, accounts, API keys, payments, or customer data have been touched.

## 1. Product in one sentence

ITProGuy is a guided digital operations assistant for everyday business tasks. A business user describes the problem in plain English; Axel checks first, explains what he found, shows the work in a visible browser, and asks for approval before making an online change.

It is a task assistant and supervised operator, not an open-ended chatbot, image generator, coding tool, or replacement for a human engineer on complex or risky work.

## 2. Brand and first-page direction

**Product:** ITProGuy  
**Assistant:** Axel  
**Suggested greeting:** “Hi, I’m Axel, your IT Pro Guy from Axon 1Pro Group. Tell me what’s getting in your way. I’ll check first, explain what I find in plain English, and wait for your approval before changing anything. You can watch the browser while I work.”  
**Company line:** “Established in Singapore, with headquarters in Clark.”

### Proposed layout

- **Left:** Axel’s friendly illustrated character, a short rotating welcome line, supported task examples, and the account/profile area at the bottom.
- **Right:** A task box and a large live browser panel. The user sees the active site and each step as it happens.
- **Persistent action strip:** “Checking” → “Here’s what I found” → “Approve this change” → “Completed / needs your attention.”
- **Mobile:** Task conversation first; browser preview opens as a clear, full-screen step when work begins.

**Logo brief for a later design step:** clean modern wordmark “ITProGuy”, a warm, capable engineer character/mascot for Axel, simple shapes, legible at small sizes, and a restrained navy/blue/teal palette. Avoid robot, coding, and image-generator clichés. No logo has been generated in this blueprint stage.

## 3. First release: keep the promise achievable

Start with one dependable path: **browser-based website support**. The platform should identify a service from the current website address or a URL the user provides, then confirm the detected provider with the user. It cannot reliably detect every account or issue before the user opens or connects the relevant service.

### Initial supported queue

1. **Read-only checks:** inspect a page, identify a visible error, explain a settings issue, and draft a proposed change.
2. **Low-risk website updates:** text, contact details, simple page content, and metadata on a short list of tested platforms.
3. **Preview and approval:** show the exact intended change and obtain a clear “Approve” action before submitting it.
4. **Completion record:** show what changed, when, and how to undo it where the platform supports an undo or restore.

Begin with WordPress and one hosted builder (Wix or Squarespace). Add Shopify and cPanel only after the same safety and recovery flow is tested. Google Workspace, Microsoft 365, and Zoho should be added through official sign-in/permission connections where available. Email troubleshooting should begin with guided, read-only checks; sending or deleting mail is a separate, explicit action.

“If it is visible in a browser, Axel can do it” is too broad for launch. Some providers block automation, require CAPTCHA/MFA, have no safe rollback, or expose security-critical controls. Axel should say when a task is unsupported and offer a human handoff.

## 4. Safety and trust rules

- **Inspect first:** default to read-only diagnosis. Tell the user what was checked, what was found, and why a change may help.
- **Approval before writes:** name the target account/site and the exact proposed change. No silent publishing, email sending, deleting, purchases, DNS edits, permission changes, or security-setting changes.
- **User controls sign-in:** the user completes login and MFA in the provider’s own page. Never ask them to paste a password into Axel’s task box.
- **Do not promise “passwords are never logged” until proven:** a hosted remote browser can still expose credentials to the browser host or session recorder. Prefer a local browser bridge for generic browser work, or vendor OAuth with narrow scopes. Disable screenshots/video/DOM logging around credential fields, redact secrets, and test this claim before advertising it.
- **Keep sessions isolated:** separate browser profiles per customer and task; expire sessions; revoke tokens; encrypt secrets; restrict staff access; audit administrative access.
- **Recovery:** make a backup/snapshot before supported high-impact edits; state clearly when no rollback exists. Never promise every change is risk-free.
- **Escalate:** route server, network/router, account recovery, suspicious access, and irreversible actions to a human or a carefully scoped future workflow.
- **Local computer support is Phase 2:** use a signed desktop helper with allowlisted read-only diagnostics first. Do not provide Axel a general administrator shell. Any repair must be previewed and separately approved.

Replace “100% risk free” with an accurate promise: **“You review and approve changes before Axel submits them. Where the service supports it, we keep a recovery point.”** A money-back policy should define what qualifies, the time window, and the remedy; do not blame the customer automatically for a mistake.

## 5. Technical plan and operating cost

### Recommended early stack

- **Web app:** responsive task workspace with a visible browser panel and a simple customer account page.
- **Application/API:** one isolated application stack, separated from existing hosted sites and databases. Use containers or another repeatable deployment boundary; secrets stay in server-side secret storage, never source files or browser code.
- **Browser work:** Playwright-based session automation with a visible, isolated browser. For the safest generic sign-in experience, evaluate a local browser extension/bridge so credentials remain in the customer’s own browser. Use official vendor APIs/OAuth for Google, Microsoft, and Zoho when those APIs cover the task.
- **Model calls:** start with a server-side model gateway and one default low-cost Gemini Flash model for intent parsing, explanations, and safe task plans. Escalate to a stronger model only when needed and enforce per-task cost limits. Keep provider selection replaceable; a router such as LiteLLM/OpenRouter can be evaluated later, but a router does not make model usage free and adds another processor/vendor to review.
- **No local LLM in Phase 1:** it adds memory/operations burden and is not needed for the first browser workflow. The model is not the browser-control system; deterministic tools and approval gates execute the actual steps.
- **Usage controls:** token limits, browser-session timeouts, per-user trial caps, provider spend alerts, and a hard daily/monthly budget. Do not assume “free” model tiers are suitable for customer data or production availability.

The MVP should be economical on the existing VPS only after its workload and isolation are assessed. Do not install into a live hosting stack or expose admin panels to customers. Keep API keys in a protected admin-only settings area backed by encrypted server-side secrets; show only masked key status, never the full stored value again.

## 6. Trial, paid usage, and price recommendation

### Trial

Offer **one 30-minute trial per verified customer account/email**, with rate limits and an abuse check. Make the remaining trial time visible. A free trial should have bounded provider spend and clearly state which platforms/actions it covers. Consider allowing read-only checks and a small number of explicitly approved low-risk edits so users can experience the product safely.

### Starting price to test

Recommend a private-pilot price of **US$5 per service hour** for automated browser work only, sold as prepaid time. At reference rates near US$1 = S$1.28 and ₱64, that is approximately **S$6.40 / ₱320**; refresh the rate and round checkout prices. **US$4/hour** (about S$5.10 / ₱256) is a possible introductory promotion, but US$5 gives more room for unexpected model use, browser time, refunds, and shared infrastructure. Treat local equivalents as estimates, not fixed exchange promises.

Illustrative variable-cost check for one active hour: a Gemini Flash workload of 150,000 input plus 30,000 output tokens is about **US$0.23** at the current listed Gemini 3.6 Flash standard rates; one additional Browserbase Startup overage browser hour is **US$0.10**. A US$5 Stripe card payment settled in USD is about **US$0.67** at the listed 3.4% + US$0.50 rate before any international-card or currency-conversion surcharge. That leaves roughly **US$4.00** before fixed hosting/plan costs, support, tax, refunds, and unusually long or model-heavy jobs. This is an example, not a guarantee: measure real task usage and enforce a hard per-task model and browser budget. If sessions are self-hosted, allocate the VPS cost and capacity instead of treating browser runtime as free.

US$4/hour can still cover these direct variable costs under the same controlled example, but leaves about US$3.00 before fixed costs and other overhead. Avoid small standalone card charges: use a larger prepaid wallet/top-up and deduct time in minutes, or sell a one-hour minimum. A US$2/hour headline rate is not recommended. Human engineer escalation must be priced separately; the Axon guide lists engineering and custom maintenance at US$100/hour, so do not include that labor in the automated rate.

Show the customer the exact amount and currency before checkout. Use Stripe for checkout and payment history; keep an internal ledger of purchased, used, expired, refunded, and adjusted minutes. Do not store card details. For live local-currency pricing, evaluate Stripe Adaptive Pricing or maintain rounded SGD/PHP price tables; show that converted prices can include a conversion margin and confirm the settlement currency before launch.

## 7. Admin console requirements

Admin-only dashboard for Amit/Axon staff:

- Customer profile, verified email, account status, last login, and safe password-reset action (never reveal or set a shared fixed password).
- Trial eligibility and remaining minutes; purchased hours, usage ledger, invoices, refunds, and payment-provider references.
- Per-customer task history and approvals with sensitive fields redacted; configurable retention/deletion policy.
- Model/provider configuration, spend limits, feature flags, platform support list, and incident pause switch.
- Email templates for verification, trial ending, purchase receipt, password reset, and task summary.
- Staff roles and admin audit trail.

Never hard-code or publish the proposed fixed admin password `599000`; it is short and guessable. Use a unique strong secret, MFA, and a documented recovery route. The admin console must not expose Gemini, SMTP, or Stripe secrets in logs or UI after saving.

## 8. Email, domain, and launch details to settle later

- Desired support mailbox: `hireme@ITproguy.com` forwarding to `amit@axon.com.sg`. Configure Cloudflare Email Routing only after confirming ownership, destination verification, and the exact domain spelling.
- Product branding has appeared as **ITProGuy.ai** and **ITProGuy.com**. Confirm which domain serves the app; do not infer that the `.com` mail domain and app domain are the same.
- The supplied server IP is `161.97.137.234`; confirm the exact hostname/A record and current server allocation before any SSL or deployment action.
- Create an SPF/DKIM/DMARC plan for outbound email before sending customer mail. Use a transactional email service or properly configured SMTP; SMTP/API key stays server-side.

## 9. Delivery phases

**Phase 0 — approve this blueprint:** confirm name/domain, first supported platform, pilot price, trial rules, email routing, and claims/terms. No server work.

**Phase 1 — private MVP:** branded landing/workspace, account and admin roles, one tested browser platform, read-only diagnosis, visible task steps, explicit approval, audit record, backups/recovery where supported, spend controls, test-mode payments, and email templates.

**Phase 2 — broaden integrations:** add more website builders and OAuth-backed Google Workspace/Microsoft 365/Zoho actions; add task packs, multilingual UX, and production billing after unit-cost and safety review.

**Phase 3 — local computer helper:** signed Windows/macOS app, consent-based read-only diagnostics, explicit approval for a small allowlisted repair catalog, and a user-visible uninstall/data-clear process.

## 10. Decisions requested before implementation

1. Confirm the app domain: `ITProGuy.ai`, `ITProGuy.com`, or another exact hostname.
2. Pick the first supported website platform: WordPress, Wix, or Squarespace.
3. Approve a pilot starting point of US$10/hour (local equivalents shown as rounded, updated estimates) or set another rate.
4. Confirm whether 30 free minutes can include a few approved low-risk changes, or should remain read-only.
5. Confirm `hireme@ITproguy.com` forwarding to `amit@axon.com.sg` and the exact capitalization/spelling of the owned domain.

---

## Public sources used for planning

- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Stripe Singapore pricing](https://stripe.com/en-sg/pricing)
- [Stripe Adaptive Pricing](https://support.stripe.com/questions/adaptive-pricing?locale=en-GB)
- [Browserbase pricing](https://www.browserbase.com/pricing)
- [Bangko Sentral ng Pilipinas exchange rates](https://www.bsp.gov.ph/SitePages/Statistics/exchangerate.aspx)
- Axon Master Knowledgebase & Operating Guide (read for company context; its listed engineering rate is USD $100/hour, which should remain distinct from this proposed self-service pilot price).
