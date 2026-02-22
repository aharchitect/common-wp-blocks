import fs from 'fs';
import path from 'path';

describe( 'Admonition block.json spacing support', () => {
	let blockJson;

	beforeAll( () => {
		const blockJsonPath = path.join( __dirname, '..', 'block.json' );
		blockJson = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
	} );

	it( 'enables spacing controls for margin and padding', () => {
		expect( blockJson.supports?.spacing ).toBeDefined();
		expect( blockJson.supports.spacing.margin ).toBe( true );
		expect( blockJson.supports.spacing.padding ).toBe( true );
	} );

	it( 'defines hideIcon attribute as an opt-in toggle', () => {
		expect( blockJson.attributes?.hideIcon ).toEqual( {
			type: 'boolean',
			default: false,
		} );
	} );

	it( 'keeps dimensions optional by default in the editor UI', () => {
		const defaults =
			blockJson.supports?.spacing?.__experimentalDefaultControls || {};

		expect( defaults.margin ).toBe( false );
		expect( defaults.padding ).toBe( false );
	} );

	it( 'maps spacing selectors to the admonition header element', () => {
		const marginSelector = blockJson.selectors?.spacing?.margin || '';
		const paddingSelector = blockJson.selectors?.spacing?.padding || '';

		expect( marginSelector ).toContain(
			'[data-is-collapsible="true"] summary.admonition-header'
		);
		expect( marginSelector ).toContain(
			'[data-is-collapsible="false"] .admonition-header'
		);
		expect( paddingSelector ).toContain(
			'[data-is-collapsible="true"] summary.admonition-header'
		);
		expect( paddingSelector ).toContain(
			'[data-is-collapsible="false"] .admonition-header'
		);
	} );
} );
