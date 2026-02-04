const { defineConfig } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: './',
	timeout: 120_000,
	expect: {
		timeout: 5000,
	},
	use: {
		headless: true,
		baseURL: process.env.WP_BASE_URL || 'http://localhost:8000/',
	},
} );
