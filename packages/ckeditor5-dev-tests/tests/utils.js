/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* global describe, it, beforeEach, afterEach */

'use strict';

const path = require( 'path' );
const fs = require( 'fs-extra' );
const glob = require( 'glob' );
const sinon = require( 'sinon' );
const chai = require( 'chai' );
const expect = chai.expect;
const should = chai.should();
const proxyquire = require( 'proxyquire' );

describe( 'utils', () => {
	let sandbox, clock, utils, infoSpy, errorSpy;

	beforeEach( () => {
		sandbox = sinon.sandbox.create();
		clock = sinon.useFakeTimers();

		utils = proxyquire( '../lib/utils', {
			'@ckeditor/ckeditor5-dev-utils': {
				logger: () => {
					infoSpy = sandbox.spy();
					errorSpy = sandbox.spy();

					return {
						info: infoSpy,
						error: errorSpy
					};
				}
			}
		} );
	} );

	afterEach( () => {
		clock.restore();
		sandbox.restore();
	} );

	describe( '_getKarmaConfig()', () => {
		it( 'throws an error when files were not specified', () => {
			expect( () => {
				utils._getKarmaConfig( {} );
			} ).to.throw( Error, 'Karma requires files to tests. `options.files` has to be non-empty array.' );

			expect( () => {
				utils._getKarmaConfig( { files: [] } );
			} ).to.throw( Error, 'Karma requires files to tests. `options.files` has to be non-empty array.' );
		} );

		it( 'transforms specified test files to the Karma configuration', () => {
			const webpackConfigStub = sandbox.stub( utils, '_getWebpackConfig' );
			const karmaConfig = utils._getKarmaConfig( {
				sourcePath: __dirname,
				files: [
					'basic-styles',
					'engine/view',
					'core/*.js',
					'paragraph/paragraph.js'
				]
			} );

			expect( webpackConfigStub.calledOnce ).to.equal( true );
			expect( karmaConfig.files ).to.deep.equal( [
				path.join( 'tests', 'basic-styles', '**', '*.js' ),
				path.join( 'tests', 'engine', 'view', '**', '*.js' ),
				path.join( 'tests', 'core', '*.js' ),
				path.join( 'tests', 'paragraph', 'paragraph.js' ),
			] );
		} );

		it( 'generates the coverage for sources', () => {
			const webpackConfigStub = sandbox.stub( utils, '_getWebpackConfig' );
			const karmaConfig = utils._getKarmaConfig( {
				sourcePath: __dirname,
				coverage: true,
				files: [
					'basic-styles'
				]
			} );

			expect( webpackConfigStub.calledOnce ).to.equal( true );
			expect( karmaConfig.reporters ).to.contain( 'coverage' );
		} );

		it( 'runs Karma with the watcher', () => {
			const webpackConfigStub = sandbox.stub( utils, '_getWebpackConfig' );
			const karmaConfig = utils._getKarmaConfig( {
				sourcePath: __dirname,
				watch: true,
				files: [
					'basic-styles'
				]
			} );

			expect( webpackConfigStub.calledOnce ).to.equal( true );
			expect( karmaConfig.autoWatch ).to.equal( true );
			expect( karmaConfig.singleRun ).to.equal( false );
		} );
	} );

	describe( '_getWebpackConfig()', () => {
		let defaultExcludes = [
			/\/(node_modules|tests|theme|lib)\//
		];

		it( 'generates the coverage for specified sources', () => {
			const readdirStub = sandbox.stub( fs, 'readdirSync' ).returns( [
				'engine',
				'basic-styles',
				'core',
				'paragraph'
			] );

			const webpackConfig = utils._getWebpackConfig( {
				sourcePath: __dirname,
				coverage: true,
				files: [
					'engine',
					'paragraph'
				]
			} );

			expect( readdirStub.calledOnce ).to.equal( true );
			expect( readdirStub.firstCall.args[ 0 ] ).to.equal( path.join( __dirname, 'ckeditor5' ) );

			const preLoaders = webpackConfig.module.preLoaders;

			expect( preLoaders.length ).to.equal( 2 );
			expect( preLoaders[ 1 ].exclude ).to.deep.equal( [
				/ckeditor5\/basic-styles/,
				/ckeditor5\/core/
			].concat( defaultExcludes ) );
		} );

		it( 'generates the coverage for all files when sources are not specified', () => {
			const readdirStub = sandbox.stub( fs, 'readdirSync' ).returns( [
				'engine',
				'basic-styles',
				'core',
				'paragraph'
			] );

			const webpackConfig = utils._getWebpackConfig( {
				sourcePath: __dirname,
				coverage: true
			} );

			expect( readdirStub.calledOnce ).to.equal( false );

			const preLoaders = webpackConfig.module.preLoaders;

			expect( preLoaders.length ).to.equal( 2 );
			expect( preLoaders[ 1 ].exclude ).to.deep.equal( defaultExcludes );
		} );
	} );

	describe( 'getPackageName()', () => {
		it( 'returns package name from current work directory', () => {
			expect( utils.getPackageName() ).to.equal( 'dev-tests' );
		} );

		it( 'returns package name from specify work directory', () => {
			const cwd = path.resolve( __dirname, '_stubs', 'basic-styles' );

			expect( utils.getPackageName( cwd ) ).to.equal( 'basic-styles' );
		} );

		it( 'throws an error when the "package.json" file does not exist', () => {
			const packageJsonPath = path.resolve( __dirname, 'package.json' );

			expect( () => {
				utils.getPackageName( __dirname );
			} ).to.throw( Error, `Cannot find module '${ packageJsonPath }'` );
		} );

		it( 'throws an error when package name cannot be resolved', () => {
			expect( () => {
				const cwd = path.resolve( __dirname, '_stubs', 'invalid' );

				utils.getPackageName( cwd );
			} ).to.throw( Error, 'The package name does not start with a "ckeditor5-".' );
		} );

		it( 'returns temporary implementation of the UI package', () => {
			const cwd = path.resolve( __dirname, '_stubs', 'ui-default' );

			expect( utils.getPackageName( cwd ) ).to.equal( 'ui' );
		} );
	} );

	describe( 'parseArguments()', () => {
		it( 'returns an object with default values', () => {
			const args = utils.parseArguments();

			// Checks the parameters.
			expect( args.files ).to.deep.equal( [] );
			expect( args.browsers ).to.deep.equal( [ 'Chrome' ] );
			expect( args.watch ).to.equal( false );
			expect( args.coverage ).to.equal( false );
			expect( args.verbose ).to.equal( false );
			expect( args[ 'source-map' ] ).to.equal( false );
			expect( args[ 'ignore-duplicates' ] ).to.equal( false );

			// Check the aliases.
			expect( args.c ).to.equal( args.coverage );
			expect( args.w ).to.equal( args.watch );
			expect( args.v ).to.equal( args.verbose );
			expect( args.s ).to.equal( args[ 'source-map' ] );
			expect( args.sourceMap ).to.equal( args[ 'source-map' ] );
			expect( args.ignoreDuplicates ).to.equal( args[ 'ignore-duplicates' ] );
		} );
	} );

	describe( '_getManualTestPaths()', () => {
		it( 'returns paths to all manual scripts', () => {
			sandbox.stub( utils, '_getPlatform' ).returns( 'linux' );
			sandbox.stub( utils, '_getDirectorySeparator' ).returns( '/' );

			const sourcePath = '/Users/ckeditor5';

			const globSyncStub = sandbox.stub( glob, 'sync' ).returns( [
				[ sourcePath, 'tests', 'package', 'manual', 'manual-test.js' ].join( '/' ),
				[ sourcePath, 'tests', 'foo', 'manual', 'test-manual.js' ].join( '/' ),
				[ sourcePath, 'tests', 'bar', 'view', 'manual', 'name-of-test.js' ].join( '/' )
			] );

			const pathsToTests = [
				[ 'tests', 'package', 'manual', 'manual-test.js' ].join( '/' ),
				[ 'tests', 'foo', 'manual', 'test-manual.js' ].join( '/' ),
				[ 'tests', 'bar', 'view', 'manual', 'name-of-test.js' ].join( '/' )
			];

			expect( utils._getManualTestPaths( sourcePath ) ).to.deep.equal( pathsToTests );
			expect( globSyncStub.calledOnce ).to.equal( true );
			expect( globSyncStub.firstCall.args[ 0 ] ).to.equal( [ '', 'Users', 'ckeditor5', 'tests', '**', 'manual', '**', '*.js' ].join( '/' ) );
		} );

		it( 'returns correct paths to manual scripts on Windows', () => {
			const sourcePath = 'C:\\ckeditor5';

			sandbox.stub( utils, '_getPlatform' ).returns( 'win32' );
			sandbox.stub( utils, '_getDirectorySeparator' ).returns( '\\' );

			const globSyncStub = sandbox.stub( glob, 'sync' ).returns( [
				[ sourcePath, 'tests', 'package', 'manual', 'manual-test.js' ].join( '/' ),
				[ sourcePath, 'tests', 'foo', 'manual', 'test-manual.js' ].join( '/' ),
				[ sourcePath, 'tests', 'bar', 'view', 'manual', 'name-of-test.js' ].join( '/' )
			] );

			const pathsToTests = [
				[ 'tests', 'package', 'manual', 'manual-test.js' ].join( '\\' ),
				[ 'tests', 'foo', 'manual', 'test-manual.js' ].join( '\\' ),
				[ 'tests', 'bar', 'view', 'manual', 'name-of-test.js' ].join( '\\' )
			];

			expect( utils._getManualTestPaths( sourcePath ) ).to.deep.equal( pathsToTests );
			expect( globSyncStub.calledOnce ).to.equal( true );
			expect( globSyncStub.firstCall.args[ 0 ] ).to.equal( [ 'C:', 'ckeditor5', 'tests', '**', 'manual', '**', '*.js' ].join( '/' ) );
		} );
	} );

	describe( '_cleanManualTestPath()', () => {
		it( 'returns a cleaned path', () => {
			const sep = utils._getDirectorySeparator();

			expect(
				utils._cleanManualTestPath( [ '..', 'tests', 'package', 'manual', 'ticket', '1.js' ] .join( sep ) )
			).to.equal( [ '..', 'tests', 'package', 'ticket', '1.js' ].join( sep ) );

			expect(
				utils._cleanManualTestPath( [ '..', 'tests', 'package', 'ticket', '1.js' ].join( sep ) )
			).to.equal( [ '..', 'tests', 'package', 'ticket', '1.js' ].join( sep ) );
		} );
	} );

	describe( '_getWebpackEntriesForManualTests()', () => {
		it( 'returns an object with destination and input paths', () => {
			const sourcePath = path.resolve( '.' );
			const manualTestPaths = [
				path.join( 'tests', 'foo', 'manual', 'test-manual.js' ),
				path.join( 'tests', 'bar', 'manual', 'name-of-test.js' )
			];

			const manualTestPathsStub = sandbox.stub( utils, '_getManualTestPaths' ).returns( manualTestPaths );

			expect( utils._getWebpackEntriesForManualTests( sourcePath ) ).to.deep.equal( {
				[ path.join( 'tests', 'foo', 'test-manual.js' )]: manualTestPaths[ 0 ],
				[ path.join( 'tests', 'bar', 'name-of-test.js' )]: manualTestPaths[ 1 ]
			} );
			expect( manualTestPathsStub.calledOnce ).to.equal( true );
			expect( manualTestPathsStub.firstCall.args[ 0 ] ).to.equal( sourcePath );
		} );
	} );

	describe( '_watchFiles()', () => {
		it( 'attaches the watcher', () => {
			const fsWatchStub = sandbox.stub( fs, 'watch' );

			utils._watchFiles( [ 'path-1', 'path-2' ], sandbox.spy() );

			expect( fsWatchStub.calledTwice ).to.equal( true );
			expect( fsWatchStub.firstCall.args[ 0 ] ).to.equal( 'path-1' );
			expect( fsWatchStub.firstCall.args[ 1 ] ).to.be.a( 'function' );
			expect( fsWatchStub.secondCall.args[ 0 ] ).to.equal( 'path-2' );
			expect( fsWatchStub.secondCall.args[ 1 ] ).to.be.a( 'function' );
		} );

		it( 'calls handler function with delay after last change', () => {
			// Functions used as a handler in `fs.watch( file, handler )`.
			let handlerForFirstPath, handlerForSecondPath;

			// Function which does something with file when was changed.
			const functionToCall = sandbox.spy();

			sandbox.stub( fs, 'watch', ( pathToFile, handler ) => {
				if ( handlerForFirstPath ) {
					handlerForSecondPath = handler;

					// Checks whether the watcher handler are the same for both files.
					expect( handlerForFirstPath.toString() ).is.equal( handlerForSecondPath.toString() );
				} else {
					handlerForFirstPath = handler;
				}
			} );

			utils._watchFiles( [ 'path-1', 'path-2' ], functionToCall );

			should.exist( handlerForFirstPath );
			should.exist( handlerForSecondPath );

			// At the beginning, a function should not be called.
			expect( functionToCall.callCount ).to.equal( 0 );

			// Simulates a change in file 'path-1'.
			handlerForFirstPath();
			clock.tick( 520 ); // time: 520

			expect( functionToCall.callCount ).to.equal( 1 );
			expect( functionToCall.getCall( 0 ).args[ 0 ] ).to.equal( 'path-1' );

			// Simulates a change in file `path-2`.
			handlerForSecondPath();
			clock.tick( 400 ); // time: 920

			// The function should not be called because it has to wait 500ms.
			expect( functionToCall.callCount ).to.equal( 1 );

			// Simulates a change in file `path-1` again. It starts the timer from 0.
			handlerForFirstPath();
			clock.tick( 220 ); // time: 1140

			// The function should not be called.
			expect( functionToCall.callCount ).to.equal( 1 );

			// No additional changes in files. The function should be called.
			clock.tick( 520 ); // time: 1660

			expect( functionToCall.callCount ).to.equal( 2 );
			expect( functionToCall.getCall( 1 ).args[ 0 ] ).to.equal( 'path-1' );

			// Checks whether the second handler works proper.
			handlerForSecondPath();
			clock.tick( 520 ); // time: 2180
			expect( functionToCall.callCount ).to.equal( 3 );
			expect( functionToCall.getCall( 2 ).args[ 0 ] ).to.equal( 'path-2' );

			// After all changes handler shouldn't be called.
			clock.tick( 820 ); // time: 3000
			expect( functionToCall.callCount ).to.equal( 3 );
		} );
	} );

	describe( '_compileView()', () => {
		let sourcePath, outputPath, mdFilePath, htmlFilePath, template;

		beforeEach( () => {
			sourcePath = path.resolve( '.' );
			outputPath = path.join( sourcePath, '.output' );
			mdFilePath = path.join( sourcePath, 'manual', 'test.md' );
			htmlFilePath = path.join( sourcePath, 'manual', 'test.html' );

			template = `<html><head></head><body></body></html>`;
		} );

		it( 'saves the file and resolves a Promise', () => {
			const readFileSyncStub = sandbox.stub( fs, 'readFileSync' );
			readFileSyncStub.withArgs( mdFilePath ).returns( `# Some header\nTest description.` );
			readFileSyncStub.withArgs( htmlFilePath ).returns( '<div>Hello world!</div>' );

			const outputSync = sandbox.stub( fs, 'outputFileSync', ( pathToSave, content ) => {
				const compiledManualTest =
`<html><head></head><body class="manual-test-container"><div class="manual-test-sidebar"><h1>Some header</h1>
<p>Test description.</p>
</div><div>Hello world!</div><script src="./test.js"></script></body></html>`;

				expect( pathToSave ).to.equal( path.join( outputPath, 'test.html' ) );
				expect( content ).to.equal( compiledManualTest );
			} );

			utils._compileView( sourcePath, outputPath, mdFilePath, template );

			expect( outputSync.calledOnce ).to.equal( true );
			expect( readFileSyncStub.calledTwice ).to.equal( true );
			expect( infoSpy.calledTwice ).to.equal( true );
		} );
	} );

	describe( '_getPlatform()', () => {
		it( 'returns a platform', () => {
			expect( utils._getPlatform() ).to.equal( process.platform );
		} );
	} );

	describe( '_getDirectorySeparator()', () => {
		it( 'returns a separator', () => {
			expect( utils._getDirectorySeparator() ).to.equal( path.sep );
		} );
	} );
} );
