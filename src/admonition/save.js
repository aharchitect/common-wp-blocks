/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from '@wordpress/block-editor';

import AdmonitionStructure from './AdmonitionStructure';

/**
 * The save function defines the way in which the different attributes should
 * be combined into the final markup, which is then serialized by the block
 * editor into `post_content`.
 *
 * @param {Object} root0
 * @param {Object} root0.attributes
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 *
 * @return {Element} Element to render.
 */
export default function save( { attributes } ) {
	const {
		type,
		title,
		customIconData,
		isCollapsible,
		isInitiallyExpanded,
		enableCustomBorder,
		customBlockBgColor,
		customHeaderBgColor,
		customHeaderTextColor,
		customBorderColor,
		customBorderWidth,
		customBorderRadius,
	} = attributes;

	// Apply custom styling for icon masking directly to the block wrapper via blockProps
	// The CSS variable is used for custom icons, overriding the default.
	const blockStyle = {};
	if ( customIconData ) {
		blockStyle[ '--admonition-icon-mask' ] = `url('${ customIconData }')`;
	}
	if ( customBlockBgColor ) {
		blockStyle[ '--admonition-block-bg-custom' ] = customBlockBgColor;
	}
	if ( customHeaderBgColor ) {
		blockStyle[ '--admonition-header-bg-custom' ] = customHeaderBgColor;
	}
	if ( customHeaderTextColor ) {
		blockStyle[ '--admonition-header-text-custom' ] =
			customHeaderTextColor;
	}
	if ( enableCustomBorder ) {
		if ( customBorderColor ) {
			blockStyle[ '--admonition-accent-left-color' ] = customBorderColor;
		}
		if ( typeof customBorderWidth === 'number' ) {
			blockStyle[ '--admonition-accent-left-width' ] = `${ customBorderWidth }px`;
		}
		if ( typeof customBorderRadius === 'number' ) {
			blockStyle[ '--admonition-corner-radius' ] =
				`${ customBorderRadius }px`;
		}
	}

	const blockProps = useBlockProps.save( {
		className: `admonition-type-${ type }`,
		style: blockStyle, // Apply custom icon style here
	} );

	// --- Icon Attribute Logic for Frontend CSS Masking ---
	const iconAttribute = {};

	// If a custom icon is provided, set a flag attribute for CSS to target
	if ( customIconData ) {
		// The custom icon URL is already in the inline style via the CSS variable.
		// We set a flag or just leave data-default-icon empty/unset.
		// We will use 'data-has-custom-icon' as a clear flag.
		iconAttribute[ 'data-has-custom-icon' ] = 'true';
	} else {
		// If no custom icon, set a boolean flag so CSS applies the predefined icon.
		iconAttribute[ 'data-has-default-icon' ] = 'true';
	}
	// -----------------------------------------------------

	// Add the data attribute for CSS targeting of static blocks
	// Note: useBlockProps.save should not be modified, so we add to the outer div in AdmonitionStructure.
	// However, if we put it on the wrapper div, we can easily target it in the SCSS.
	blockProps[ 'data-is-collapsible' ] = isCollapsible ? 'true' : 'false';

	// Determine the 'open' state for the <details> tag
	// It's only 'open' if it's collapsible AND initially expanded
	const isOpen = isCollapsible && isInitiallyExpanded;

	return (
		<div { ...blockProps }>
			<AdmonitionStructure
				title={ title }
				// Pass attributes to the <summary> element
				iconAttribute={ iconAttribute }
				isCollapsible={ isCollapsible }
				isOpen={ isOpen }
				titleTagName="span" // Keep title text inside summary without nesting summary elements
				iconElement={ null } // Icons are handled by CSS masking on summary::before
				mode="save"
			/>
		</div>
	);
}
