# ITProGuy private Claude runtime

Selected provider: Anthropic Claude API. Haiku 5.5 is the default and cheapest current Claude 5.5 tier; there is no separate low-cost model router. Task classes use low, medium, or high effort with output caps of 4,096 / 8,192 / 16,384 tokens. Temperature, top_p and top_k are omitted as required by Haiku 5.5.

`claude-router.mjs` uses the official SDK with a 60-second timeout per attempt and two SDK retries for eligible temporary errors. It permits at most one application-level fallback to Sonnet 5.5, with the same task output cap. Fallback is allowed after retryable failures or an incomplete/invalid answer. A trusted application validator can reject an answer. This does not magically detect every incorrect answer; task-specific checks and human review remain necessary. Refusals, authentication, billing and invalid-request errors do not trigger model escalation. Usage and request IDs are returned for accounting; prompt and key contents are not logged here. A complete request may involve up to six SDK attempts, so total latency and token costs exceed one call. No Opus escalation or unlimited retry loop.

Image generation is disabled. The module has no execution or image-generation tools. Explicit image-generation intents return Axel's upload response without an API call. The system prompt reinforces the restriction. User-uploaded images can later be used for website updates, but uploads and browser execution are not implemented by this transport.

## Installed server tools

Private Node 22.23.1, npm 10.9.8, Anthropic SDK 1.3.0, Playwright 1.64.1, Chromium revision 1248, FFmpeg, dotenv and zod are installed under `/srv/itproguy/runtime`. Gemini SDK remains installed but is not selected. Scoped browser AppArmor profiles were approved and loaded; global namespace settings were not changed. Browser binaries and their parent directories are root-owned to prevent the app user replacing privileged allowlisted executables. Future browser upgrades need a corresponding reviewed exact-path policy update.

Use the scoped tools directory first in PATH and set PLAYWRIGHT_BROWSERS_PATH=/srv/itproguy/runtime/browsers. `npm run test` runs six offline routing checks; `npm run check` imports Claude and launches sandboxed Chromium without an API call. Tests run directly in one Node process because spawning the test-runner subprocess was denied on this host. The six direct tests passed as axonadmin.

Credentials belong only in `/srv/itproguy/private/claude.env` using ANTHROPIC_API_KEY. Directory mode 700, file mode 600, owned by axonadmin. Never put a real key in Git, frontend code or ordinary chat. The uploaded key was installed into this protected file without printing its value. Its source file was moved from /root into the protected private folder. Haiku returned a successful live connection-test response, and both Haiku and Sonnet were verified available. The funded Console balance was $5 at the start of integration.

## Deployment boundary

The router and server source are staged privately on the German server and committed to GitHub. `server.mjs` implements an owner-only API; the service and HTTPS reverse-proxy examples are prepared but require activation. The React owner sign-in and reply interface is built and staged. No public paid API endpoint is activated by staging these files. The Console Agents overview controls a separate Anthropic-hosted service, not global defaults for direct API calls; no duplicate managed agent was created. Customer authentication, isolated browser sessions, approved action execution, credential redaction, per-user spend limits and visible browser transport are still required before customer use. Per-request token caps are not a complete monetary billing limit.


## Owner API activation plan

- Owner secret: a random code of at least 32 characters in ITPROGUY_OWNER_CODE, in the same protected environment file. The owner enters this in the site sign-in form; never enter the Claude key in the website. No owner code is committed.
- API listens only on 127.0.0.1:3188. Validate availability before activation. Install the prepared app-specific systemd unit, then add the prepared /api/ proxy lines only in the ITProGuy HTTPS virtualhost. Existing proxy modules were found loaded.
- The prepared API requires an owner session for paid requests. Sessions expire after one hour and reset on restart. Secure, HttpOnly, SameSite=Strict cookies, allowed-origin checks, bounded request bodies and a global sign-in attempt limit apply. No customer registration or password recovery is supplied in this private preview.
- Only one request runs at a time. A durable ledger reserves one of ten UTC daily requests before each non-image task; failures still consume a reservation. This limit is a request cap, not a dollar guarantee. Up to two retries per model and one Sonnet escalation remain possible. The public route must stay closed until owner-access activation is approved.
- The API fixes the public preview request tier to standard (8,192 output tokens, medium effort). Clients cannot select expensive models, inject system messages, send execution tools or change token limits. Session conversation context is kept in memory with a bounded history and clears on restart/logout.
- Browser actions and image uploads remain disconnected. Responses are plain text, never executable HTML. The frontend labels the browser pane as a visual preview. Do not advertise completed website edits until a separately tested execution workflow exists.
- Validate with `node claude-router.test.mjs` and `node server.test.mjs`. The latter verifies unauthenticated denial, origin rejection, owner login/cookie flags, image intent handling, daily limits, length limits and logout.
- Before activation, save the current virtualhost and public index/assets under /srv/itproguy/backups. Validate Apache syntax before graceful reload. Rollback restores those files and stops only itproguy-api.service; it must not stop shared Apache or other services.


## Verified integration checkpoint

The owner API was exercised on the German server with an ephemeral local session: owner login → authenticated /api/axel → Claude Haiku → successful response. The temporary local test server then closed. Two server API tests and six router tests passed. Public API activation remains pending. A static review build is available at https://itproguy.com/preview/claude-owner/; it is not yet connected to a public API route. Current production HTML, assets and ITProGuy virtualhost were backed up under /srv/itproguy/backups/before-claude-owner. No production Apache configuration was changed or reloaded. No API key or owner code is included in these backups or Git.

## Google and Microsoft customer sign-in

The customer API is deployed with Google and Microsoft OpenID Connect authorization-code flow, PKCE, state, nonce, issuer/audience/time/signature checks, and secure HTTP-only sessions. Live provider handshakes still require UAT. Sign-in is not evidence that paid task execution is ready. Only `openid email profile` is requested; no Gmail, Drive, Outlook, Graph, or other API access is requested.

Register these exact web redirect URIs:

- Google: `https://itproguy.com/api/auth/google/callback`
- Microsoft: `https://itproguy.com/api/auth/microsoft/callback`

Google sign-in requires a verified Google email. Microsoft sign-in is limited to organizational accounts and uses tenant-specific issuer validation. A verified Google email can securely match and return an existing email account, preserving its balances. Microsoft claims may not include a verified-email flag; when verification is unavailable, sign in by email and explicitly connect Microsoft from the account dialog. Never join accounts on an unverified email.

Store the four OAuth values from `oauth.env.example` only in `/srv/itproguy/private/auth.env`, owned by the service account and mode 600. Restart only the customer API service after installing the values. The health endpoint reports provider login as enabled only when both the client ID and secret are configured.

## Production-readiness checkpoint — 30 October 2026

- The public customer API now supports email one-time-code, Google, and Microsoft sign-in. Account logic preserves balances for returning users; verified Google email can link to an existing email account. Microsoft may require email sign-in followed by explicit provider linking when its verified-email claim is absent.
- The live health endpoint reported all three login methods enabled after deployment. Automated account tests passed 4/4. Real Google/Microsoft handshakes and inbox delivery remain unverified and are reserved for Amit's UAT.
- Customer text guidance is now connected through the customer API. It is bounded to 10 total and 3 per account per UTC day, uses Haiku with a 4,096-token output cap and no fallback, and logs token counts without retaining prompts. It does not execute browser actions or deduct task credits; browser actions remain disabled.
- Stripe checkout, recurring billing, invoices/refunds, admin controls, support/legal pages, monitoring/restore drills, and end-to-end customer email/provider tests remain open. See `PRODUCTION-READINESS.md` for the current gate list.


## Customer API guidance connection

The customer API now includes a text-guidance route through the existing Claude router. It uses the server-only Claude key, Haiku by default, a 4,096-token response cap, no fallback model, and no execution tools. The first release is bounded to 10 requests per UTC day across the service and 3 per account. Each request is recorded without storing the prompt; model token counts and the provider request ID are stored separately. Guidance requests do not deduct maintenance-hour trial or paid balances. The API reports `browserActions:false`; no site or account changes are made by this route.

Deployment verified 31 October 2026: all 13 account/router/customer API tests passed, live health reports `taskGuidance:true`, and one synthetic customer-route request completed with Claude Haiku. Provider login/email UAT remains separate and is deferred to Amit.


## Customer guidance deployment — 31 October 2026

The customer route was deployed to `/srv/itproguy/runtime/customer-server.mjs`; only `itproguy-api.service` was restarted. Versioned frontend assets `app-customer-ai-1283c8e.js` and `.css` are live. A scoped rollback copy is under `/srv/itproguy/backups/pre-customer-ai-20261031`. Health reports email, Google, Microsoft, and task guidance enabled; browser actions remain disabled. The synthetic API smoke test used an in-memory account and did not touch a customer account or trial balance.
