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
			/--admonition-default-icon:\s*url\('\#\{\$sass-icon\}'\);/
		);
		expect( style ).toMatch(
			/mask-image:\s*var\(--admonition-default-icon\);/
		);
		expect( style ).toMatch(
			/-webkit-mask-image:\s*var\(--admonition-default-icon\);/
		);
	} );
} );
