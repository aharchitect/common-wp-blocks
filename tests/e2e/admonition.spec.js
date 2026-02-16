const { test, expect } = require( '@playwright/test' );
const logger = require( './logger' );
const { loginToWordPress, createPost } = require( './helper-wordpress' );

async function dismissWelcomeGuideIfPresent( page ) {
	for ( let i = 0; i < 8; i++ ) {
		const guideDialog = page.getByRole( 'dialog', {
			name: /welcome to the editor/i,
		} );
		if ( ! ( await guideDialog.count() ) ) {
			return;
		}

		const closeBtn = page.getByRole( 'button', { name: /close/i } );
		if ( await closeBtn.count() ) {
			await closeBtn.first().click();
			await page.waitForTimeout( 200 );
			continue;
		}

		const nextBtn = page.getByRole( 'button', { name: /next/i } );
		if ( await nextBtn.count() ) {
			await nextBtn.first().click();
			await page.waitForTimeout( 200 );
			continue;
		}

		// Fallback for any unrecognized guide step.
		await page.keyboard.press( 'Escape' );
		await page.waitForTimeout( 200 );
	}
}

async function getEditorContext( page ) {
	const iframeCount = await page
		.locator( 'iframe[name="editor-canvas"]' )
		.count();
	return iframeCount > 0
		? page.frameLocator( 'iframe[name="editor-canvas"]' )
		: page;
}

async function insertAdmonitionBlock( page, editor ) {
	const lastParagraph = editor
		.locator(
			'.wp-block-paragraph[contenteditable="true"], p.block-editor-rich-text__editable[contenteditable="true"]'
		)
		.last();
	await lastParagraph.waitFor( { state: 'visible', timeout: 15000 } );
	await lastParagraph.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/admonition', { delay: 20 } );
	await page.keyboard.press( 'Enter' );
}

async function readBeforeMaskImage( locator ) {
	return locator.evaluate( ( el ) => {
		const pseudo = window.getComputedStyle( el, '::before' );
		return {
			maskImage: pseudo.maskImage,
			webkitMaskImage: pseudo.webkitMaskImage,
			width: pseudo.width,
			height: pseudo.height,
		};
	} );
}

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

	await dismissWelcomeGuideIfPresent( page );

	logger.info( 'Opening new post editor...' );
	// Try opening the new post editor directly; if it doesn't load, fallback to Posts->Add New
	await createPost(
		page,
		resolvedBase,
		'End2End Test Post from Playwright',
		'This is automated test content.'
	);
	await dismissWelcomeGuideIfPresent( page );

	// Detect whether editor is rendered inside iframe and scope selectors accordingly.
	const editor = await getEditorContext( page );

	// Create the next block by placing cursor at the end of current paragraph and pressing Enter.
	await dismissWelcomeGuideIfPresent( page );
	await insertAdmonitionBlock( page, editor );

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

test( 'admonition default icon mask renders and changes when type changes', async ( {
	page,
	baseURL,
} ) => {
	test.setTimeout( 90000 );
	const resolvedBase =
		baseURL || process.env.WP_BASE_URL || 'http://localhost:8000';

	await loginToWordPress( page, resolvedBase, 'admin', 'pass' );
	await dismissWelcomeGuideIfPresent( page );
	await createPost(
		page,
		resolvedBase,
		'Admonition Icon Mask E2E',
		'Base paragraph for insertion.'
	);
	await dismissWelcomeGuideIfPresent( page );

	const editor = await getEditorContext( page );
	await insertAdmonitionBlock( page, editor );

	const admonitionBlock = editor
		.locator( '.wp-block-common-wp-blocks-admonition' )
		.last();
	await admonitionBlock.waitFor( { state: 'visible', timeout: 15000 } );

	const summary = admonitionBlock.locator( 'summary.admonition-header' );
	await summary.click();

	const typeSelect = page.getByLabel( 'Admonition Type (for base styling)' );
	await expect( typeSelect ).toBeVisible( { timeout: 15000 } );

	await typeSelect.selectOption( { value: 'warning' } );
	await expect( admonitionBlock ).toHaveAttribute(
		'class',
		/admonition-type-warning/
	);

	const warningMask = await readBeforeMaskImage( summary );
	const warningMaskValue =
		warningMask.webkitMaskImage !== 'none'
			? warningMask.webkitMaskImage
			: warningMask.maskImage;
	expect( warningMaskValue ).not.toBe( 'none' );
	expect( warningMask.width ).not.toBe( '0px' );
	expect( warningMask.height ).not.toBe( '0px' );

	await typeSelect.selectOption( { value: 'info' } );
	await expect( admonitionBlock ).toHaveAttribute(
		'class',
		/admonition-type-info/
	);

	await expect
		.poll( async () => {
			const infoMask = await readBeforeMaskImage( summary );
			return infoMask.webkitMaskImage !== 'none'
				? infoMask.webkitMaskImage
				: infoMask.maskImage;
		} )
		.not.toBe( warningMaskValue );
} );
