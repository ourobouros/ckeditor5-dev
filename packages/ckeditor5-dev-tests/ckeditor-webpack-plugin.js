/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

const resolveImportPathInContext = require( './compiler-utils/resolveimportpathincontext' );
const getWorkspaceRelativePathInfo = require( './compiler-utils/getworkspacerelativepathinfo' );
const path = require( 'path' );

module.exports = class CKEditorWebpackPlugin {
	/**
	 * @param {Object} [options]
	 * @param {Array.<String>} [options.packages] Array of directories where packages will be looking for
	 */
	constructor( options = {} ) {
		this.options = options;
	}

	apply( compiler ) {
		const packagePaths = this.options.packages;

		if ( !packagePaths || packagePaths.length === 0 ) {
			return;
		}

		compiler.plugin( 'after-resolvers', ( compiler ) => {
			compiler.resolvers.normal.plugin( 'before-resolve', ( obj, done ) => {
				const requestPackageName = getWorkspaceRelativePathInfo( obj.request ).packageName;

				let resolvedPath;

				for ( let contextPackagePath of packagePaths ) {
					const chunks = contextPackagePath.split( path.sep );

					// current request package is the main package
					if ( chunks[ chunks.length - 1 ] === requestPackageName ) {
						contextPackagePath = chunks.slice( 0, -1 ).join( path.sep );
					}

					resolvedPath = resolveImportPathInContext( obj.context.issuer, obj.request, contextPackagePath );
				}

				if ( resolvedPath ) {
					obj.path = resolvedPath.modulesPath;
					obj.request = path.join( '.', resolvedPath.packageName, resolvedPath.filePath );
				}

				done();
			} );
		} );
	}
};
