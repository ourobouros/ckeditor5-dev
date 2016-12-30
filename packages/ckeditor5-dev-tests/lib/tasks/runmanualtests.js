/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint node: true, strict: true */

'use strict';

const path = require( 'path' );
const { logger } = require( '@ckeditor/ckeditor5-dev-utils' );
const webpack = require( 'webpack' );
const globSync = require( '../utils/glob' );
const createManualTestServer = require( '../utils/createmanualtestserver' );
const fs = require( 'fs-extra' );
const gutil = require( 'gulp-util' );
const commonmark = require( 'commonmark' );
const combine = require( 'dom-combiner' );
const getWebpackConfigForManualTests = require( '../utils/getwebpackconfigformanualtests' );

const reader = new commonmark.Parser();
const writer = new commonmark.HtmlRenderer();

/**
 * Main function that runs automated tests.
 *
 * @returns {Promise}
 */
module.exports = function runManualTests() {
	const buildDir = path.join( process.cwd(), 'build', '.manual-tests' );
	const manualTestPattern = path.join( process.cwd(), 'node_modules', 'ckeditor5-*', 'tests', '**', 'manual' );

	return Promise.all( [
		compileScripts( buildDir, manualTestPattern ),
		compileViews( buildDir, manualTestPattern )
	] )
	.then( () => createManualTestServer( buildDir ) );
};

function compileScripts( buildDir, manualTestPattern ) {
	const entryFiles = globSync( path.join( manualTestPattern, '**', '*.js' ) );
	const names = entryFiles.map( file => getName( file ) );
	const entryObject = createEntryObject( names, entryFiles );
	const webpackConfig = getWebpackConfigForManualTests( entryObject, buildDir );

	return runWebpack( webpackConfig, buildDir );
}

function createEntryObject( names, entryFiles ) {
	const entryObject = {};

	for ( let i = 0; i < names.length; i++ ) {
		entryObject[ names[ i ] ] = entryFiles[ i ];
	}

	return entryObject;
}

function compileViews( buildDir, manualTestPattern ) {
	const sourceFiles = globSync( path.join( manualTestPattern, '*.md' ) ).map( file => ( {
		dir: path.dirname( file ),
		fileName: getName( file )
	} ) );
	const viewTemplate = fs.readFileSync( path.join( __dirname, '..', 'utils', 'template.html' ), 'utf-8' );

	fs.ensureDirSync( buildDir );

	for ( const source of sourceFiles ) {
		// TODO - watchers
		compileView( buildDir, source, viewTemplate );
		copyStaticFiles( buildDir, source );
	}
}

function compileView( buildDir, source, viewTemplate ) {
	const log = logger();
	const pathWithoutExtension = path.join( source.dir, source.fileName );

	log.info( `Processing '${ gutil.colors.cyan( pathWithoutExtension ) }'...` );

	// Compile test instruction (Markdown file).
	const parsedMarkdownTree = reader.parse( fs.readFileSync( `${ pathWithoutExtension }.md`, 'utf-8' ) );
	const manualTestInstructions = '<div class="manual-test-sidebar">' + writer.render( parsedMarkdownTree ) + '</div>';

	// Load test view (HTML file).
	const htmlView = fs.readFileSync( `${ pathWithoutExtension }.html`, 'utf-8' );

	// Attach script file to the view.
	const scriptTag = `<body class="manual-test-container"><script src="./${ path.basename( pathWithoutExtension ) }.js"></script></body>`;

	// Concat the all HTML parts to single one.
	const preparedHtml = combine( viewTemplate, manualTestInstructions, htmlView, scriptTag );

	// Prepare output path.
	const outputFilePath = path.join( buildDir, source.fileName, source.fileName + '.html' );

	fs.outputFileSync( outputFilePath, preparedHtml );

	log.info( `Finished writing '${ gutil.colors.cyan( outputFilePath ) }'` );
}

function copyStaticFiles( buildDir, source ) {
	const files = globSync( path.join( source.dir, '*.png' ) );

	for ( const file of files ) {
		const outputFilePath = path.join( buildDir, source.fileName, file.split( '/' ).pop() );
		fs.copySync( file, outputFilePath );
	}
}

function getName( src ) {
	return path.parse( src ).name;
}

/**
 * @returns {Promise}
 */
function runWebpack( webpackConfig ) {
	return new Promise( ( resolve, reject ) => {
		webpack( webpackConfig, ( err ) => {
			if ( err ) {
				reject( err );
			} else {
				resolve();
			}
		} );
	} );
}