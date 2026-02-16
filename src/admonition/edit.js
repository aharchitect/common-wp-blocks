/**
 * (i18n helper removed) Translation helper is not used in this file.
 * If you need translation in the future, re-add `__` from '@wordpress/i18n'.
 */

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';

import {
	SelectControl,
	PanelBody,
	ToggleControl,
	TextareaControl,
} from '@wordpress/components';

/* eslint-disable jsdoc/check-line-alignment */

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

// Import shared constants
import { ADMONITION_TYPES, TYPE_OPTIONS } from './constants';
import AdmonitionStructure from './AdmonitionStructure';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @param {Object} root0
 * @param {Object} root0.attributes
 * @param {Function} root0.setAttributes
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { type, title, customIconData, isCollapsible, isInitiallyExpanded } =
		attributes;

	// Determine the 'open' state for the editor's preview
	// If not collapsible OR if collapsible AND initially expanded
	const editorOpenState = ! isCollapsible || isInitiallyExpanded;

	// Use the same icon-mask pipeline as save(): CSS variable on wrapper + data flags on summary.
	const blockStyle = customIconData
		? {
				'--admonition-icon-mask': `url('${ customIconData }')`,
		  }
		: {};

	// blockProps manages classes and inline styles (for color controls)
	const blockProps = useBlockProps( {
		className: `admonition-type-${ type }`,
		style: blockStyle,
	} );
	blockProps[ 'data-is-collapsible' ] = isCollapsible ? 'true' : 'false';

	const iconAttribute = customIconData
		? { 'data-has-custom-icon': 'true' }
		: { 'data-has-default-icon': 'true' };

	return (
		<>
			{ /* 1. Inspector Controls for Type Selection */ }
			<InspectorControls>
				<PanelBody title="Admonition Type & Icon">
					{ /* 1a. Collapsible Toggle */ }
					<ToggleControl
						label="Enable Collapsing"
						help={
							isCollapsible
								? 'Users can collapse and expand this block.'
								: 'The block content will always be visible.'
						}
						checked={ isCollapsible }
						onChange={ ( value ) =>
							setAttributes( { isCollapsible: value } )
						}
					/>

					{ /* 1b. Default State Toggle (Conditional on Collapsible being ON) */ }
					{ isCollapsible && (
						<ToggleControl
							label="Start Expanded (Default State)"
							help={
								isInitiallyExpanded
									? 'The block will be open on page load.'
									: 'The block will be collapsed on page load.'
							}
							checked={ isInitiallyExpanded }
							onChange={ ( value ) =>
								setAttributes( { isInitiallyExpanded: value } )
							}
						/>
					) }

					{ /* Standard Type Selector */ }
					<SelectControl
						label="Admonition Type (for base styling)"
						value={ type }
						// Use the centralized TYPE_OPTIONS
						options={ TYPE_OPTIONS }
						onChange={ ( newType ) => {
							// Find the new default title
							const newDefaultTitle =
								ADMONITION_TYPES[ newType ]?.defaultTitle ||
								'Note';

							// Reset custom icon and update type/title simultaneously
							setAttributes( {
								type: newType,
								customIconData: '',
								title: newDefaultTitle, // Set the default title when type changes
							} );
						} }
					/>
					{ /* Custom Icon Input */ }
					<TextareaControl
						label="Custom Icon (Paste SVG or Base64 URL)"
						help="Enter the full SVG or Base64 data URL (e.g., data:image/svg+xml;utf8,...). This will override the default icon."
						value={ customIconData }
						onChange={ ( newIconData ) =>
							setAttributes( { customIconData: newIconData } )
						}
					/>
				</PanelBody>
				{ /* Color controls will automatically appear here because of block.json supports */ }
			</InspectorControls>

			{ /* 2. Block Content (Editor View) */ }
			<div { ...blockProps }>
				<AdmonitionStructure
					title={ title }
					iconAttribute={ iconAttribute }
					isCollapsible={ isCollapsible }
					isOpen={ editorOpenState }
					titleTagName="h4"
					iconElement={ null } // Editor now uses the same summary::before icon path as frontend
					mode="edit"
					// Pass a function that correctly calls setAttributes for the title
					setAttributes={ ( newTitle ) =>
						setAttributes( { title: newTitle } )
					}
				/>
			</div>
		</>
	);
}
