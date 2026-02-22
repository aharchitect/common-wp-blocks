const { test, expect } = require( '@playwright/test' );
const logger = require( './logger' );
const { loginToWordPress, createPost } = require( './helper-wordpress' );

const CUSTOM_ICON_DATA =
	'data:image/png;base64,' +
	'iVBORw0KGgoAAAANSUhEUgAAADMAAAAzCAYAAAA6oTAqAAAACXBIWXMAAAsTAAALEwEAmpwYAAAD5ElEQVR4nNWZW4hOURTHfy4zlMuTSwi5DQ/iwYMiGeVBzYOEBw/epPFgJHdKxAOayHXI3YO7aIwhBrmMh6FExjX3uwwjlMuYo13rq91u73O++eY7+zvzr9V3zt7rnL3+31lr77XXhuZhNfANqAI60oIxFwg0mUkLxQSgwSCj2mzoDBQA7UkgOgFvDCK7LXp9gXKN9F/gKNCbBGG9QeQKkG/o9ATeGXopeQp0JwHoDPzUDPshX8DEPgeRlGwmAZhhGLXCofctgkwdCcB2w6heFp38CCIpaUuOcUYz5kuI3vMIIs9IAI5oBjUC3Rx6yyLILCGBC+VhoLXD1c46iFQCeSQAXWUG0407B/S36LYBZgHV4lbXgeIkxIqOYsu/3SAuOBEY0QQpENI5xXKJmSAL8lMW3vmO2dELJgEvskQoJb+ALeLO3tEOmA08zjKpl8BQcoR5QEWGhn8G/ljaHwEdfBMZI/GzJUMyG4GdwAbgq9G3wDeZGzJwpmS2yq+aBIZI3ATamuQN47SB9xgZdboz2V7tfizwSbtXBL2hXBv4HnC5iWSUfq1cN4qr6f07fBHpIbvHQDOmrIlkyrT1Sl2/NvpH+yKzKMT/mxovajN3y+ir8EWkFfDQYtx2S6HDJQ2iryaO25bpur8vMqMcBlZbDHOJ0psmSaje/lsmAm9Y5zBQTau70iSj6gDHLM+Xyn7IGx6EGLktTTKrpPSUuq8H1sgW45EvIoNCDFTlpVNpklF6K4GTsjiWioul+gf7ysNcBp4HnqRJ5onov7XETSDjxI4LIQaqRe5fmmT+ib6rvzJuIvkRKYsrXi5mEF8/LJVSL1NylHFTMpwsxsRJZmnIwI2WImEgQT3KyIZ1MmHb78VxknGVjwIp/FVa2u8Ca4E7jrgIKxiejDOFqQsZ+DTwytJ+UGoFhxzb44qIqT4W9EsjXmwuUxYSHy7XDDTpEweZyRkG/7Y0+10yNQ4yq3NEpjTuEwBbOm9bANWatF+u91tKu4E8F7ZtuBQHmfchAz50LIw3gRq5rpF7U6dKEkvXuz9km0ivCFc4Dny0tOtfQ32lAw5jT0S8v0s2yUxoZrykpCwJmcCcDMlMB4qA8fI7PUMyxdkkkyo8fBffV7WuhWKg2quXOIwwz/x7O/RK5D1F8t69Ms536d+UTTIj5SzFdkqGw33qJWswUW/RVc/b0Fo2aWp8b7hmMVCdlNlQbdG9SoJQZzFQpSk22NajsJNrr+jpiAN1bmPDbIe+ek/OMdBhXKFDv9Ch763oFwYVpPcNw16FHI/nWWrKtSGTC74xQNIZtZtUAT4sQn+46Cl9lc5k5av8B2fjt7+BNdM5AAAAAElFTkSuQmCC';

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
			content: pseudo.content,
		};
	} );
}

async function readAdmonitionTypeClass( summaryLocator ) {
	return summaryLocator.evaluate( ( el ) => {
		const block = el.closest( '.wp-block-common-wp-blocks-admonition' );
		return block?.className || '';
	} );
}

async function savePost( page ) {
	const saveButtons = page.getByRole( 'button', {
		name: /^(Update|Save|Save draft)$/i,
	} );
	if ( await saveButtons.count() ) {
		await saveButtons.first().click();
		await page.waitForTimeout( 500 );
		return;
	}

	const publishButtons = page.getByRole( 'button', { name: /^Publish$/i } );
	if ( await publishButtons.count() ) {
		await publishButtons.first().click();
		const confirmPublish = page.getByRole( 'button', {
			name: /^Publish$/i,
		} );
		if ( await confirmPublish.count() ) {
			await confirmPublish.last().click();
		}
		await page.waitForTimeout( 500 );
	}
}

function normalizeBaseUrl( baseUrl ) {
	return String( baseUrl ).replace( /\/+$/, '' );
}

function getPostIdFromEditorUrl( currentUrl ) {
	const parsed = new URL( currentUrl );
	return parsed.searchParams.get( 'post' );
}

async function getCurrentPostId( page ) {
	return page.evaluate( () => {
		const wpGlobal = window.wp;
		const id = wpGlobal?.data
			?.select( 'core/editor' )
			?.getCurrentPostId?.();
		return id ? String( id ) : null;
	} );
}

async function goToFrontendPost( page, resolvedBase, postId ) {
	const baseUrl = normalizeBaseUrl( resolvedBase );
	await page.goto( `${ baseUrl }/?p=${ postId }` );
	await page.waitForLoadState( 'domcontentloaded' );
}

async function ensureBlockInspectorVisible( page ) {
	const settingsButton = page.getByRole( 'button', { name: /^Settings$/i } );
	if ( await settingsButton.count() ) {
		const expanded = await settingsButton
			.first()
			.getAttribute( 'aria-expanded' );
		if ( expanded !== 'true' ) {
			await settingsButton.first().click();
		}
	}

	const blockTab = page.getByRole( 'tab', { name: /^Block$/i } );
	if ( await blockTab.count() ) {
		await blockTab.first().click();
	}
}

async function ensureStylesInspectorVisible( page ) {
	await ensureBlockInspectorVisible( page );
	const stylesTab = page.getByRole( 'tab', { name: /^Styles$/i } );
	if ( await stylesTab.count() ) {
		await stylesTab.first().click();
		return;
	}

	const stylesButton = page.getByRole( 'button', { name: /^Styles$/i } );
	if ( await stylesButton.count() ) {
		await stylesButton.first().click();
	}
}

async function setEnableCollapsing( page, enabled ) {
	await ensureBlockInspectorVisible( page );
	const toggle = page
		.getByRole( 'checkbox', { name: /Enable Collapsing/i } )
		.first();
	await expect( toggle ).toBeVisible( { timeout: 15000 } );
	const current = await toggle.isChecked();
	if ( current !== enabled ) {
		await toggle.click();
	}
	if ( enabled ) {
		await expect( toggle ).toBeChecked();
	} else {
		await expect( toggle ).not.toBeChecked();
	}
}

async function setStartExpanded( page, enabled ) {
	await ensureBlockInspectorVisible( page );
	const toggle = page
		.getByRole( 'checkbox', { name: /Start Expanded/i } )
		.first();
	await expect( toggle ).toBeVisible( { timeout: 15000 } );
	const current = await toggle.isChecked();
	if ( current !== enabled ) {
		await toggle.click();
	}
	if ( enabled ) {
		await expect( toggle ).toBeChecked();
	} else {
		await expect( toggle ).not.toBeChecked();
	}
}

function resolveBaseUrl( baseURL ) {
	return baseURL || process.env.WP_BASE_URL || 'http://localhost:8000';
}

async function prepareAdmonitionEditor( page, baseURL, postTitle, postBody ) {
	const resolvedBase = resolveBaseUrl( baseURL );
	await loginToWordPress( page, resolvedBase, 'admin', 'pass' );
	await dismissWelcomeGuideIfPresent( page );
	await createPost(
		page,
		resolvedBase,
		postTitle,
		postBody || 'Base paragraph for insertion.'
	);
	await dismissWelcomeGuideIfPresent( page );

	const editor = await getEditorContext( page );
	await insertAdmonitionBlock( page, editor );

	const admonitionBlock = editor
		.locator( '.wp-block-common-wp-blocks-admonition' )
		.last();
	await admonitionBlock.waitFor( { state: 'visible', timeout: 15000 } );

	return { resolvedBase, editor, admonitionBlock };
}

// E2E: Insert an admonition block, publish, and verify front-end rendering.
test( 'create and render admonition block', async ( { page, baseURL } ) => {
	test.setTimeout( 90000 ); // Allow up to 90s for slow environments
	const resolvedBase = resolveBaseUrl( baseURL );
	logger.info( { baseURL }, 'Playwright baseURL' );
	logger.info( { resolvedBase }, 'Resolved base URL' );
	const admonitionTitleText = 'E2E Note Title';
	const admonitionContentText = 'This is an admonition created by E2E test.';
	const { editor, admonitionBlock } = await prepareAdmonitionEditor(
		page,
		baseURL,
		'End2End Test Post from Playwright',
		'This is automated test content.'
	);

	// Fill admonition title.
	const admonitionTitle = editor
		.locator( '.admonition-title[contenteditable="true"]' )
		.first();
	await admonitionTitle.waitFor( { state: 'visible', timeout: 15000 } );
	await admonitionTitle.click();
	await page.keyboard.press( 'ControlOrMeta+a' );
	await page.keyboard.type( admonitionTitleText );

	// Fill admonition content paragraph.
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
	const { resolvedBase, admonitionBlock } = await prepareAdmonitionEditor(
		page,
		baseURL,
		'Admonition Icon Mask E2E',
		'Base paragraph for insertion.'
	);

	const summary = admonitionBlock.locator( 'summary.admonition-header' );
	await summary.click();
	await ensureBlockInspectorVisible( page );

	const typeSelect = page.getByLabel( 'Admonition Type (for base styling)' );
	if ( ! ( await typeSelect.count() ) ) {
		const blockToolbarButton = page.getByRole( 'button', {
			name: /Admonition \(Note, Tip, Warning\)/i,
		} );
		if ( await blockToolbarButton.count() ) {
			await blockToolbarButton.first().click();
		}
		await ensureBlockInspectorVisible( page );
	}
	await expect( typeSelect ).toBeVisible( { timeout: 15000 } );

	await typeSelect.selectOption( { value: 'warning' } );
	await expect( admonitionBlock ).toHaveAttribute(
		'class',
		/admonition-type-warning/
	);

	await savePost( page );
	const postId =
		( await getCurrentPostId( page ) ) ||
		getPostIdFromEditorUrl( page.url() );
	if ( ! postId ) {
		throw new Error( 'Could not determine post ID from editor URL.' );
	}

	const warningFrontendPage = await page.context().newPage();
	await goToFrontendPost( warningFrontendPage, resolvedBase, postId );
	const frontendWarningSummary = warningFrontendPage
		.locator(
			'.wp-block-common-wp-blocks-admonition summary.admonition-header'
		)
		.first();
	await expect( frontendWarningSummary ).toBeVisible( { timeout: 15000 } );
	const warningHasDefaultFlag =
		( await frontendWarningSummary.getAttribute(
			'data-has-default-icon'
		) ) === 'true' ||
		( await frontendWarningSummary.getAttribute( 'data-default-icon' ) ) !==
			null;
	expect( warningHasDefaultFlag ).toBe( true );

	const warningTypeClass = await readAdmonitionTypeClass(
		frontendWarningSummary
	);
	const frontendWarningMask = await readBeforeMaskImage(
		frontendWarningSummary
	);
	const frontendWarningMaskValue =
		frontendWarningMask.webkitMaskImage !== 'none'
			? frontendWarningMask.webkitMaskImage
			: frontendWarningMask.maskImage;
	const warningHasRenderedIcon =
		frontendWarningMaskValue !== 'none' ||
		( frontendWarningMask.content !== 'none' &&
			frontendWarningMask.content !== 'normal' &&
			frontendWarningMask.content !== '""' );
	expect( warningHasRenderedIcon ).toBe( true );
	expect( frontendWarningMask.width ).not.toBe( '0px' );
	expect( frontendWarningMask.height ).not.toBe( '0px' );
	await warningFrontendPage.close();

	await typeSelect.selectOption( { value: 'info' } );
	await expect( admonitionBlock ).toHaveAttribute(
		'class',
		/admonition-type-info/
	);

	await savePost( page );
	const infoFrontendPage = await page.context().newPage();
	await goToFrontendPost( infoFrontendPage, resolvedBase, postId );
	const frontendInfoSummary = infoFrontendPage
		.locator(
			'.wp-block-common-wp-blocks-admonition summary.admonition-header'
		)
		.first();
	await expect( frontendInfoSummary ).toBeVisible( { timeout: 15000 } );
	const infoHasDefaultFlag =
		( await frontendInfoSummary.getAttribute(
			'data-has-default-icon'
		) ) === 'true' ||
		( await frontendInfoSummary.getAttribute( 'data-default-icon' ) ) !==
			null;
	expect( infoHasDefaultFlag ).toBe( true );

	const infoTypeClass = await readAdmonitionTypeClass( frontendInfoSummary );
	const frontendInfoMask = await readBeforeMaskImage( frontendInfoSummary );
	const frontendInfoMaskValue =
		frontendInfoMask.webkitMaskImage !== 'none'
			? frontendInfoMask.webkitMaskImage
			: frontendInfoMask.maskImage;
	const infoHasRenderedIcon =
		frontendInfoMaskValue !== 'none' ||
		( frontendInfoMask.content !== 'none' &&
			frontendInfoMask.content !== 'normal' &&
			frontendInfoMask.content !== '""' );
	expect( infoHasRenderedIcon ).toBe( true );
	expect( frontendInfoMask.width ).not.toBe( '0px' );
	expect( frontendInfoMask.height ).not.toBe( '0px' );
	expect( infoTypeClass ).toMatch( /admonition-type-info/ );
	expect( warningTypeClass ).toMatch( /admonition-type-warning/ );
	if (
		frontendWarningMaskValue !== 'none' &&
		frontendInfoMaskValue !== 'none'
	) {
		expect( frontendInfoMaskValue ).not.toBe( frontendWarningMaskValue );
	}
	await infoFrontendPage.close();
} );

test( 'admonition custom base64 icon is persisted and rendered via mask', async ( {
	page,
	baseURL,
} ) => {
	test.setTimeout( 90000 );
	const { resolvedBase, admonitionBlock } = await prepareAdmonitionEditor(
		page,
		baseURL,
		'Admonition Custom Icon E2E',
		'Base paragraph for insertion.'
	);

	const summary = admonitionBlock.locator( 'summary.admonition-header' );
	await summary.click();
	await ensureBlockInspectorVisible( page );

	const customIconField = page.getByLabel(
		/Custom Icon \(Paste SVG or Base64 URL\)/i
	);
	await expect( customIconField ).toBeVisible( { timeout: 15000 } );
	await customIconField.fill( CUSTOM_ICON_DATA );
	await customIconField.press( 'Tab' );

	await savePost( page );
	const postId =
		( await getCurrentPostId( page ) ) ||
		getPostIdFromEditorUrl( page.url() );
	if ( ! postId ) {
		throw new Error( 'Could not determine post ID from editor URL.' );
	}

	const frontendPage = await page.context().newPage();
	await goToFrontendPost( frontendPage, resolvedBase, postId );

	const frontendBlock = frontendPage
		.locator( '.wp-block-common-wp-blocks-admonition' )
		.first();
	const frontendSummary = frontendBlock.locator(
		'summary.admonition-header'
	);
	await expect( frontendSummary ).toBeVisible( { timeout: 15000 } );

	expect( await frontendSummary.getAttribute( 'data-has-custom-icon' ) ).toBe(
		'true'
	);
	expect(
		await frontendSummary.getAttribute( 'data-has-default-icon' )
	).toBeNull();
	expect(
		await frontendSummary.getAttribute( 'data-default-icon' )
	).toBeNull();

	const blockStyle = ( await frontendBlock.getAttribute( 'style' ) ) || '';
	expect( blockStyle ).toMatch( /--admonition-icon-mask:\s*url\(/ );
	expect( blockStyle ).toContain(
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAAAz'
	);

	const frontendMask = await readBeforeMaskImage( frontendSummary );
	const frontendMaskValue =
		frontendMask.webkitMaskImage !== 'none'
			? frontendMask.webkitMaskImage
			: frontendMask.maskImage;
	expect( frontendMaskValue ).not.toBe( 'none' );
	expect( frontendMask.width ).not.toBe( '0px' );
	expect( frontendMask.height ).not.toBe( '0px' );

	await frontendPage.close();
} );

test( 'admonition collapsing modes work in editor and frontend', async ( {
	page,
	baseURL,
} ) => {
	test.setTimeout( 90000 );
	const { resolvedBase, admonitionBlock } = await prepareAdmonitionEditor(
		page,
		baseURL,
		'Admonition Collapsing Modes E2E',
		'Base paragraph for insertion.'
	);

	const admonitionTitle = admonitionBlock
		.locator( '.admonition-title[contenteditable="true"]' )
		.first();
	await expect( admonitionTitle ).toBeVisible( { timeout: 15000 } );
	await admonitionTitle.click();
	await page.keyboard.press( 'ControlOrMeta+a' );
	await page.keyboard.type( 'E2E Collapse Modes Title' );

	const bodyParagraph = admonitionBlock
		.locator( '.admonition-content p[contenteditable="true"]' )
		.first();
	await expect( bodyParagraph ).toBeVisible( { timeout: 15000 } );
	await bodyParagraph.click();
	await page.keyboard.press( 'ControlOrMeta+a' );
	await page.keyboard.type(
		'Collapsible mode and static mode should differ.'
	);

	await admonitionBlock.locator( '.admonition-header' ).first().click();

	// 1) Editor collapsible mode: <details>/<summary> must exist and toggle.
	await setEnableCollapsing( page, true );
	await setStartExpanded( page, true );

	const editorDetails = admonitionBlock.locator( 'details' ).first();
	const editorSummary = admonitionBlock
		.locator( 'summary.admonition-header' )
		.first();
	await expect( editorDetails ).toHaveCount( 1 );
	await expect( editorSummary ).toBeVisible( { timeout: 15000 } );
	const editorInitialOpen = await editorDetails.getAttribute( 'open' );

	await editorSummary.click();
	await expect
		.poll( () => editorDetails.getAttribute( 'open' ) )
		.not.toBe( editorInitialOpen );
	await editorSummary.click();
	await expect
		.poll( () => editorDetails.getAttribute( 'open' ) )
		.toBe( editorInitialOpen );

	await savePost( page );
	const postId =
		( await getCurrentPostId( page ) ) ||
		getPostIdFromEditorUrl( page.url() );
	if ( ! postId ) {
		throw new Error( 'Could not determine post ID from editor URL.' );
	}

	// 2) Frontend collapsible mode: summary click toggles visibility.
	const frontendCollapsiblePage = await page.context().newPage();
	await goToFrontendPost( frontendCollapsiblePage, resolvedBase, postId );
	const frontendCollapsibleBlock = frontendCollapsiblePage
		.locator( '.wp-block-common-wp-blocks-admonition' )
		.first();
	const frontendCollapsibleDetails = frontendCollapsibleBlock
		.locator( 'details' )
		.first();
	const frontendCollapsibleSummary = frontendCollapsibleBlock
		.locator( 'summary.admonition-header' )
		.first();
	const frontendCollapsibleContent = frontendCollapsibleBlock
		.locator( '.admonition-content' )
		.first();

	await expect( frontendCollapsibleDetails ).toHaveCount( 1 );
	await expect( frontendCollapsibleSummary ).toBeVisible( {
		timeout: 15000,
	} );
	const frontendInitialOpen =
		await frontendCollapsibleDetails.getAttribute( 'open' );

	await frontendCollapsibleSummary.click();
	await expect
		.poll( () => frontendCollapsibleDetails.getAttribute( 'open' ) )
		.not.toBe( frontendInitialOpen );

	await frontendCollapsibleSummary.click();
	await expect
		.poll( () => frontendCollapsibleDetails.getAttribute( 'open' ) )
		.toBe( frontendInitialOpen );
	await expect( frontendCollapsibleContent ).toBeVisible();
	await frontendCollapsiblePage.close();

	// 3) Editor non-collapsible mode: no <details>/<summary>, content always visible.
	await admonitionBlock.locator( '.admonition-header' ).first().click();
	await setEnableCollapsing( page, false );

	await expect( admonitionBlock.locator( 'details' ) ).toHaveCount( 0 );
	await expect( admonitionBlock.locator( 'summary' ) ).toHaveCount( 0 );
	const staticEditorHeader = admonitionBlock
		.locator( '.admonition-header' )
		.first();
	const staticEditorContent = admonitionBlock
		.locator( '.admonition-content' )
		.first();
	await expect( staticEditorHeader ).toBeVisible();
	await expect( staticEditorContent ).toBeVisible();

	await savePost( page );

	// 4) Frontend non-collapsible mode: static markup, always visible.
	const frontendStaticPage = await page.context().newPage();
	await goToFrontendPost( frontendStaticPage, resolvedBase, postId );
	const frontendStaticBlock = frontendStaticPage
		.locator( '.wp-block-common-wp-blocks-admonition' )
		.first();
	const staticFrontendHeader = frontendStaticBlock
		.locator( '.admonition-header' )
		.first();
	const staticFrontendContent = frontendStaticBlock
		.locator( '.admonition-content' )
		.first();

	await expect( frontendStaticBlock.locator( 'details' ) ).toHaveCount( 0 );
	await expect( frontendStaticBlock.locator( 'summary' ) ).toHaveCount( 0 );
	await expect( staticFrontendHeader ).toBeVisible( { timeout: 15000 } );
	await expect( staticFrontendContent ).toBeVisible();
	await frontendStaticPage.close();
} );

test( 'admonition starts collapsed when Start Expanded is off and reveals content on title click', async ( {
	page,
	baseURL,
} ) => {
	test.setTimeout( 90000 );
	const { resolvedBase, admonitionBlock } = await prepareAdmonitionEditor(
		page,
		baseURL,
		'Admonition Start Collapsed E2E',
		'Base paragraph for insertion.'
	);

	const bodyParagraph = admonitionBlock
		.locator( '.admonition-content p[contenteditable="true"]' )
		.first();
	await expect( bodyParagraph ).toBeVisible( { timeout: 15000 } );
	await bodyParagraph.click();
	await page.keyboard.press( 'ControlOrMeta+a' );
	await page.keyboard.type(
		'This paragraph should exist in DOM but start hidden when collapsed.'
	);

	await admonitionBlock.locator( '.admonition-header' ).first().click();
	await setEnableCollapsing( page, true );
	await setStartExpanded( page, false );

	const editorDetails = admonitionBlock.locator( 'details' ).first();
	const editorSummary = admonitionBlock
		.locator( 'summary.admonition-header' )
		.first();
	const editorParagraph = admonitionBlock
		.locator( '.admonition-content p' )
		.first();

	await expect( editorDetails ).toHaveCount( 1 );
	await expect.poll( () => editorDetails.getAttribute( 'open' ) ).toBeNull();
	await expect( editorParagraph ).toHaveCount( 1 );
	await expect( editorParagraph ).not.toBeVisible();

	await editorSummary.click();
	await expect
		.poll( () => editorDetails.getAttribute( 'open' ) )
		.not.toBeNull();
	await expect( editorParagraph ).toBeVisible();

	await savePost( page );
	const postId =
		( await getCurrentPostId( page ) ) ||
		getPostIdFromEditorUrl( page.url() );
	if ( ! postId ) {
		throw new Error( 'Could not determine post ID from editor URL.' );
	}

	const frontendPage = await page.context().newPage();
	await goToFrontendPost( frontendPage, resolvedBase, postId );

	const frontendBlock = frontendPage
		.locator( '.wp-block-common-wp-blocks-admonition' )
		.first();
	const frontendDetails = frontendBlock.locator( 'details' ).first();
	const frontendSummary = frontendBlock
		.locator( 'summary.admonition-header' )
		.first();
	const frontendParagraph = frontendBlock
		.locator( '.admonition-content p' )
		.first();

	await expect( frontendDetails ).toHaveCount( 1 );
	await expect
		.poll( () => frontendDetails.getAttribute( 'open' ) )
		.toBeNull();
	await expect( frontendParagraph ).toHaveCount( 1 );
	await expect( frontendParagraph ).not.toBeVisible();

	await frontendSummary.click();
	await expect
		.poll( () => frontendDetails.getAttribute( 'open' ) )
		.not.toBeNull();
	await expect( frontendParagraph ).toBeVisible();

	await frontendPage.close();
} );

test( 'admonition border controls are visible and border/radius render in editor and frontend', async ( {
	page,
	baseURL,
} ) => {
	test.setTimeout( 90000 );
	const { resolvedBase, admonitionBlock } = await prepareAdmonitionEditor(
		page,
		baseURL,
		'Admonition Border Controls E2E',
		'Base paragraph for insertion.'
	);

	await admonitionBlock.locator( '.admonition-header' ).first().click();
	await ensureStylesInspectorVisible( page );

	// Objective 1: editor controls are visible and usable.
	const borderPanelTitle = page.getByText( /^Border$/i ).first();
	await expect( borderPanelTitle ).toBeVisible( { timeout: 15000 } );
	await expect(
		page.getByText( /How linked borders work/i ).first()
	).toBeVisible();
	await expect(
		page.locator( '.components-border-box-control' ).first()
	).toBeVisible();
	await expect( page.getByText( /^Radius$/i ).first() ).toBeVisible();

	const borderWidthInput = page.getByLabel( /Border width/i ).first();
	await expect( borderWidthInput ).toBeVisible();
	await borderWidthInput.fill( '9' );
	await borderWidthInput.press( 'Tab' );

	const radiusInput = page.getByLabel( /Border radius/i ).first();
	await expect( radiusInput ).toBeVisible();
	await radiusInput.fill( '12' );
	await radiusInput.press( 'Tab' );

	// Objective 2: rendering in editor canvas reflects control values.
	const editorStyles = await admonitionBlock.evaluate( ( el ) => {
		const target = el.querySelector( 'details' ) || el;
		const styles = window.getComputedStyle( target );
		return {
			left: styles.borderLeftWidth,
			top: styles.borderTopWidth,
			right: styles.borderRightWidth,
			bottom: styles.borderBottomWidth,
			radius: styles.borderTopLeftRadius,
		};
	} );

	expect( editorStyles.left ).toBe( '9px' );
	expect( editorStyles.top ).toBe( '0px' );
	expect( editorStyles.right ).toBe( '0px' );
	expect( editorStyles.bottom ).toBe( '0px' );
	expect( editorStyles.radius ).toBe( '12px' );

	await savePost( page );
	const postId =
		( await getCurrentPostId( page ) ) ||
		getPostIdFromEditorUrl( page.url() );
	if ( ! postId ) {
		throw new Error( 'Could not determine post ID from editor URL.' );
	}

	// Objective 3: rendering in page view matches configured border/radius.
	const frontendPage = await page.context().newPage();
	await goToFrontendPost( frontendPage, resolvedBase, postId );
	const frontendBlock = frontendPage
		.locator( '.wp-block-common-wp-blocks-admonition' )
		.first();
	await expect( frontendBlock ).toBeVisible( { timeout: 15000 } );

	const frontendStyles = await frontendBlock.evaluate( ( el ) => {
		const target = el.querySelector( 'details' ) || el;
		const styles = window.getComputedStyle( target );
		return {
			left: styles.borderLeftWidth,
			top: styles.borderTopWidth,
			right: styles.borderRightWidth,
			bottom: styles.borderBottomWidth,
			radius: styles.borderTopLeftRadius,
		};
	} );

	expect( frontendStyles.left ).toBe( '9px' );
	expect( frontendStyles.top ).toBe( '0px' );
	expect( frontendStyles.right ).toBe( '0px' );
	expect( frontendStyles.bottom ).toBe( '0px' );
	expect( frontendStyles.radius ).toBe( '12px' );

	await frontendPage.close();
} );
