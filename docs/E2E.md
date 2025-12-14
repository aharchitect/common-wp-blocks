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
