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
			customBorderColor: '',
			customBorderWidth: 5,
			customBorderRadius: 0,
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

	it( 'should apply custom border CSS variables when custom border styling is enabled', () => {
		mockAttributes.enableCustomBorder = true;
		mockAttributes.customBorderColor = '#123456';
		mockAttributes.customBorderWidth = 8;
		mockAttributes.customBorderRadius = 6;

		const { container } = render(
			<Edit
				attributes={ mockAttributes }
				setAttributes={ mockSetAttributes }
			/>
		);

		const blockWrapper = container.querySelector( '.admonition-type-note' );
		const style = blockWrapper?.getAttribute( 'style' ) || '';
		expect( style ).toContain( '--admonition-accent-left-color: #123456' );
		expect( style ).toContain( '--admonition-accent-left-width: 8px' );
		expect( style ).toContain( '--admonition-corner-radius: 6px' );
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
