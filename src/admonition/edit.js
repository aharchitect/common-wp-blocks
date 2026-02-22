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
	__experimentalBorderRadiusControl as BorderRadiusControl,
} from '@wordpress/block-editor';

import {
	SelectControl,
	PanelBody,
	ToggleControl,
	TextareaControl,
	BorderBoxControl,
	Tooltip,
	Icon,
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
		customBlockBgColor,
		customHeaderBgColor,
		customHeaderTextColor,
		customBorderBox,
		enableCustomBorder,
		customBorderColor,
		customBorderWidth,
		customBorderRadius,
		customBorderRadiusValues,
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
	const defaultBorderValue = {
		width: `${ customBorderWidth || 1 }px`,
	};

	const resolvedBorderValue =
		customBorderBox && Object.keys( customBorderBox ).length
			? customBorderBox
			: defaultBorderValue;

	const sides = [ 'top', 'right', 'bottom', 'left' ];
	const hasSplitBorder = sides.some(
		( side ) =>
			typeof resolvedBorderValue?.[ side ] === 'object' &&
			resolvedBorderValue?.[ side ] !== null
	);
	const isUniformSplitBorder = hasSplitBorder
		? [ 'width', 'color', 'style' ].every( ( key ) => {
				const values = sides.map(
					( side ) => resolvedBorderValue?.[ side ]?.[ key ] || ''
				);
				return values.every( ( value ) => value === values[ 0 ] );
		  } )
		: false;

	if ( hasSplitBorder && ! isUniformSplitBorder ) {
		sides.forEach( ( side ) => {
			const sideValue = resolvedBorderValue?.[ side ] || {};
			if ( sideValue.width ) {
				blockStyle[ `--admonition-edge-${ side }-width` ] =
					sideValue.width;
			}
			if ( sideValue.color ) {
				blockStyle[ `--admonition-edge-${ side }-color` ] =
					sideValue.color;
			}
			if ( sideValue.style ) {
				blockStyle[ `--admonition-edge-${ side }-style` ] =
					sideValue.style;
			}
		} );
	} else {
		const linkedWidth = isUniformSplitBorder
			? resolvedBorderValue?.left?.width
			: resolvedBorderValue?.width;
		const linkedColor = isUniformSplitBorder
			? resolvedBorderValue?.left?.color
			: resolvedBorderValue?.color;
		const linkedStyle = isUniformSplitBorder
			? resolvedBorderValue?.left?.style
			: resolvedBorderValue?.style;

		if ( linkedWidth ) {
			blockStyle[ '--admonition-edge-left-width' ] = linkedWidth;
			blockStyle[ '--admonition-edge-top-width' ] = '0px';
			blockStyle[ '--admonition-edge-right-width' ] = '0px';
			blockStyle[ '--admonition-edge-bottom-width' ] = '0px';
		}
		if ( linkedColor ) {
			blockStyle[ '--admonition-edge-left-color' ] = linkedColor;
		}
		if ( linkedStyle ) {
			blockStyle[ '--admonition-edge-left-style' ] = linkedStyle;
		}
	}

	// Legacy fallback for existing content saved with earlier attributes.
	if ( enableCustomBorder && customBorderColor ) {
		blockStyle[ '--admonition-accent-left-color' ] = customBorderColor;
	}
	if (
		customBorderRadiusValues &&
		Object.keys( customBorderRadiusValues ).length
	) {
		const topLeft = customBorderRadiusValues.topLeft || '0px';
		const topRight = customBorderRadiusValues.topRight || '0px';
		const bottomRight = customBorderRadiusValues.bottomRight || '0px';
		const bottomLeft = customBorderRadiusValues.bottomLeft || '0px';
		blockStyle[
			'--admonition-corner-radius'
		] = `${ topLeft } ${ topRight } ${ bottomRight } ${ bottomLeft }`;
	} else if ( typeof customBorderRadius === 'number' ) {
		blockStyle[
			'--admonition-corner-radius'
		] = `${ customBorderRadius }px`;
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

	const maybeSyncHeaderToBorderColor = ( newColor, nextAttributes ) => {
		// Offer a one-click sync to keep header and border visually aligned.
		if ( newColor && ! customHeaderBgColor ) {
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
	};

	const applyBorderBox = ( value ) => {
		const nextAttributes = {
			customBorderBox: value,
			enableCustomBorder: true, // keep compatibility for already stored posts
		};

		const firstColor =
			value?.left?.color ||
			value?.top?.color ||
			value?.right?.color ||
			value?.bottom?.color ||
			value?.color ||
			'';

		if ( firstColor && firstColor !== customBorderColor ) {
			nextAttributes.customBorderColor = firstColor;
			maybeSyncHeaderToBorderColor( firstColor, nextAttributes );
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
				<PanelBody title="Colors">
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
						] }
					/>
				</PanelBody>
				<PanelBody title="Border">
					<Tooltip text="Linked mode uses one value in the control, but this block applies it to the left border only. Unlink sides to set top, right, bottom, and left individually and at least one value must be different.">
						<span
							role="button"
							tabIndex={ 0 }
							aria-label="Border behavior help"
							style={ {
								display: 'inline-flex',
								alignItems: 'center',
								gap: '4px',
								cursor: 'help',
								marginBottom: '8px',
							} }
						>
							<Icon icon="info-outline" />
							How linked borders work
						</span>
					</Tooltip>
					<BorderBoxControl
						label="Border"
						value={ resolvedBorderValue }
						onChange={ applyBorderBox }
						enableAlpha
						enableStyle={ false }
						size="__unstable-large"
						__experimentalIsRenderedInSidebar
					/>
					<BorderRadiusControl
						values={
							customBorderRadiusValues &&
							Object.keys( customBorderRadiusValues ).length
								? customBorderRadiusValues
								: `${ customBorderRadius || 0 }px`
						}
						onChange={ ( value ) => {
							if ( typeof value === 'string' ) {
								const normalized = value || '0px';
								const parsedNumeric = parseFloat(
									normalized.replace( /[^0-9.-]/g, '' )
								);
								setAttributes( {
									customBorderRadiusValues: {
										topLeft: normalized,
										topRight: normalized,
										bottomRight: normalized,
										bottomLeft: normalized,
									},
									customBorderRadius: Number.isNaN(
										parsedNumeric
									)
										? 0
										: parsedNumeric,
								} );
								return;
							}

							setAttributes( {
								customBorderRadiusValues: value || {},
							} );
						} }
					/>
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
