const { test, expect } = require( '@playwright/test' );
const { loginToWordPress } = require( './helper-wordpress' );

// Basic smoke test: ensure WP admin is reachable and login works
test( 'admin login and dashboard loads', async ( { page, baseURL } ) => {
	const resolvedBase =
		baseURL || process.env.WP_BASE_URL || 'http://localhost:8000';
	
	await loginToWordPress( page, resolvedBase, 'admin', 'pass' );
	
	// dashboard should load
	await expect( page ).toHaveURL( /wp-admin/ );
} );
