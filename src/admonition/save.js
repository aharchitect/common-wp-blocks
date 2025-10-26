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

    const blockProps = useBlockProps.save({
        className: `admonition-type-${ type }`,
    });

    // Add the data attribute for CSS targeting of static blocks
    blockProps['data-is-collapsible'] = isCollapsible ? 'true' : 'false';

    // Determine the CSS variable or class for the icon
    let iconAttribute = {};
    if (customIconData) {
        // If custom icon, apply the mask-image style inline
        iconAttribute['data-custom-icon'] = customIconData;
    } else {
        // Otherwise, apply a data attribute for CSS targeting of the default icon
        iconAttribute['data-default-icon'] = ICON_MAP[type];
    }
    // Determine the 'open' state for the <details> tag
    const isOpen = isCollapsible && isInitiallyExpanded;

    return (
        <div {...blockProps}>
            <AdmonitionStructure
                title={title}
                iconAttribute={iconAttribute}
                isCollapsible={isCollapsible}
                isOpen={isOpen}
                titleTagName="summary" // The correct tag for the frontend
                iconElement={null}      // Icons are handled by CSS masking on summary::before
                mode="save"
            />
        </div>
    );
}
