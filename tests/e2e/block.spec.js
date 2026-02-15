const { test, expect } = require( '@playwright/test' );

// Basic smoke test: ensure WP admin is reachable and login works
test( 'admin login and dashboard loads', async ( { page, baseURL } ) => {
	const resolvedBase =
		baseURL || process.env.WP_BASE_URL || 'http://localhost:8000';
	const loginUrl = `${ String( resolvedBase ).replace(
		/\/+$/,
		''
	) }/wp-login.php`;
	await page.goto( loginUrl );

	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'pass' );
	await page.click( '#wp-submit' );

	// dashboard should load
	await page.waitForSelector( '#wpadminbar' );
	await expect( page ).toHaveURL( /wp-admin/ );
} );
