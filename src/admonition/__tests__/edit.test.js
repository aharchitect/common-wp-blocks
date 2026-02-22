import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // for assertions like toHaveClass

import Edit from '../edit';
import { ADMONITION_TYPES } from '../constants';

// --- MOCKING WORDPRESS AND CHILD COMPONENTS ---
// AdmonitionStructure is the component that uses RichText and InnerBlocks.
// We will mock it to simplify testing the Edit function itself.
jest.mock( '../AdmonitionStructure', () => ( {
	// Mock AdmonitionStructure to return a simple identifiable component
	// It receives props like title, isOpen, iconElement, etc.
	__esModule: true,
	default: jest.fn( ( { title, isOpen, iconElement, iconAttribute } ) => (
		<div data-testid="admonition-structure" data-is-open={ isOpen }>
			<summary data-testid="mock-summary" { ...iconAttribute }>
				<span data-testid="admonition-title">{ title }</span>
			</summary>
			<div data-testid="icon-wrapper">{ iconElement }</div>
		</div>
	) ),
} ) );

// Mock required WordPress components/hooks
jest.mock( '@wordpress/block-editor', () => ( {
	// Mock useBlockProps to return simple props
	useBlockProps: jest.fn( ( props ) => ( {
		className: props.className,
		style: props.style,
		'data-block-id': 'mocked-id',
	} ) ),
	RichText: ( { value } ) => (
		<input data-testid="rich-text" value={ value } readOnly />
	),
	InnerBlocks: {
		Content: () => <div data-testid="inner-blocks-content" />,
		// Render a simple div for InnerBlocks in the editor
		default: () => <div data-testid="inner-blocks" />,
	},
	InspectorControls: ( { children } ) => (
		<div data-testid="inspector-controls">{ children }</div>
	),
	__experimentalPanelColorGradientSettings: ( { children } ) => (
		<div data-testid="panel-color-gradient-settings">{ children }</div>
	),
	__experimentalBorderRadiusControl: ( { values, onChange } ) => (
		<div
			data-testid="border-radius-control"
			data-values={ JSON.stringify( values ) }
		>
			<button
				data-testid="radius-set-string"
				onClick={ () => onChange( '12px' ) }
			>
				Set Radius String
			</button>
			<button
				data-testid="radius-set-object"
				onClick={ () =>
					onChange( {
						topLeft: '2px',
						topRight: '4px',
						bottomRight: '6px',
						bottomLeft: '8px',
					} )
				}
			>
				Set Radius Object
			</button>
		</div>
	),
} ) );

jest.mock( '@wordpress/components', () => ( {
	// Mock the SelectControl to expose its onChange prop for testing
	SelectControl: ( { onChange, value, options } ) => (
		<select
			data-testid="select-type"
			value={ value }
			onChange={ ( e ) => onChange( e.target.value ) }
		>
			{ options.map( ( opt ) => (
				<option key={ opt.value } value={ opt.value }>
					{ opt.label }
				</option>
			) ) }
		</select>
	),
	// Mock ToggleControl
	ToggleControl: ( { label, checked, onChange } ) => (
		<button
			data-testid={ `toggle-${ label }` }
			onClick={ () => onChange( ! checked ) }
		>
			{ label }: { checked ? 'On' : 'Off' }
		</button>
	),
	// Mock PanelBody
	PanelBody: ( { children } ) => (
		<div data-testid="panel-body">{ children }</div>
	),
	BorderBoxControl: ( { onChange } ) => (
		<div data-testid="border-box-control">
			<button
				data-testid="border-box-apply-linked"
				onClick={ () =>
					onChange( {
						width: '3px',
						color: '#334455',
						style: 'solid',
					} )
				}
			>
				Apply Linked Border
			</button>
			<button
				data-testid="border-box-apply-uniform-split"
				onClick={ () =>
					onChange( {
						top: {
							width: '4px',
							color: '#123123',
							style: 'solid',
						},
						right: {
							width: '4px',
							color: '#123123',
							style: 'solid',
						},
						bottom: {
							width: '4px',
							color: '#123123',
							style: 'solid',
						},
						left: {
							width: '4px',
							color: '#123123',
							style: 'solid',
						},
					} )
				}
			>
				Apply Uniform Split Border
			</button>
			<button
				data-testid="border-box-apply-split"
				onClick={ () =>
					onChange( {
						top: { width: '0px', color: '#111111', style: 'solid' },
						right: {
							width: '0px',
							color: '#222222',
							style: 'solid',
						},
						bottom: {
							width: '0px',
							color: '#333333',
							style: 'solid',
						},
						left: {
							width: '9px',
							color: '#444444',
							style: 'solid',
						},
					} )
				}
			>
				Apply Split Border
			</button>
		</div>
	),
	Tooltip: ( { children } ) => <div data-testid="tooltip">{ children }</div>,
	Icon: () => <span data-testid="mock-icon-component" />,
	BaseControl: ( { children, label } ) => (
		<div data-testid={ `base-control-${ label }` }>{ children }</div>
	),
	ColorPalette: ( { value, onChange } ) => (
		<input
			data-testid="border-color-input"
			value={ value || '' }
			onChange={ ( e ) => onChange( e.target.value ) }
		/>
	),
	RangeControl: ( { label, value, onChange } ) => (
		<input
			data-testid={ `range-${ label }` }
			type="number"
			value={ value }
			onChange={ ( e ) => onChange( Number( e.target.value ) ) }
		/>
	),
	TextareaControl: ( { value, onChange } ) => (
		<textarea
			data-testid="custom-icon-input"
			value={ value }
			onChange={ ( e ) => onChange( e.target.value ) }
		/>
	),
} ) );

// Mock i18n
jest.mock( '@wordpress/i18n', () => ( {
	__: ( string ) => string,
} ) );

describe( 'Edit', () => {
	let mockAttributes;
	let mockSetAttributes;

	beforeEach( () => {
		// Reset mock attributes to the default 'note' state for each test
		mockAttributes = {
			type: 'note',
			title: 'Note',
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
		mockSetAttributes = jest.fn();
	} );

	// --- TEST 1: Rendering the default structure ---
	it( 'should render AdmonitionStructure with correct default attributes and classes', () => {
		// Find the block's main wrapper DIV element using the custom data attribute
		const { container } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		// Find the main wrapper div using its class name or data attribute (container will find the blockProps output)
		const blockWrapper = container.querySelector( '.admonition-type-note' ); // Find by class is reliable here

		// Fallback to finding the div rendered by useBlockProps. In this case,
		// using querySelector with the class name is the most accurate way based on your render output.
		expect( blockWrapper ).toHaveClass(
			`admonition-type-${ mockAttributes.type }`
		);

		// Check the AdmonitionStructure component received the title
		expect( screen.getByTestId( 'admonition-title' ) ).toHaveTextContent(
			mockAttributes.title
		);

		// Check icon path wiring for default icons (CSS ::before in editor/frontend)
		expect( screen.getByTestId( 'mock-summary' ) ).toHaveAttribute(
			'data-has-default-icon',
			'true'
		);
		expect( screen.getByTestId( 'icon-wrapper' ) ).toBeEmptyDOMElement();
	} );

	// --- TEST 2: Custom Icon Logic ---
	it( 'should wire custom icon mask data when customIconData is set', () => {
		const customIcon = 'data:image/svg+xml;...';
		mockAttributes.customIconData = customIcon;

		const { container } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		// Editor should use the same summary flag path as frontend.
		expect( screen.getByTestId( 'mock-summary' ) ).toHaveAttribute(
			'data-has-custom-icon',
			'true'
		);
		expect( screen.getByTestId( 'icon-wrapper' ) ).toBeEmptyDOMElement();

		const blockWrapper = container.querySelector( '.admonition-type-note' );
		expect( blockWrapper?.getAttribute( 'style' ) || '' ).toContain(
			'--admonition-icon-mask'
		);
	} );

	it( 'should apply split border CSS variables from customBorderBox', () => {
		mockAttributes.customBorderBox = {
			top: { width: '0px' },
			right: { width: '0px' },
			bottom: { width: '0px' },
			left: { width: '8px', color: '#123456' },
		};
		mockAttributes.customBorderRadius = 10;

		const { container } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		const blockWrapper = container.querySelector( '.admonition-type-note' );
		const style = blockWrapper?.getAttribute( 'style' ) || '';
		expect( style ).toContain( '--admonition-edge-left-color: #123456' );
		expect( style ).toContain( '--admonition-edge-left-width: 8px' );
		expect( style ).toContain( '--admonition-edge-top-width: 0px' );
		expect( style ).toContain( '--admonition-corner-radius: 10px' );
	} );

	it( 'should normalize a uniform split border to the linked left-only output in style vars', () => {
		mockAttributes.customBorderBox = {
			top: { width: '4px', color: '#aaaaaa', style: 'solid' },
			right: { width: '4px', color: '#aaaaaa', style: 'solid' },
			bottom: { width: '4px', color: '#aaaaaa', style: 'solid' },
			left: { width: '4px', color: '#aaaaaa', style: 'solid' },
		};

		const { container } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		const blockWrapper = container.querySelector( '.admonition-type-note' );
		const style = blockWrapper?.getAttribute( 'style' ) || '';

		expect( style ).toContain( '--admonition-edge-left-width: 4px' );
		expect( style ).toContain( '--admonition-edge-left-color: #aaaaaa' );
		expect( style ).toContain( '--admonition-edge-left-style: solid' );
		expect( style ).toContain( '--admonition-edge-top-width: 0px' );
		expect( style ).toContain( '--admonition-edge-right-width: 0px' );
		expect( style ).toContain( '--admonition-edge-bottom-width: 0px' );
		expect( style ).not.toContain( '--admonition-edge-top-color' );
	} );

	it( 'should keep split border vars for truly split values', () => {
		mockAttributes.customBorderBox = {
			top: { width: '1px', color: '#111111', style: 'solid' },
			right: { width: '2px', color: '#222222', style: 'solid' },
			bottom: { width: '3px', color: '#333333', style: 'solid' },
			left: { width: '4px', color: '#444444', style: 'solid' },
		};

		const { container } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		const blockWrapper = container.querySelector( '.admonition-type-note' );
		const style = blockWrapper?.getAttribute( 'style' ) || '';

		expect( style ).toContain( '--admonition-edge-top-width: 1px' );
		expect( style ).toContain( '--admonition-edge-right-width: 2px' );
		expect( style ).toContain( '--admonition-edge-bottom-width: 3px' );
		expect( style ).toContain( '--admonition-edge-left-width: 4px' );
		expect( style ).toContain( '--admonition-edge-top-color: #111111' );
		expect( style ).toContain( '--admonition-edge-right-color: #222222' );
		expect( style ).toContain( '--admonition-edge-bottom-color: #333333' );
		expect( style ).toContain( '--admonition-edge-left-color: #444444' );
	} );

	it( 'should serialize linked border object values to left-only vars', () => {
		mockAttributes.customBorderBox = {
			width: '6px',
			color: '#0f0f0f',
			style: 'solid',
		};

		const { container } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		const blockWrapper = container.querySelector( '.admonition-type-note' );
		const style = blockWrapper?.getAttribute( 'style' ) || '';

		expect( style ).toContain( '--admonition-edge-left-width: 6px' );
		expect( style ).toContain( '--admonition-edge-left-color: #0f0f0f' );
		expect( style ).toContain( '--admonition-edge-left-style: solid' );
		expect( style ).toContain( '--admonition-edge-top-width: 0px' );
		expect( style ).toContain( '--admonition-edge-right-width: 0px' );
		expect( style ).toContain( '--admonition-edge-bottom-width: 0px' );
	} );

	it( 'should serialize corner radius from customBorderRadiusValues object', () => {
		mockAttributes.customBorderRadiusValues = {
			topLeft: '2px',
			topRight: '4px',
			bottomRight: '6px',
			bottomLeft: '8px',
		};
		mockAttributes.customBorderRadius = 99;

		const { container } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		const blockWrapper = container.querySelector( '.admonition-type-note' );
		const style = blockWrapper?.getAttribute( 'style' ) || '';

		expect( style ).toContain(
			'--admonition-corner-radius: 2px 4px 6px 8px'
		);
		expect( style ).not.toContain( '--admonition-corner-radius: 99px' );
	} );

	it( 'should fall back to legacy numeric customBorderRadius when object values are empty', () => {
		mockAttributes.customBorderRadiusValues = {};
		mockAttributes.customBorderRadius = 13;

		const { container } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		const blockWrapper = container.querySelector( '.admonition-type-note' );
		const style = blockWrapper?.getAttribute( 'style' ) || '';

		expect( style ).toContain( '--admonition-corner-radius: 13px' );
	} );

	it( 'should sync header background to border color when confirm is accepted', () => {
		const confirmSpy = jest
			.spyOn( window, 'confirm' )
			.mockReturnValue( true );

		render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		fireEvent.click( screen.getByTestId( 'border-box-apply-linked' ) );

		expect( mockSetAttributes ).toHaveBeenCalledWith( {
			customBorderBox: {
				width: '3px',
				color: '#334455',
				style: 'solid',
			},
			enableCustomBorder: true,
			customBorderColor: '#334455',
			customHeaderBgColor: '#334455',
		} );
		expect( confirmSpy ).toHaveBeenCalledWith(
			'Apply the same color to the header background?'
		);

		confirmSpy.mockRestore();
	} );

	it( 'should not sync header background to border color when confirm is declined', () => {
		const confirmSpy = jest
			.spyOn( window, 'confirm' )
			.mockReturnValue( false );

		render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		fireEvent.click( screen.getByTestId( 'border-box-apply-linked' ) );

		expect( mockSetAttributes ).toHaveBeenCalledWith( {
			customBorderBox: {
				width: '3px',
				color: '#334455',
				style: 'solid',
			},
			enableCustomBorder: true,
			customBorderColor: '#334455',
		} );

		confirmSpy.mockRestore();
	} );

	it( 'should use fallback border width when customBorderBox is empty', () => {
		mockAttributes.customBorderBox = {};
		mockAttributes.customBorderWidth = 11;

		const { container } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		const blockWrapper = container.querySelector( '.admonition-type-note' );
		const style = blockWrapper?.getAttribute( 'style' ) || '';

		expect( style ).toContain( '--admonition-edge-left-width: 11px' );
		expect( style ).toContain( '--admonition-edge-top-width: 0px' );
		expect( style ).toContain( '--admonition-edge-right-width: 0px' );
		expect( style ).toContain( '--admonition-edge-bottom-width: 0px' );
	} );

	// --- TEST 3: SelectControl Attribute Change and Reset Logic ---
	it( 'should update type, reset customIconData, and set defaultTitle when type changes', () => {
		const { getByTestId } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		// Find the SelectControl (mocked as a select element)
		const selectType = getByTestId( 'select-type' );

		// Simulate changing the type from 'note' to 'warning'
		fireEvent.change( selectType, { target: { value: 'warning' } } );

		// Verify setAttributes was called with the correct reset values
		expect( mockSetAttributes ).toHaveBeenCalledWith( {
			type: 'warning',
			customIconData: '',
			title: ADMONITION_TYPES.warning.defaultTitle, // Should be 'Warning'
		} );
	} );

	// --- TEST 4 - 7: Collapsible State Logic ---
	it( 'should calculate editorOpenState correctly based on isCollapsible=false, isInitiallyExpanded=true -> Should be OPEN', () => {
		render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		expect( screen.getByTestId( 'admonition-structure' ) ).toHaveAttribute(
			'data-is-open',
			'true'
		);
	} );

	it( 'should calculate editorOpenState correctly based on isCollapsible=true, isInitiallyExpanded=true -> Should be OPEN', () => {
		const { rerender } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		mockAttributes.isCollapsible = true;
		mockAttributes.isInitiallyExpanded = true;
		rerender(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);
		expect( screen.getByTestId( 'admonition-structure' ) ).toHaveAttribute(
			'data-is-open',
			'true'
		);
	} );

	it( 'should calculate editorOpenState correctly based on isCollapsible=false and isInitiallyExpanded=false -> Should be OPEN (overrides expansion state)', () => {
		const { rerender } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		mockAttributes.isCollapsible = false;
		mockAttributes.isInitiallyExpanded = false;
		rerender(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);
		expect( screen.getByTestId( 'admonition-structure' ) ).toHaveAttribute(
			'data-is-open',
			'true'
		);
	} );

	it( 'should calculate editorOpenState correctly based on isCollapsible=true and isInitiallyExpanded=false -> Should be CLOSED', () => {
		const { rerender } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		mockAttributes.isCollapsible = true;
		mockAttributes.isInitiallyExpanded = false;
		rerender(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);
		expect( screen.getByTestId( 'admonition-structure' ) ).toHaveAttribute(
			'data-is-open',
			'false'
		);
	} );
} );
