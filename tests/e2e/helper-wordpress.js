function normalizeBaseUrl( baseUrl ) {
	return String( baseUrl ).replace( /\/+$/, '' );
}

async function loginToWordPress( page, resolvedBase, username, password ) {
	const baseUrl = normalizeBaseUrl( resolvedBase );
	await page.goto( `${ baseUrl }/wp-login.php` );
	const userLogin = page.locator( '#user_login' );
	const userPass = page.locator( '#user_pass' );

	// CI can occasionally end up with wrong field contents due page timing/overlays.
	// Ensure both credentials are actually in the right inputs before submit.
	let credentialsApplied = false;
	for ( let i = 0; i < 2; i++ ) {
		await userLogin.fill( '' );
		await userPass.fill( '' );
		await userLogin.fill( username );
		await userPass.fill( password );

		const currentUser = await userLogin.inputValue();
		const currentPass = await userPass.inputValue();
		if ( currentUser === username && currentPass === password ) {
			credentialsApplied = true;
			break;
		}
	}

	if ( ! credentialsApplied ) {
		throw new Error(
			'Could not reliably populate WordPress login credentials before submit.'
		);
	}

	await page.click( '#wp-submit' );
	await page.waitForURL( /\/wp-admin(\/|$)/, { timeout: 60000 } );

	// Different admin screens can render different chrome timing in CI.
	await page.waitForSelector( '#wpadminbar, body.wp-admin, #adminmenuwrap', {
		timeout: 60000,
	} );
}

async function createPost( page, resolvedBase, titleText, contentText ) {
	const baseUrl = normalizeBaseUrl( resolvedBase );
	await page.goto( `${ baseUrl }/wp-admin/post-new.php` );

	const loginForm = page.locator( '#loginform' );
	if ( await loginForm.count() ) {
		throw new Error(
			'Unexpected redirect to wp-login.php while opening post editor. Authentication session is missing or expired.'
		);
	}

	// Wait for one of the editor roots used across Gutenberg versions.
	await page.waitForSelector(
		[
			'.edit-post-layout',
			'.editor-post-title__input',
			'.block-editor-writing-flow',
			'iframe[name="editor-canvas"]',
		].join( ', ' ),
		{ timeout: 45000 }
	);

	const iframeCount = await page
		.locator( 'iframe[name="editor-canvas"]' )
		.count();

	const context =
		iframeCount > 0
			? page.frameLocator( 'iframe[name="editor-canvas"]' )
			: page;

	const titleByClass = context.locator(
		'textarea.editor-post-title__input, h1.editor-post-title__input'
	);

	if ( await titleByClass.count() ) {
		await titleByClass
			.first()
			.waitFor( { state: 'visible', timeout: 30000 } );
		await titleByClass.first().fill( titleText );
		await titleByClass.first().press( 'Enter' );
	} else {
		const titleByRole = context.getByRole( 'textbox', {
			name: /add title/i,
		} );
		await titleByRole
			.first()
			.waitFor( { state: 'visible', timeout: 30000 } );
		await titleByRole.first().fill( titleText );
		await titleByRole.first().press( 'Enter' );
	}

	// Type paragraph content after title.
	if ( contentText ) {
		await page.keyboard.type( contentText );
	}
}

module.exports = { loginToWordPress, createPost };
