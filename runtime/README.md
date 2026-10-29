# ITProGuy private tool runtime

This prepares Gemini SDK imports and a sandboxed Chromium engine. It does not expose an HTTP endpoint, start a public agent, connect customer accounts, or call Gemini.

Install under `/srv/itproguy/runtime` as `axonadmin`, using the application-scoped Node/npm tools. Keep the Playwright browser cache at `/srv/itproguy/runtime/browsers` and npm cache at `/srv/itproguy/runtime/npm-cache`.

Use `npm ci`, then `npm run browser:install`, then `npm run check`. All commands require the scoped tools directory first in PATH and PLAYWRIGHT_BROWSERS_PATH set to the dedicated browser cache.

The optional future key file is `/srv/itproguy/private/gemini.env`, owned by axonadmin, directory mode 700 and file mode 600. Never commit a real key or put it in the frontend. No key file is created by this source package.

The browser test uses Chromium's sandbox. If operating-system libraries or namespace permissions block it, report the exact blocker. Do not disable the sandbox or alter shared OS settings as an installation shortcut.

Before customer use, implement authenticated accounts, separate browser profiles/process boundaries, approved action execution, credential redaction, session limits, audit controls, spend caps, and a visible browser transport. These packages alone do not provide the full ITProGuy service.
