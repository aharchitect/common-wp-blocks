import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import AdmonitionStructure from '../AdmonitionStructure';

// --- MOCKING WORDPRESS COMPONENTS ---

// 💡 FIX: Define the mock implementations *inside* the jest.mock factory function
// to prevent the "Cannot access before initialization" error.

jest.mock('@wordpress/block-editor', () => {
    // 1. Mock RichText
    const MockRichText = ({ value, onChange, tagName: Tag, className }) => (
        <Tag data-testid="rich-text-edit" data-onchange={!!onChange} className={className}>{value}</Tag>
    );
    MockRichText.Content = ({ value, tagName: Tag, className }) => (
        <Tag data-testid="rich-text-save" className={className}>{value}</Tag>
    );

    // 2. Mock InnerBlocks
    const MockInnerBlocks = (props) => (
        <div data-testid="inner-blocks-edit" data-props={JSON.stringify(props)} />
    );
    MockInnerBlocks.Content = () => (
        <div data-testid="inner-blocks-save" />
    );

    return {
        RichText: MockRichText,
        InnerBlocks: MockInnerBlocks,
    };
});

// Mocking @wordpress/components (Icon)
jest.mock('@wordpress/components', () => {
    // Define MockIcon inside the factory function
    const MockIcon = ({ icon, className }) => (
        <span data-testid="mock-icon" className={className}>{icon}</span>
    );

    return {
        Icon: MockIcon,
    };
});

describe('AdmonitionStructure', () => {
    // ... (rest of the tests remain the same)
    const defaultProps = {
        title: 'Test Title',
        iconAttribute: { 'data-test-icon': 'edit' },
        isCollapsible: true,
        isOpen: true,
        titleTagName: 'h4',
        iconElement: <span data-testid="custom-icon">⚙️</span>,
        setAttributes: jest.fn(),
    };

    // --- TEST 1: Edit Mode (isEditing = true) ---
    it('should render in EDIT mode with correct components and attributes', () => {
        const props = { ...defaultProps, mode: 'edit' };
        const { container } = render(<AdmonitionStructure {...props} />);

        // 1. Check <details> attribute (isOpen = true)
        const details = screen.getByRole('group');
        expect(details).toHaveAttribute('open');

        // 2. Check <summary> attributes and class
        const summary = container.querySelector('summary');
        expect(summary).toHaveClass('admonition-header');
        expect(summary).not.toHaveClass('is-static');
        expect(summary).toHaveAttribute('data-test-icon', 'edit');

        // 3. Check Title Component (RichText and its props)
        const richText = screen.getByTestId('rich-text-edit');
        expect(richText.tagName).toBe('H4'); // titleTagName is h4
        expect(richText).toHaveTextContent('Test Title');
        expect(richText).toHaveAttribute('data-onchange', 'true');

        // 4. Check Editor-specific elements
        expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
        expect(screen.getByTestId('mock-icon')).toBeInTheDocument();

        // 5. Check Content Component (InnerBlocks)
        const innerBlocks = screen.getByTestId('inner-blocks-edit');
        const innerProps = JSON.parse(innerBlocks.getAttribute('data-props'));
        expect(innerProps).toHaveProperty('allowedBlocks');
    });

    // --- TEST 2: Save Mode (isEditing = false) ---
    it('should render in SAVE mode with correct components and attributes', () => {
        const props = { ...defaultProps, mode: 'save', titleTagName: 'summary' }; // Set titleTagName for accuracy
        render(<AdmonitionStructure {...props} />);

        // 1. Check Title Component (RichText.Content)
        const richTextContent = screen.getByTestId('rich-text-save');
        expect(richTextContent.tagName).toBe('SUMMARY'); // titleTagName is summary in this test
        expect(screen.queryByTestId('rich-text-edit')).not.toBeInTheDocument();

        // 2. Check Content Component (InnerBlocks.Content)
        expect(screen.getByTestId('inner-blocks-save')).toBeInTheDocument();
        expect(screen.queryByTestId('inner-blocks-edit')).not.toBeInTheDocument();

        // 3. Check for Editor-specific elements (should be absent)
        expect(screen.queryByTestId('mock-icon')).not.toBeInTheDocument();
    });

    // --- TEST 3: Static (Non-Collapsible) Rendering ---
    it('should add the is-static class when isCollapsible is false', () => {
        const props = { ...defaultProps, mode: 'save', isCollapsible: false };
        const { container } = render(<AdmonitionStructure {...props} />);

        const summary = container.querySelector('summary');
        expect(summary).toHaveClass('admonition-header');
        expect(summary).toHaveClass('is-static');
    });

    // --- TEST 4: Collapsible State on <details> ---
    it('should set the <details open> attribute based on isOpen prop', () => {
        // Case A: isOpen = true
        let props = { ...defaultProps, mode: 'save', isOpen: true };
        let { rerender } = render(<AdmonitionStructure {...props} />);
        expect(screen.getByRole('group')).toHaveAttribute('open');

        // Case B: isOpen = false
        props = { ...defaultProps, mode: 'save', isOpen: false };
        rerender(<AdmonitionStructure {...props} />);
        expect(screen.getByRole('group')).not.toHaveAttribute('open');
    });
});