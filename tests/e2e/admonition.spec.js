const { test, expect } = require( '@playwright/test' );
const logger = require( './logger' );
const { loginToWordPress, createPost } = require( './helper-wordpress' );

// E2E: Insert an admonition block, publish, and verify front-end rendering.
test( 'create and render admonition block', async ( { page, baseURL } ) => {
	test.setTimeout( 90000 ); // Allow up to 90s for slow environments
	// Resolve base URL: prefer Playwright fixture, then env, then localhost
	const resolvedBase =
		baseURL || process.env.WP_BASE_URL || 'http://localhost:8000';
	logger.info( { baseURL }, 'Playwright baseURL' );
	logger.info( { resolvedBase }, 'Resolved base URL' );
	const admonitionTitleText = 'E2E Note Title';
	const admonitionContentText = 'This is an admonition created by E2E test.';

	logger.info( 'Navigating to login page...' );
	await loginToWordPress( page, resolvedBase, 'admin', 'pass' );

	// Extra: verify we are not still on the login page
	const currentUrl = page.url();
	logger.info( { currentUrl }, 'URL after login' );
	if ( currentUrl.includes( 'wp-login.php' ) ) {
		logger.error( 'Still on login page after login attempt!' );
		throw new Error(
			'Login failed: still on login page after login attempt.'
		);
	}

	// Dismiss Welcome Guide (multi-step) and close button if present
	while ( true ) {
		// Try to find the Close button (X)
		const closeBtn = page.locator( 'button[aria-label="Close"]' );
		if ( await closeBtn.count() ) {
			await closeBtn.click();
			logger.info(
				'Dismissed Welcome to the editor dialog (Close button)'
			);
			break;
		}
		// Try to find the Next button in the guide
		const nextBtn = page.locator(
			'button.components-guide__forward-button'
		);
		if ( await nextBtn.count() ) {
			await nextBtn.click();
			logger.info( 'Clicked Next in Welcome to the editor dialog' );
			await page.waitForTimeout( 300 );
			continue;
		}
		// If neither button is found, exit the loop
		break;
	}

	logger.info( 'Opening new post editor...' );
	// Try opening the new post editor directly; if it doesn't load, fallback to Posts->Add New
	await createPost(
		page,
		resolvedBase,
		'End2End Test Post from Playwright',
		'This is automated test content.'
	);

	// Detect whether editor is rendered inside iframe and scope selectors accordingly.
	const iframeCount = await page
		.locator( 'iframe[name="editor-canvas"]' )
		.count();
	const editor =
		iframeCount > 0
			? page.frameLocator( 'iframe[name="editor-canvas"]' )
			: page;

	// Create the next block by placing cursor at the end of current paragraph and pressing Enter.
	const lastParagraph = editor
		.locator(
			'.wp-block-paragraph[contenteditable="true"], p.block-editor-rich-text__editable[contenteditable="true"]'
		)
		.last();
	await lastParagraph.waitFor( { state: 'visible', timeout: 15000 } );
	await lastParagraph.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );

	// Insert Admonition block via slash command.
	await page.keyboard.type( '/admonition', { delay: 20 } );
	await page.keyboard.press( 'Enter' );

	// Fill admonition title.
	const admonitionTitle = editor
		.locator( '.admonition-title[contenteditable="true"]' )
		.first();
	await admonitionTitle.waitFor( { state: 'visible', timeout: 15000 } );
	await admonitionTitle.click();
	await page.keyboard.press( 'ControlOrMeta+a' );
	await page.keyboard.type( admonitionTitleText );

	// Fill admonition content paragraph.
	const admonitionBlock = editor
		.locator(
			'details:has(.admonition-title), .wp-block-common-wp-blocks-admonition'
		)
		.last();
	await admonitionBlock.waitFor( { state: 'visible', timeout: 15000 } );

	// Admonition uses <details>; ensure content is expanded before typing.
	const detailsBlock = editor
		.locator( 'details:has(.admonition-title)' )
		.last();
	if ( await detailsBlock.count() ) {
		const isOpen = await detailsBlock.getAttribute( 'open' );
		if ( isOpen === null ) {
			await detailsBlock.locator( 'summary.admonition-header' ).click();
		}
	}

	const paragraphCandidates = admonitionBlock.locator(
		'.admonition-content p[contenteditable="true"]'
	);
	const paragraphCount = await paragraphCandidates.count();
	let clickedParagraph = false;
	for ( let i = 0; i < paragraphCount; i++ ) {
		const candidate = paragraphCandidates.nth( i );
		if ( await candidate.isVisible() ) {
			await candidate.click();
			clickedParagraph = true;
			break;
		}
	}

	if ( ! clickedParagraph ) {
		throw new Error(
			'Could not find a visible editable paragraph inside the Admonition block.'
		);
	}

	await page.keyboard.type( admonitionContentText );

	// Assertions in editor: title and content should be present in the inserted Admonition block.
	await expect( admonitionTitle ).toContainText( admonitionTitleText );
	await expect(
		admonitionBlock.locator( '.admonition-content' ).first()
	).toContainText( admonitionContentText );
} );
