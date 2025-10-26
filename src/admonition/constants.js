// Shared constants for the Admonition block

// You can also move ALLOWED_BLOCKS here
export const ALLOWED_BLOCKS = [
    'core/paragraph',
    'core/list',
    'core/image',
    'core/button'
];

export const ADMONITION_TYPES = {
    note: {
        dashicon: 'edit',
        defaultTitle: 'Note',
        label: 'Note (Blue)',
        styles: { primary: '#007cba', blockBg: '#e6f3ff', headerBg: '#cce7ff' },
    },
    warning: {
        dashicon: 'warning',
        defaultTitle: 'Warning',
        label: 'Warning (Yellow)',
        styles: { primary: '#d54e21', blockBg: '#fff8e6', headerBg: '#fff0cc' },
    },
    tip: {
        dashicon: 'lightbulb',
        defaultTitle: 'Tip',
        label: 'Tip (Green)',
        styles: { primary: '#46b450', blockBg: '#e6ffec', headerBg: '#cce0d0' },
    },
    // Adding a new type is now trivial
    danger: {
        dashicon: 'explosive',
        defaultTitle: 'Danger',
        label: 'Danger (Red)',
        styles: { primary: '#dc3232', blockBg: '#ffe6e6', headerBg: '#ffcccc' },
    },
};

// Map 'type' key to 'dashicon' value for backwards compatibility/simplicity where only the icon is needed.
// This is used in edit.js for the Dashicon lookup.
export const ICON_MAP = Object.keys(ADMONITION_TYPES).reduce((acc, key) => {
    acc[key] = ADMONITION_TYPES[key].dashicon;
    return acc;
}, {});

// Array of { label, value } for use in SelectControl
export const TYPE_OPTIONS = Object.keys(ADMONITION_TYPES).map(key => ({
    label: ADMONITION_TYPES[key].label,
    value: key,
}));