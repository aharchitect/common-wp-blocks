import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // for assertions like toHaveClass

import Edit from '../edit';
import { ADMONITION_TYPES, TYPE_OPTIONS } from '../constants';

// --- MOCKING WORDPRESS AND CHILD COMPONENTS ---
// AdmonitionStructure is the component that uses RichText and InnerBlocks.
// We will mock it to simplify testing the Edit function itself.
jest.mock('../AdmonitionStructure', () => ({
    // Mock AdmonitionStructure to return a simple identifiable component
    // It receives props like title, isOpen, iconElement, etc.
    __esModule: true,
    default: jest.fn(({ title, isOpen, iconElement }) => (
        <div data-testid="admonition-structure" data-is-open={isOpen}>
            <span data-testid="admonition-title">{title}</span>
            <div data-testid="icon-wrapper">{iconElement}</div>
        </div>
    )),
}));

// Mock required WordPress components/hooks
jest.mock('@wordpress/block-editor', () => ({
    // Mock useBlockProps to return simple props
    useBlockProps: jest.fn((props) => ({ className: props.className, 'data-block-id': 'mocked-id' })),
    RichText: ({ value }) => <input data-testid="rich-text" value={value} readOnly />,
    InnerBlocks: {
        Content: () => <div data-testid="inner-blocks-content" />,
        // Render a simple div for InnerBlocks in the editor
        default: () => <div data-testid="inner-blocks" />,
    },
    InspectorControls: ({ children }) => <div data-testid="inspector-controls">{children}</div>,
}));

jest.mock('@wordpress/components', () => ({
    // Mock the SelectControl to expose its onChange prop for testing
    SelectControl: ({ onChange, value, options }) => (
        <select data-testid="select-type" value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    ),
    // Mock ToggleControl
    ToggleControl: ({ label, checked, onChange }) => (
        <button data-testid={`toggle-${label}`} onClick={() => onChange(!checked)}>{label}: {checked ? 'On' : 'Off'}</button>
    ),
    // Mock PanelBody and Icon to simple wrappers
    PanelBody: ({ children }) => <div data-testid="panel-body">{children}</div>,
    Icon: ({ icon, className }) => <span data-testid="dashicon" className={className}>{icon}</span>,
    TextareaControl: ({ value, onChange }) => <textarea data-testid="custom-icon-input" value={value} onChange={(e) => onChange(e.target.value)} />,
}));

// Mock i18n
jest.mock('@wordpress/i18n', () => ({
    __: (string) => string,
}));


describe('Edit', () => {
    let mockAttributes;
    let mockSetAttributes;

    beforeEach(() => {
        // Reset mock attributes to the default 'note' state for each test
        mockAttributes = {
            type: 'note',
            title: 'Note',
            customIconData: '',
            isCollapsible: false,
            isInitiallyExpanded: true,
        };
        mockSetAttributes = jest.fn();
    });

    // --- TEST 1: Rendering the default structure ---
    it('should render AdmonitionStructure with correct default attributes and classes', () => {
        // Find the block's main wrapper DIV element using the custom data attribute
        const { container } = render(<Edit attributes={mockAttributes} setAttributes={mockSetAttributes} />);

        // Find the main wrapper div using its class name or data attribute (container will find the blockProps output)
        const blockWrapper = container.querySelector('.admonition-type-note'); // Find by class is reliable here

        // Fallback to finding the div rendered by useBlockProps. In this case,
        // using querySelector with the class name is the most accurate way based on your render output.
        expect(blockWrapper).toHaveClass(`admonition-type-${mockAttributes.type}`);

        // Check the AdmonitionStructure component received the title
        expect(screen.getByTestId('admonition-title')).toHaveTextContent(mockAttributes.title);

        // Check icon rendering (should be a Dashicon)
        expect(screen.getByTestId('icon-wrapper')).toContainElement(screen.getByTestId('dashicon'));
        expect(screen.getByTestId('dashicon')).toHaveTextContent(ADMONITION_TYPES.note.dashicon);
    });

    // --- TEST 2: Custom Icon Logic ---
    it('should render a custom mask icon when customIconData is set', () => {
        const customIcon = 'data:image/svg+xml;...';
        mockAttributes.customIconData = customIcon;

        render(<Edit attributes={mockAttributes} setAttributes={mockSetAttributes} />);

        // Check that the Dashicon is NOT rendered
        expect(screen.queryByTestId('dashicon')).toBeNull();

        // Check that the custom mask icon div is rendered
        // We will find the icon wrapper and then query for the specific class.
        const iconWrapper = screen.getByTestId('icon-wrapper');
        const customIconDiv = iconWrapper.querySelector('.custom-mask-icon');

        expect(customIconDiv).toBeInTheDocument();
        expect(customIconDiv).toHaveStyle(`mask-image: url("${customIcon}")`);
    });

    // --- TEST 3: SelectControl Attribute Change and Reset Logic ---
    it('should update type, reset customIconData, and set defaultTitle when type changes', () => {
        const { getByTestId } = render(<Edit attributes={mockAttributes} setAttributes={mockSetAttributes} />);

        // Find the SelectControl (mocked as a select element)
        const selectType = getByTestId('select-type');

        // Simulate changing the type from 'note' to 'warning'
        fireEvent.change(selectType, { target: { value: 'warning' } });

        // Verify setAttributes was called with the correct reset values
        expect(mockSetAttributes).toHaveBeenCalledWith({
            type: 'warning',
            customIconData: '',
            title: ADMONITION_TYPES.warning.defaultTitle, // Should be 'Warning'
        });
    });

    // --- TEST 4 - 7: Collapsible State Logic ---
    it('should calculate editorOpenState correctly based on isCollapsible=false, isInitiallyExpanded=true -> Should be OPEN', () => {
        const { rerender } = render(<Edit attributes={mockAttributes} setAttributes={mockSetAttributes} />);

        expect(screen.getByTestId('admonition-structure')).toHaveAttribute('data-is-open', 'true');
    });

    it('should calculate editorOpenState correctly based on isCollapsible=true, isInitiallyExpanded=true -> Should be OPEN', () => {
        const { rerender } = render(<Edit attributes={mockAttributes} setAttributes={mockSetAttributes} />);

        mockAttributes.isCollapsible = true;
        mockAttributes.isInitiallyExpanded = true;
        rerender(<Edit attributes={mockAttributes} setAttributes={mockSetAttributes} />);
        expect(screen.getByTestId('admonition-structure')).toHaveAttribute('data-is-open', 'true');
    });

    it('should calculate editorOpenState correctly based on isCollapsible=false and isInitiallyExpanded=false -> Should be OPEN (overrides expansion state)', () => {
        const { rerender } = render(<Edit attributes={mockAttributes} setAttributes={mockSetAttributes} />);

        mockAttributes.isCollapsible = false;
        mockAttributes.isInitiallyExpanded = false;
        rerender(<Edit attributes={mockAttributes} setAttributes={mockSetAttributes} />);
        expect(screen.getByTestId('admonition-structure')).toHaveAttribute('data-is-open', 'true');
    });

    it('should calculate editorOpenState correctly based on isCollapsible=true and isInitiallyExpanded=false -> Should be CLOSED', () => {
        const { rerender } = render(<Edit attributes={mockAttributes} setAttributes={mockSetAttributes} />);

        mockAttributes.isCollapsible = true;
        mockAttributes.isInitiallyExpanded = false;
        rerender(<Edit attributes={mockAttributes} setAttributes={mockSetAttributes} />);
        expect(screen.getByTestId('admonition-structure')).toHaveAttribute('data-is-open', 'false');
    });
});