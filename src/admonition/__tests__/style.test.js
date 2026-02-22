import fs from 'fs';
import path from 'path';

describe( 'Admonition style icon mask wiring', () => {
	it( 'uses the type icon map to define and consume the default icon mask variable', () => {
		const stylePath = path.join( __dirname, '..', 'style.scss' );
		const style = fs.readFileSync( stylePath, 'utf8' );

		expect( style ).toMatch(
			/\$sass-icon:\s*map\.get\(\$config,\s*icon\);/
		);
		expect( style ).toMatch(
			/--admonition-default-icon:\s*url\('#\{\$sass-icon\}'\);/
		);
		expect( style ).toMatch(
			/mask-image:\s*var\(--admonition-default-icon\);/
		);
		expect( style ).toMatch(
			/-webkit-mask-image:\s*var\(--admonition-default-icon\);/
		);
	} );

	it( 'uses per-edge border CSS variables and padding-box clipping for both structures', () => {
		const stylePath = path.join( __dirname, '..', 'style.scss' );
		const style = fs.readFileSync( stylePath, 'utf8' );

		expect( style ).toContain(
			'border-top-width: var(--admonition-edge-top-width, 0px);'
		);
		expect( style ).toContain(
			'border-right-width: var(--admonition-edge-right-width, 0px);'
		);
		expect( style ).toContain(
			'border-bottom-width: var(--admonition-edge-bottom-width, 0px);'
		);
		expect( style ).toContain( 'border-left-width: var(' );
		expect( style ).toContain(
			'border-top-color: var(--admonition-edge-top-color, transparent);'
		);
		expect( style ).toContain(
			'border-right-color: var(--admonition-edge-right-color, transparent);'
		);
		expect( style ).toContain(
			'border-bottom-color: var(--admonition-edge-bottom-color, transparent);'
		);
		expect( style ).toContain( 'border-left-color: var(' );

		const backgroundClipMatches =
			style.match( /background-clip:\s*padding-box;/g ) || [];
		expect( backgroundClipMatches.length ).toBeGreaterThanOrEqual( 2 );
	} );
} );
