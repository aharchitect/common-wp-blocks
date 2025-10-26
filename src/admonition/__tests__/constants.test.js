// src/admonition/__tests__/constants.test.js

import { ADMONITION_TYPES, ICON_MAP, TYPE_OPTIONS } from '../constants';

describe('Admonition Constants', () => {

    it('ADMONITION_TYPES should be the canonical source of truth and define all necessary keys', () => {
        expect(typeof ADMONITION_TYPES).toBe('object');
        expect(Object.keys(ADMONITION_TYPES).length).toBeGreaterThan(0);

        // Check a few critical keys on the 'note' type
        expect(ADMONITION_TYPES.note).toHaveProperty('dashicon', 'edit');
        expect(ADMONITION_TYPES.note).toHaveProperty('defaultTitle', 'Note');
        expect(ADMONITION_TYPES.note.styles).toHaveProperty('primary', '#007cba');

        // Check a few critical keys on the 'danger' type
        expect(ADMONITION_TYPES.danger).toHaveProperty('dashicon', 'explosive');
    });

    it('all ADMONITION_TYPES objects should have the required keys (for structural integrity)', () => {
        const requiredKeys = ['dashicon', 'defaultTitle', 'label', 'styles'];

        Object.keys(ADMONITION_TYPES).forEach(type => {
            const config = ADMONITION_TYPES[type];
            requiredKeys.forEach(key => {
                expect(config).toHaveProperty(key);
            });
            expect(config.styles).toHaveProperty('primary');
            expect(config.styles).toHaveProperty('blockBg');
            expect(config.styles).toHaveProperty('headerBg');
        });
    });

    it('ICON_MAP should correctly map type keys to dashicons', () => {
        const types = Object.keys(ADMONITION_TYPES);
        expect(Object.keys(ICON_MAP).length).toBe(types.length);

        // Verify the mapping for each type
        types.forEach(type => {
            expect(ICON_MAP[type]).toBe(ADMONITION_TYPES[type].dashicon);
        });

        // Spot-check:
        expect(ICON_MAP.tip).toBe('lightbulb');
        expect(ICON_MAP.info).toBe('info');
    });

    it('TYPE_OPTIONS should be correctly formatted for the SelectControl', () => {
        const types = Object.keys(ADMONITION_TYPES);
        expect(TYPE_OPTIONS.length).toBe(types.length);

        // Check the structure and values
        TYPE_OPTIONS.forEach(option => {
            expect(option).toHaveProperty('label');
            expect(option).toHaveProperty('value');

            // Verify value matches a type key
            expect(types).toContain(option.value);

            // Verify label matches the type's label
            expect(option.label).toBe(ADMONITION_TYPES[option.value].label);
        });

        // Spot-check:
        const warningOption = TYPE_OPTIONS.find(opt => opt.value === 'warning');
        expect(warningOption.label).toBe(ADMONITION_TYPES.warning.label);
    });
});