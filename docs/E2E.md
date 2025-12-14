# E2E (Playwright) Instructions

This project includes a Playwright-based end-to-end test setup using Docker Compose so local development matches CI.

Requirements
- Docker and Docker Compose
- Node.js (for local runs if you run Playwright on host)

Quick local commands

1) Start DB + WordPress

```bash
make e2e-up
```

2) Install WordPress and activate the plugin

```bash
make e2e-install
```

3) Run Playwright tests

```bash
make e2e-test
```

4) Full run (up, install, test)

```bash
make e2e-run
```

5) Teardown

```bash
make e2e-down
```

How CI runs
- The GitHub Actions workflow `.github/workflows/e2e.yml` checks out the repo, installs node deps, builds the plugin, starts the Docker Compose stack, performs the WP install/activation using a transient `wordpress:cli` container (volumes-from the running wordpress container), starts the Playwright container, runs the tests, uploads logs and test-results artifacts, and tears down the stack.

Troubleshooting
- If `make e2e-install` fails with DB connection errors, ensure `make e2e-up` completed and the `db` container is healthy.
- If Playwright can't find the login form, open http://localhost:8000/wp-login.php in your browser to check whether WP is installed.

Expanding tests
- Tests live in `tests/e2e/` and use `tests/e2e/playwright.config.js`.
- Add new tests as `.spec.js` files; Playwright will pick them up automatically.

CI artifacts
- Playwright logs and `tests/e2e/test-results` are uploaded as workflow artifacts on each run (success or failure).

Making E2E Required on `main`
 - **Why:** Requiring the full E2E workflow for the protected `main` branch ensures merged code passes the integration tests while keeping PRs fast (the E2E workflow runs separately).
 - **How (GitHub UI):**
	 1. Go to the repository on GitHub → `Settings` → `Branches` → `Branch protection rules`.
	 2. Edit or add a rule for the `main` branch.
	 3. Under "Require status checks to pass before merging", enable it and select the `E2E Playwright` workflow from the list of available checks. Save the rule.
 - **How (notes):**
	 - The workflow name you should pick is `E2E Playwright` (the workflow's `name:` field).
	 - You can also enable "Require pull request reviews before merging" in the same rule to block merges until PR reviews are done.
	 - If you want occasional manual re-runs of E2E for debugging, use the Actions tab and run the `E2E Playwright` workflow via the "Run workflow" button (we added `workflow_dispatch` to support manual runs).

If you'd like, I can also create a short checklist or a GitHub Action that comments on PRs with the E2E run link or automatically re-runs the E2E workflow on demand.
