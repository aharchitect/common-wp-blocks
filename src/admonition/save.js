/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, RichText } from '@wordpress/block-editor';

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
    const { type, title, content } = attributes;

    const blockProps = useBlockProps.save({
        className: `admonition-type-${ type }`,
    });

    // The entire block is wrapped in <details>
    return (
        <details {...blockProps} open>
            
            {/* The summary is the clickable header */}
            <summary className="admonition-header">
                {/* Note: We rely on CSS to place the icon on the front end */}
                <RichText.Content 
                    tagName="summary" 
                    value={title} 
                    className="admonition-title"
                />
            </summary>
            
            {/* The content is displayed below the summary */}
            <div className="admonition-content">
                <RichText.Content 
                    tagName="p" 
                    value={content} 
                />
            </div>
        </details>
    );
}
