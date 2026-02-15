const { defineConfig } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: './',
	timeout: 120_000,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	expect: {
		timeout: 5000,
	},
	use: {
		headless: true,
		baseURL:
			process.env.WP_BASE_URL ||
			( process.env.CI ? 'http://wordpress' : 'http://localhost:8000' ),
	},
} );
