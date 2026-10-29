# ITProGuy private Claude runtime

Selected provider: Anthropic Claude API. Haiku 5.5 is the default and cheapest current Claude 5.5 tier; there is no separate low-cost model router. Task classes use low, medium, or high effort with output caps of 4,096 / 8,192 / 16,384 tokens. Temperature, top_p and top_k are omitted as required by Haiku 5.5.

`claude-router.mjs` uses the official SDK with a 60-second timeout per attempt and two SDK retries for eligible temporary errors. It permits at most one application-level fallback to Sonnet 5.5, with the same task output cap. Fallback is allowed after retryable failures or an incomplete/invalid answer. A trusted application validator can reject an answer. This does not magically detect every incorrect answer; task-specific checks and human review remain necessary. Refusals, authentication, billing and invalid-request errors do not trigger model escalation. Usage and request IDs are returned for accounting; prompt and key contents are not logged here. A complete request may involve up to six SDK attempts, so total latency and token costs exceed one call. No Opus escalation or unlimited retry loop.

Image generation is disabled. The module has no execution or image-generation tools. Explicit image-generation intents return Axel's upload response without an API call. The system prompt reinforces the restriction. User-uploaded images can later be used for website updates, but uploads and browser execution are not implemented by this transport.

## Installed server tools

Private Node 22.23.1, npm 10.9.8, Anthropic SDK 1.3.0, Playwright 1.64.1, Chromium revision 1248, FFmpeg, dotenv and zod are installed under `/srv/itproguy/runtime`. Gemini SDK remains installed but is not selected. Scoped browser AppArmor profiles were approved and loaded; global namespace settings were not changed. Browser binaries and their parent directories are root-owned to prevent the app user replacing privileged allowlisted executables. Future browser upgrades need a corresponding reviewed exact-path policy update.

Use the scoped tools directory first in PATH and set PLAYWRIGHT_BROWSERS_PATH=/srv/itproguy/runtime/browsers. `npm run test` runs six offline routing checks; `npm run check` imports Claude and launches sandboxed Chromium without an API call. Tests run directly in one Node process because spawning the test-runner subprocess was denied on this host. The six direct tests passed as axonadmin.

Credentials belong only in `/srv/itproguy/private/claude.env` using ANTHROPIC_API_KEY. Directory mode 700, file mode 600, owned by axonadmin. Never put a real key in Git, frontend code or ordinary chat. No key has been configured. The Claude Console showed a zero balance during setup, so a funded live API test remains pending.

## Deployment boundary

The module and tests are installed privately on the German server and committed to GitHub. They expose no HTTP endpoint, execute no browser actions and are not connected to the public prototype. The Console Agents overview controls a separate Anthropic-hosted service, not global defaults for direct API calls; no duplicate managed agent was created. Customer authentication, isolated browser sessions, approved action execution, credential redaction, per-user spend limits and visible browser transport are still required before customer use. Per-request token caps are not a complete monetary billing limit.
