import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import save from '../save';
import { ICON_MAP } from '../constants'; // Assumes ICON_MAP is correct

// --- MOCKING WORDPRESS AND CHILD COMPONENTS ---

// Mock useBlockProps.save to return a simple identifiable object
jest.mock('@wordpress/block-editor', () => ({
    // useBlockProps.save is a function that returns props
    useBlockProps: {
        save: jest.fn((props) => ({
            ...props,
            'data-block-id': 'mocked-save-id'
        })),
    },
    // Mock InnerBlocks and RichText just to satisfy imports
    InnerBlocks: { Content: () => <div data-testid="inner-blocks-content" /> },
    RichText: ({ value }) => <span data-testid="rich-text-save">{value}</span>,
}));

// Mock AdmonitionStructure to return a simple identifiable component
jest.mock('../AdmonitionStructure', () => ({
    __esModule: true,
    default: jest.fn(({ title, iconAttribute, isCollapsible, isOpen, titleTagName }) => (
        <div
            data-testid="admonition-structure-save"
            data-title={title}
            data-icon-attrs={JSON.stringify(iconAttribute)}
            data-is-collapsible={isCollapsible ? 'true' : 'false'}
            data-is-open={isOpen ? 'true' : 'false'}
            data-tag={titleTagName}
        >
            {/* InnerBlocks content goes here, but we can assume AdmonitionStructure handles it */}
            <div data-testid="inner-blocks-placeholder"></div>
        </div>
    )),
}));


describe('Save', () => {
    let defaultAttributes;

    beforeEach(() => {
        defaultAttributes = {
            type: 'note',
            title: 'Note Title',
            customIconData: '',
            isCollapsible: false,
            isInitiallyExpanded: true,
        };
    });

    // --- TEST 1: Default (non-collapsible, no custom icon) ---
    it('should correctly render default markup with dashicon attribute and basic type class', () => {
        const { container } = render(save({ attributes: defaultAttributes }));

        // 1. Check outer blockProps attributes
        const wrapperDiv = container.firstChild;
        expect(wrapperDiv).toHaveClass(`admonition-type-note`);
        // Check the computed style property directly to ensure it is not set (empty string)
        // Note: For custom CSS variables, the computed style might be an empty string or undefined if not set.
        expect(wrapperDiv.style.getPropertyValue('--admonition-icon-mask')).toBe('');

        expect(wrapperDiv).toHaveAttribute('data-is-collapsible', 'false');

        // 2. Check AdmonitionStructure props
        const structure = screen.getByTestId('admonition-structure-save');
        expect(structure).toHaveAttribute('data-title', 'Note Title');
        expect(structure).toHaveAttribute('data-tag', 'summary');
        expect(structure).toHaveAttribute('data-is-open', 'false');

        // 3. Check default iconAttribute logic
        const iconAttrs = JSON.parse(structure.getAttribute('data-icon-attrs'));
        expect(iconAttrs).toEqual({
            'data-default-icon': ICON_MAP.note,
        });
    });

    // --- TEST 2: Custom Icon Data Logic ---
    it('should generate inline CSS variable and custom-icon flag when customIconData is present', () => {
        const customUrl = 'data:image/svg+xml;utf8,...';
        defaultAttributes.customIconData = customUrl;

        const { container } = render(save({ attributes: defaultAttributes }));

        // 1. Check outer blockProps attributes (Inline Style)
        const wrapperDiv = container.firstChild;
        expect(wrapperDiv).toHaveStyle(`--admonition-icon-mask: url('${customUrl}')`);

        // 2. Check iconAttribute flag
        const structure = screen.getByTestId('admonition-structure-save');
        const iconAttrs = JSON.parse(structure.getAttribute('data-icon-attrs'));
        expect(iconAttrs).toEqual({
            'data-has-custom-icon': 'true',
        });
    });

    // --- TEST 3: Collapsible State Logic ---
    it('should correctly set blockProps collapsible attribute and AdmonitionStructure isOpen state', () => {
        // Scenario 1: Collapsible, Initially Expanded (Open)
        defaultAttributes.isCollapsible = true;
        defaultAttributes.isInitiallyExpanded = true;
        let { container, rerender } = render(save({ attributes: defaultAttributes }));
        let wrapperDiv = container.firstChild;
        let structure = screen.getByTestId('admonition-structure-save');

        expect(wrapperDiv).toHaveAttribute('data-is-collapsible', 'true');
        expect(structure).toHaveAttribute('data-is-open', 'true'); // Collapsible AND Expanded = true

        // Scenario 2: Collapsible, NOT Initially Expanded (Closed)
        defaultAttributes.isInitiallyExpanded = false;
        rerender(save({ attributes: defaultAttributes }));
        wrapperDiv = container.firstChild;
        structure = screen.getByTestId('admonition-structure-save');

        expect(wrapperDiv).toHaveAttribute('data-is-collapsible', 'true');
        expect(structure).toHaveAttribute('data-is-open', 'false'); // Collapsible, but NOT Expanded = false
    });
});