const path = require('path');
const configDir = 'node_modules/@wordpress/scripts/config';

module.exports = {
    // Set the environment to simulate a browser
    testEnvironment: 'jsdom',

    // 1. Resolve @wordpress packages (Crucial for Edit.js mocks)
    moduleNameMapper: {
        // The regex pattern is correct, but we need to ensure the target path uses
        // path.resolve() and uses the forward slash notation for $1, which is safer.
        // We ensure we map the module name to the correct node_modules folder.
        '^@wordpress/(.*)$': path.resolve(__dirname, 'node_modules/@wordpress/$1'),
    },

    // 2. Transformation (Fixes "Cannot use import statement")
    // We explicitly tell Jest to use the internal babel-transform.js file that wp-scripts relies on.
    transform: {
        '^.+\\.[jt]sx?$': path.join('<rootDir>', configDir, 'babel-transform.js'),
        // Use the standard asset transformer for any of the file types above
        '\\.(css|scss|less|svg|png|jpg|gif)$': 'jest-transform-stub',
    },

    // 3. Transformation Ignore Patterns (Prevents Jest from ignoring modern JS in @wordpress packages)
    transformIgnorePatterns: [
        // Ensure only files outside of @wordpress are ignored for transformation
        '/node_modules/(?!@wordpress/).+\\.js$',
    ],

    // 4. Setup File (Removes non-existent file)
    // The previously referenced 'setupFilesAfterEnv' must be removed since 'setup-tests.js' is confirmed missing.
    // However, if you need a setup file for global mocks, you would point it here:
    // setupFilesAfterEnv: [], // Keep this array empty or remove the property entirely.
};