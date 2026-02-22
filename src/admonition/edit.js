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
import {
	useBlockProps,
	InspectorControls,
	__experimentalPanelColorGradientSettings as PanelColorGradientSettings,
} from '@wordpress/block-editor';

import {
	SelectControl,
	PanelBody,
	ToggleControl,
	TextareaControl,
	RangeControl,
} from '@wordpress/components';

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

	// Determine the 'open' state for the editor's preview
	// If not collapsible OR if collapsible AND initially expanded
	const editorOpenState = ! isCollapsible || isInitiallyExpanded;

	// Use the same icon-mask pipeline as save(): CSS variable on wrapper + data flags on summary.
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
		blockStyle[ '--admonition-header-text-custom' ] = customHeaderTextColor;
	}
	if ( enableCustomBorder ) {
		if ( customBorderColor ) {
			blockStyle[ '--admonition-accent-left-color' ] = customBorderColor;
		}
		if ( typeof customBorderWidth === 'number' ) {
			blockStyle[
				'--admonition-accent-left-width'
			] = `${ customBorderWidth }px`;
		}
		if ( typeof customBorderRadius === 'number' ) {
			blockStyle[
				'--admonition-corner-radius'
			] = `${ customBorderRadius }px`;
		}
	}

	// blockProps manages classes and inline styles (for color controls)
	const blockProps = useBlockProps( {
		className: `admonition-type-${ type }`,
		style: blockStyle,
	} );
	blockProps[ 'data-is-collapsible' ] = isCollapsible ? 'true' : 'false';

	const iconAttribute = customIconData
		? { 'data-has-custom-icon': 'true' }
		: { 'data-has-default-icon': 'true' };

	const applyBorderColor = ( color ) => {
		const newColor = color || '';
		const nextAttributes = { customBorderColor: newColor };

		if ( newColor ) {
			nextAttributes.enableCustomBorder = true;
		}

		// Offer a one-click sync to keep header and border visually aligned.
		if (
			newColor &&
			newColor !== customBorderColor &&
			! customHeaderBgColor
		) {
			let shouldSyncHeader = false;
			if (
				typeof window !== 'undefined' &&
				typeof window.confirm === 'function'
			) {
				try {
					shouldSyncHeader = window.confirm(
						'Apply the same color to the header background?'
					);
				} catch {
					shouldSyncHeader = false;
				}
			}
			if ( shouldSyncHeader ) {
				nextAttributes.customHeaderBgColor = newColor;
			}
		}

		setAttributes( nextAttributes );
	};

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
			<InspectorControls group="styles">
				<PanelBody title="Colors & Border">
					<PanelColorGradientSettings
						title="Colors"
						settings={ [
							{
								label: 'Block Background',
								colorValue: customBlockBgColor,
								onColorChange: ( color ) =>
									setAttributes( {
										customBlockBgColor: color || '',
									} ),
								gradients: [],
								disableCustomGradients: true,
								clearable: true,
							},
							{
								label: 'Header Background',
								colorValue: customHeaderBgColor,
								onColorChange: ( color ) =>
									setAttributes( {
										customHeaderBgColor: color || '',
									} ),
								gradients: [],
								disableCustomGradients: true,
								clearable: true,
							},
							{
								label: 'Header Text',
								colorValue: customHeaderTextColor,
								onColorChange: ( color ) =>
									setAttributes( {
										customHeaderTextColor: color || '',
									} ),
								gradients: [],
								disableCustomGradients: true,
								clearable: true,
							},
							{
								label: 'Border',
								colorValue: customBorderColor,
								onColorChange: applyBorderColor,
								gradients: [],
								disableCustomGradients: true,
								clearable: true,
							},
						] }
					/>
					<ToggleControl
						label="Enable custom border styling"
						help={
							enableCustomBorder
								? 'Use custom border color, thickness, and radius.'
								: 'Use border defaults from the selected admonition type.'
						}
						checked={ enableCustomBorder }
						onChange={ ( value ) =>
							setAttributes( { enableCustomBorder: value } )
						}
					/>
					{ enableCustomBorder && (
						<>
							<RangeControl
								label="Border Thickness (px)"
								value={ customBorderWidth }
								onChange={ ( value ) =>
									setAttributes( {
										customBorderWidth:
											typeof value === 'number'
												? value
												: 5,
									} )
								}
								min={ 1 }
								max={ 20 }
							/>
							<RangeControl
								label="Border Radius (px)"
								value={ customBorderRadius }
								onChange={ ( value ) =>
									setAttributes( {
										customBorderRadius:
											typeof value === 'number'
												? value
												: 0,
									} )
								}
								min={ 0 }
								max={ 40 }
							/>
						</>
					) }
				</PanelBody>
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
