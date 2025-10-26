/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, RichText, InnerBlocks } from '@wordpress/block-editor';

// Import shared constants
import { ICON_MAP } from './constants';
import AdmonitionStructure from './AdmonitionStructure';

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
    const { type, title, customIconData, isCollapsible, isInitiallyExpanded } = attributes;

    // Apply custom styling for icon masking directly to the block wrapper via blockProps
    // The CSS variable is used for custom icons, overriding the default.
    const blockStyle = customIconData ? {
        '--admonition-icon-mask': `url('${customIconData}')`,
    } : {};

    const blockProps = useBlockProps.save({
        className: `admonition-type-${ type }`,
        style: blockStyle, // Apply custom icon style here
    });

    // --- Icon Attribute Logic for Frontend CSS Masking ---
    let iconAttribute = {};

    // If a custom icon is provided, set a flag attribute for CSS to target
    if (customIconData) {
        // The custom icon URL is already in the inline style via the CSS variable.
        // We set a flag or just leave data-default-icon empty/unset.
        // We will use 'data-has-custom-icon' as a clear flag.
        iconAttribute['data-has-custom-icon'] = 'true';

    } else {
        // If no custom icon, provide the dashicon mapping for CSS to use.
        iconAttribute['data-default-icon'] = ICON_MAP[type];
    }
    // -----------------------------------------------------

    // Add the data attribute for CSS targeting of static blocks
    // Note: useBlockProps.save should not be modified, so we add to the outer div in AdmonitionStructure.
    // However, if we put it on the wrapper div, we can easily target it in the SCSS.
    blockProps['data-is-collapsible'] = isCollapsible ? 'true' : 'false';

    // Determine the 'open' state for the <details> tag
    // It's only 'open' if it's collapsible AND initially expanded
    const isOpen = isCollapsible && isInitiallyExpanded;

    return (
        <div {...blockProps}>
            <AdmonitionStructure
                title={title}
                // Pass attributes to the <summary> element
                iconAttribute={iconAttribute}
                isCollapsible={isCollapsible}
                isOpen={isOpen}
                titleTagName="summary" // The correct tag for the frontend
                iconElement={null} // Icons are handled by CSS masking on summary::before
                mode="save"
            />
        </div>
    );
}
