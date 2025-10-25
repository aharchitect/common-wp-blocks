/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';

import { SelectControl, PanelBody, Icon } from '@wordpress/components';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

// Map type to Dashicon for visual aid in the editor
const ICON_MAP = {
    note: 'edit',
    warning: 'warning',
    tip: 'lightbulb',
};

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
    const { type, title, content } = attributes;

    // The block wrapper takes the dynamic class
    const blockProps = useBlockProps({
        className: `admonition-type-${ type }`,
    });

    return (
        <>
            {/* 1. Inspector Controls for Type Selection */}
            <InspectorControls>
                <PanelBody title="Note Type">
                    <SelectControl
                        label="Admonition Type"
                        value={type}
                        options={[
                            { label: 'Note (Blue)', value: 'note' },
                            { label: 'Warning (Yellow)', value: 'warning' },
                            { label: 'Tip (Green)', value: 'tip' },
                        ]}
                        onChange={(newType) => setAttributes({ type: newType })}
                    />
                </PanelBody>
            </InspectorControls>

            {/* 2. Block Content (Editor View) */}
            <div {...blockProps}>

                {/* Header (will become <summary>) */}
                <div className="admonition-header">
                    <Icon icon={ICON_MAP[type]} className="admonition-icon" />
                    <RichText
                        tagName="h4" // Using h4 for ease of styling in editor
                        value={title}
                        onChange={(newTitle) => setAttributes({ title: newTitle })}
                        placeholder="Enter Title"
                        className="admonition-title"
                    />
                    <Icon icon="arrow-down-alt2" className="admonition-toggle-icon" />
                </div>

                {/* Body (will become <p> inside <details>) */}
                <div className="admonition-content">
                    <RichText
                        tagName="p"
                        value={content}
                        onChange={(newContent) => setAttributes({ content: newContent })}
                        placeholder="Start typing your note content..."
                    />
                </div>
            </div>
        </>
    );
}
