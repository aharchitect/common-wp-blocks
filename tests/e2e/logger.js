// Simple pino logger instance for E2E tests
const pino = require( 'pino' );
const path = require( 'path' );
const fs = require( 'fs' );

// Ensure logs directory exists
const logDir = path.resolve( __dirname, '../../logs' );
if ( ! fs.existsSync( logDir ) ) {
	fs.mkdirSync( logDir );
}

const logger = pino( {
	level: 'info',
	transport: {
		target: 'pino/file',
		options: { destination: path.join( logDir, 'e2e.log' ) },
	},
} );

module.exports = logger;
