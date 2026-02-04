const { test, expect } = require( '@playwright/test' );

// E2E: Insert an admonition block, publish, and verify front-end rendering.
test( 'create and render admonition block', async ( { page, baseURL } ) => {
	test.setTimeout( 45000 ); // Allow up to 45s for slow environments
	// Resolve base URL: prefer Playwright fixture, then env, then localhost
	const resolvedBase =
		baseURL || process.env.WP_BASE_URL || 'http://localhost:8000';
	// ...existing code...

	// Login
	// ...existing code...
	await page.goto( `${ resolvedBase }/wp-login.php` );
	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'pass' );
	await page.click( '#wp-submit' );

	// Wait until admin bar is visible so we know login completed
	await page.waitForSelector( '#wpadminbar', { timeout: 20000 } );
	// ...existing code...

	// Try opening the new post editor directly; if it doesn't load, fallback to Posts->Add New
	await page.goto( `${ resolvedBase }/wp-admin/post-new.php` );
	// ...existing code...

	try {
		await page.waitForSelector(
			'.editor-post-title__input, textarea.editor-post-title__input, .edit-post-visual-editor__block-list, .block-editor-writing-flow',
			{ timeout: 45000 }
		);
		// ...existing code...
	} catch ( e ) {
		// Print debug info before failing or retrying
		// Removed unused variables url and content
		// ...existing code...
		throw new Error(
			'Editor did not load in time. See above for page content.'
		);
	}

	// Ensure the writing flow area or title is focused so keypresses go to editor
	const writingFlow = page
		.locator(
			'.block-editor-writing-flow, .edit-post-visual-editor__block-list'
		)
		.first();
	if ( await writingFlow.count() ) {
		await writingFlow.click();
	} else {
		// Fallback: click the title input then press ArrowDown to reach the block area
		const titleInput = page
			.locator(
				'.editor-post-title__input, textarea.editor-post-title__input'
			)
			.first();
		if ( await titleInput.count() ) {
			await titleInput.click();
			await page.keyboard.press( 'ArrowDown' );
		}
	}

	// Try slash inserter first, then fallback to block inserter + search
	let inserted = false;
	try {
		await page.keyboard.type( '/admonition' );
		await page.keyboard.press( 'Enter' );
		await page.waitForSelector( '.admonition-title', { timeout: 10000 } );
		inserted = true;
	} catch ( e ) {
		// ignore and try block inserter
	}

	if ( ! inserted ) {
		// Open block inserter
		const inserterToggle = page
			.locator(
				'button[aria-label="Add block"], button.editor-inserter__toggle'
			)
			.first();
		if ( await inserterToggle.count() ) {
			await inserterToggle.click();
			// search input may have placeholder 'Search for a block' or similar
			const searchInput = page
				.locator(
					'input[placeholder*="Search"], input[placeholder*="search"]'
				)
				.first();
			if ( await searchInput.count() ) {
				await searchInput.fill( 'admonition' );
				// Wait and click the block in the inserter results
				const admonionButton = page
					.locator(
						'button:has-text("Admonition"), div[role="button"]:has-text("Admonition")'
					)
					.first();
				await admonionButton.waitFor( { timeout: 10000 } );
				await admonionButton.click();
				await page.waitForSelector( '.admonition-title', {
					timeout: 10000,
				} );
				inserted = true;
			}
		}
	}

	// Wait for admonition title editable to appear in editor
	if ( ! inserted ) {
		throw new Error( 'Failed to insert admonition block' );
	}

	// Set the admonition title
	const titleLocator = page.locator( '.admonition-title' ).first();
	await titleLocator.click();
	await titleLocator.fill( 'E2E Note Title' );

	// Focus the content area and type paragraph content
	const contentArea = page
		.locator( '.admonition-content p, .admonition-content' )
		.first();
	// If there's an inner paragraph, click it; otherwise click the content container and type
	if ( await contentArea.count() ) {
		await contentArea.click();
		await page.keyboard.type(
			'This is an admonition created by E2E test.'
		);
	} else {
		await page.locator( '.admonition-content' ).click();
		await page.keyboard.type(
			'This is an admonition created by E2E test.'
		);
	}

	// Publish the post - handle both single- and two-step publish flows
	try {
		await page.click(
			'button.editor-post-publish-button__button, button[aria-label="Publish"]',
			{ timeout: 5000 }
		);
	} catch ( e ) {
		// Try alternative selector
		await page.click(
			'button.editor-post-publish-panel__toggle, .editor-post-publish-button',
			{ timeout: 5000 }
		);
	}

	// Confirm publish if confirmation shown
	try {
		await page.waitForSelector(
			'button.editor-post-publish-panel__header-publish-button, button.editor-post-publish-button__button',
			{ timeout: 3000 }
		);
		await page.click(
			'button.editor-post-publish-panel__header-publish-button, button.editor-post-publish-button__button'
		);
	} catch ( e ) {
		// Likely single click publish completed
	}

	// Wait for post published notice and click View Post
	await page.waitForSelector(
		'a.editor-post-publish-panel__postpublish-buttons__view-link, a.post-publish-panel__postpublish-buttons a',
		{ timeout: 10000 }
	);
	const viewLink = page
		.locator(
			'a.editor-post-publish-panel__postpublish-buttons__view-link, a.post-publish-panel__postpublish-buttons a'
		)
		.first();
	const href = await viewLink.getAttribute( 'href' );
	if ( href ) {
		// If href is relative, make absolute
		const target = href.startsWith( 'http' )
			? href
			: `${ resolvedBase }${ href }`;
		await page.goto( target );
	} else {
		await viewLink.click();
	}

	// Front-end assertions: admonition title and content should be present
	await page.waitForSelector( '.admonition-title, .admonition-content', {
		timeout: 10000,
	} );
	await expect( page.locator( '.admonition-title' ) ).toContainText(
		'E2E Note Title'
	);
	await expect( page.locator( '.admonition-content' ) ).toContainText(
		'This is an admonition created by E2E test.'
	);
	// Check base class for default type
	await expect(
		page.locator( 'details.admonition-type-note, .admonition-type-note' )
	).toHaveCount( 1 );
} );
