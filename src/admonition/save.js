/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, RichText, InnerBlocks } from '@wordpress/block-editor';

// Map type to a standard icon string (e.g., Unicode or simple slug for CSS)
const ICON_SLUG_MAP = {
    note: 'edit',
    warning: 'warning',
    tip: 'lightbulb',
};

/**
 * The save function defines the way in which the different attributes should
 * be combined into the final markup, which is then serialized by the block
 * editor into `post_content`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 *
 * @return {Element} Element to render.
 */
export default function save({ attributes }) {
    const { type, title, customIconData } = attributes;

    const blockProps = useBlockProps.save({
        className: `admonition-type-${ type }`,
    });

    // Determine the CSS variable or class for the icon
    let iconAttribute = {};
    if (customIconData) {
        // If custom icon, apply the mask-image style inline
        iconAttribute['data-custom-icon'] = customIconData;
    } else {
        // Otherwise, apply a data attribute for CSS targeting of the default icon
        iconAttribute['data-default-icon'] = ICON_SLUG_MAP[type];
    }

    // The entire block is wrapped in <details>
    return (
        <details {...blockProps} open>

            {/* The summary is the clickable header. Use the iconAttribute here. */}
            <summary {...iconAttribute} className="admonition-header">
                {/* Note: We rely on CSS to place the icon on the front end */}
                <RichText.Content
                    tagName="summary"
                    value={title}
                    className="admonition-title"
                />
            </summary>

            {/* The content is displayed below the summary */}
            <div className="admonition-content">
                <InnerBlocks.Content />
            </div>
        </details>
    );
}
