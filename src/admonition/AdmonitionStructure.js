import { RichText, InnerBlocks } from '@wordpress/block-editor';
import { Icon } from '@wordpress/components'; // Needed for the editor's toggle icon

/**
 * Reusable component for the Admonition block's core HTML structure.
 * This component handles either a collapsible <details>/<summary> structure
 * or a static header/content structure based on the isCollapsible prop.
 *
 * @param {Object}  props               - Component properties.
 * @param {string}  props.title         - The title text.
 * @param {Object}  props.iconAttribute - Data attributes for custom/default icons.
 * @param {boolean} props.isCollapsible - Whether collapsing is enabled (affects summary class).
 * @param {boolean} props.isOpen        - Controls the 'open' attribute on <details>.
 * @param {string}  props.titleTagName  - Tag name for the title (h4 in edit, summary in save).
 * @param {Element} props.iconElement   - The icon element (Dashicon in edit, or empty in save).
 * @param {string}  props.mode          - 'edit' or 'save' to determine RichText usage.
 * @param {Function} props.setAttributes
 * @return {Element} The JSX structure.
 */
export default function AdmonitionStructure( {
	title,
	iconAttribute,
	isCollapsible,
	isOpen,
	titleTagName,
	iconElement,
	mode,
	setAttributes,
} ) {
	const isEditing = mode === 'edit';
	const ContentComponent = isEditing ? InnerBlocks : InnerBlocks.Content;
	const TitleComponent = isEditing ? RichText : RichText.Content;
	const titleProps = {
		tagName: titleTagName,
		value: title,
		onChange: isEditing ? setAttributes : undefined,
		placeholder: isEditing ? 'Enter Title (e.g., Note)' : undefined,
		className: 'admonition-title',
	};

	if ( ! isCollapsible ) {
		return (
			<>
				<div { ...iconAttribute } className="admonition-header">
					{ iconElement }
					<TitleComponent { ...titleProps } />
				</div>

				<div className="admonition-content">
					<ContentComponent
						// InnerBlocks props are only valid in edit mode
						{ ...( isEditing && {
							allowedBlocks: [
								'core/paragraph',
								'core/list',
								'core/image',
								'core/button',
							],
							templateLock: false,
							template: [
								[
									'core/paragraph',
									{
										placeholder:
											'Add your note content here...',
									},
								],
							],
						} ) }
					/>
				</div>
			</>
		);
	}

	return (
		// The <details> element
		<details open={ isOpen }>
			{ /* The <summary> element (header) */ }
			<summary { ...iconAttribute } className="admonition-header">
				{ /* Custom/Default Icon */ }
				{ iconElement }

				{ /* Title */ }
				<TitleComponent { ...titleProps } />

				{ /* Editor Toggle Icon (only shows in editor) */ }
				{ isEditing && isCollapsible && (
					<Icon
						icon="arrow-down-alt2"
						className="admonition-toggle-icon"
					/>
				) }
			</summary>

			{ /* Body Content */ }
			<div className="admonition-content">
				<ContentComponent
					// InnerBlocks props are only valid in edit mode
					{ ...( isEditing && {
						allowedBlocks: [
							'core/paragraph',
							'core/list',
							'core/image',
							'core/button',
						],
						templateLock: false,
						template: [
							[
								'core/paragraph',
								{
									placeholder:
										'Add your note content here...',
								},
							],
						],
					} ) }
				/>
			</div>
		</details>
	);
}
