import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import save from '../save';

// --- MOCKING WORDPRESS AND CHILD COMPONENTS ---

// Mock useBlockProps.save to return a simple identifiable object
jest.mock( '@wordpress/block-editor', () => ( {
	// useBlockProps.save is a function that returns props
	useBlockProps: {
		save: jest.fn( ( props ) => ( {
			...props,
			'data-block-id': 'mocked-save-id',
		} ) ),
	},
	// Mock InnerBlocks and RichText just to satisfy imports
	InnerBlocks: { Content: () => <div data-testid="inner-blocks-content" /> },
	RichText: ( { value } ) => (
		<span data-testid="rich-text-save">{ value }</span>
	),
} ) );

// Mock AdmonitionStructure to return a simple identifiable component
jest.mock( '../AdmonitionStructure', () => ( {
	__esModule: true,
	default: jest.fn(
		( { title, iconAttribute, isCollapsible, isOpen, titleTagName } ) => (
			<div
				data-testid="admonition-structure-save"
				data-title={ title }
				data-icon-attrs={ JSON.stringify( iconAttribute ) }
				data-is-collapsible={ isCollapsible ? 'true' : 'false' }
				data-is-open={ isOpen ? 'true' : 'false' }
				data-tag={ titleTagName }
			>
				{ /* InnerBlocks content goes here, but we can assume AdmonitionStructure handles it */ }
				<div data-testid="inner-blocks-placeholder"></div>
			</div>
		)
	),
} ) );

describe( 'Save', () => {
	let defaultAttributes;

	beforeEach( () => {
		defaultAttributes = {
			type: 'note',
			title: 'Note Title',
			customIconData: '',
			isCollapsible: false,
			isInitiallyExpanded: true,
			enableCustomBorder: false,
			customBlockBgColor: '',
			customHeaderBgColor: '',
			customHeaderTextColor: '',
			customBorderBox: { width: '1px' },
			customBorderColor: '',
			customBorderWidth: 5,
			customBorderRadius: 0,
			customBorderRadiusValues: {},
		};
	} );

	// --- TEST 1: Default (non-collapsible, no custom icon) ---
	it( 'should correctly render default markup with default-icon flag and basic type class', () => {
		const { container } = render(
			save( { attributes: defaultAttributes } )
		);

		// 1. Check outer blockProps attributes
		const wrapperDiv = container.firstChild;
		expect( wrapperDiv ).toHaveClass( `admonition-type-note` );
		// Check the computed style property directly to ensure it is not set (empty string)
		// Note: For custom CSS variables, the computed style might be an empty string or undefined if not set.
		expect(
			wrapperDiv.style.getPropertyValue( '--admonition-icon-mask' )
		).toBe( '' );

		expect( wrapperDiv ).toHaveAttribute( 'data-is-collapsible', 'false' );

		// 2. Check AdmonitionStructure props
		const structure = screen.getByTestId( 'admonition-structure-save' );
		expect( structure ).toHaveAttribute( 'data-title', 'Note Title' );
		expect( structure ).toHaveAttribute( 'data-tag', 'span' );
		expect( structure ).toHaveAttribute( 'data-is-open', 'false' );

		// 3. Check default iconAttribute logic
		const iconAttrs = JSON.parse(
			structure.getAttribute( 'data-icon-attrs' )
		);
		expect( iconAttrs ).toEqual( {
			'data-has-default-icon': 'true',
		} );
	} );

	// --- TEST 2: Custom Icon Data Logic ---
	it( 'should generate inline CSS variable and custom-icon flag when customIconData is present', () => {
		const customUrl = 'data:image/svg+xml;utf8,...';
		defaultAttributes.customIconData = customUrl;

		const { container } = render(
			save( { attributes: defaultAttributes } )
		);

		// 1. Check outer blockProps attributes (Inline Style)
		const wrapperDiv = container.firstChild;
		expect( wrapperDiv ).toHaveStyle(
			`--admonition-icon-mask: url('${ customUrl }')`
		);

		// 2. Check iconAttribute flag
		const structure = screen.getByTestId( 'admonition-structure-save' );
		const iconAttrs = JSON.parse(
			structure.getAttribute( 'data-icon-attrs' )
		);
		expect( iconAttrs ).toEqual( {
			'data-has-custom-icon': 'true',
		} );
	} );

	it( 'should generate split border CSS variables from customBorderBox', () => {
		defaultAttributes.customBorderBox = {
			top: { width: '0px' },
			right: { width: '0px' },
			bottom: { width: '0px' },
			left: { width: '9px', color: '#123456' },
		};
		defaultAttributes.customBorderRadius = 7;

		const { container } = render(
			save( { attributes: defaultAttributes } )
		);

		const wrapperDiv = container.firstChild;
		expect( wrapperDiv ).toHaveStyle(
			`--admonition-edge-left-color: #123456`
		);
		expect( wrapperDiv ).toHaveStyle( `--admonition-edge-left-width: 9px` );
		expect( wrapperDiv ).toHaveStyle( `--admonition-edge-top-width: 0px` );
		expect( wrapperDiv ).toHaveStyle( `--admonition-corner-radius: 7px` );
	} );

	it( 'should normalize a uniform split border to linked left-only vars in save output', () => {
		defaultAttributes.customBorderBox = {
			top: { width: '4px', color: '#ababab', style: 'solid' },
			right: { width: '4px', color: '#ababab', style: 'solid' },
			bottom: { width: '4px', color: '#ababab', style: 'solid' },
			left: { width: '4px', color: '#ababab', style: 'solid' },
		};

		const { container } = render(
			save( { attributes: defaultAttributes } )
		);

		const wrapperDiv = container.firstChild;
		const style = wrapperDiv?.getAttribute( 'style' ) || '';

		expect( style ).toContain( '--admonition-edge-left-width: 4px' );
		expect( style ).toContain( '--admonition-edge-left-color: #ababab' );
		expect( style ).toContain( '--admonition-edge-left-style: solid' );
		expect( style ).toContain( '--admonition-edge-top-width: 0px' );
		expect( style ).toContain( '--admonition-edge-right-width: 0px' );
		expect( style ).toContain( '--admonition-edge-bottom-width: 0px' );
		expect( style ).not.toContain( '--admonition-edge-top-color' );
	} );

	it( 'should preserve true split border values in save output', () => {
		defaultAttributes.customBorderBox = {
			top: { width: '1px', color: '#111111', style: 'solid' },
			right: { width: '2px', color: '#222222', style: 'solid' },
			bottom: { width: '3px', color: '#333333', style: 'solid' },
			left: { width: '4px', color: '#444444', style: 'solid' },
		};

		const { container } = render(
			save( { attributes: defaultAttributes } )
		);

		const wrapperDiv = container.firstChild;
		const style = wrapperDiv?.getAttribute( 'style' ) || '';

		expect( style ).toContain( '--admonition-edge-top-width: 1px' );
		expect( style ).toContain( '--admonition-edge-right-width: 2px' );
		expect( style ).toContain( '--admonition-edge-bottom-width: 3px' );
		expect( style ).toContain( '--admonition-edge-left-width: 4px' );
		expect( style ).toContain( '--admonition-edge-top-color: #111111' );
		expect( style ).toContain( '--admonition-edge-right-color: #222222' );
		expect( style ).toContain( '--admonition-edge-bottom-color: #333333' );
		expect( style ).toContain( '--admonition-edge-left-color: #444444' );
	} );

	it( 'should serialize linked border object to left-only vars in save output', () => {
		defaultAttributes.customBorderBox = {
			width: '6px',
			color: '#101010',
			style: 'solid',
		};

		const { container } = render(
			save( { attributes: defaultAttributes } )
		);

		const wrapperDiv = container.firstChild;
		const style = wrapperDiv?.getAttribute( 'style' ) || '';

		expect( style ).toContain( '--admonition-edge-left-width: 6px' );
		expect( style ).toContain( '--admonition-edge-left-color: #101010' );
		expect( style ).toContain( '--admonition-edge-left-style: solid' );
		expect( style ).toContain( '--admonition-edge-top-width: 0px' );
		expect( style ).toContain( '--admonition-edge-right-width: 0px' );
		expect( style ).toContain( '--admonition-edge-bottom-width: 0px' );
	} );

	it( 'should serialize corner radius from customBorderRadiusValues in save output', () => {
		defaultAttributes.customBorderRadiusValues = {
			topLeft: '2px',
			topRight: '4px',
			bottomRight: '6px',
			bottomLeft: '8px',
		};
		defaultAttributes.customBorderRadius = 33;

		const { container } = render(
			save( { attributes: defaultAttributes } )
		);

		const wrapperDiv = container.firstChild;
		expect( wrapperDiv ).toHaveStyle(
			`--admonition-corner-radius: 2px 4px 6px 8px`
		);
	} );

	it( 'should use legacy numeric radius fallback when customBorderRadiusValues are empty in save output', () => {
		defaultAttributes.customBorderRadiusValues = {};
		defaultAttributes.customBorderRadius = 14;

		const { container } = render(
			save( { attributes: defaultAttributes } )
		);

		const wrapperDiv = container.firstChild;
		expect( wrapperDiv ).toHaveStyle( `--admonition-corner-radius: 14px` );
	} );

	it( 'should use fallback border width when customBorderBox is empty in save output', () => {
		defaultAttributes.customBorderBox = {};
		defaultAttributes.customBorderWidth = 12;

		const { container } = render(
			save( { attributes: defaultAttributes } )
		);

		const wrapperDiv = container.firstChild;
		const style = wrapperDiv?.getAttribute( 'style' ) || '';

		expect( style ).toContain( '--admonition-edge-left-width: 12px' );
		expect( style ).toContain( '--admonition-edge-top-width: 0px' );
		expect( style ).toContain( '--admonition-edge-right-width: 0px' );
		expect( style ).toContain( '--admonition-edge-bottom-width: 0px' );
	} );

	// --- TEST 3: Collapsible State Logic ---
	it( 'should correctly set blockProps collapsible attribute and AdmonitionStructure isOpen state', () => {
		// Scenario 1: Collapsible, Initially Expanded (Open)
		defaultAttributes.isCollapsible = true;
		defaultAttributes.isInitiallyExpanded = true;
		const { container, rerender } = render(
			save( { attributes: defaultAttributes } )
		);
		let wrapperDiv = container.firstChild;
		let structure = screen.getByTestId( 'admonition-structure-save' );

		expect( wrapperDiv ).toHaveAttribute( 'data-is-collapsible', 'true' );
		expect( structure ).toHaveAttribute( 'data-is-open', 'true' ); // Collapsible AND Expanded = true

		// Scenario 2: Collapsible, NOT Initially Expanded (Closed)
		defaultAttributes.isInitiallyExpanded = false;
		rerender( save( { attributes: defaultAttributes } ) );
		wrapperDiv = container.firstChild;
		structure = screen.getByTestId( 'admonition-structure-save' );

		expect( wrapperDiv ).toHaveAttribute( 'data-is-collapsible', 'true' );
		expect( structure ).toHaveAttribute( 'data-is-open', 'false' ); // Collapsible, but NOT Expanded = false
	} );
} );
