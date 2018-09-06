#!/usr/bin/env node

/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const cwd = process.cwd();
const lerna = path.resolve( cwd, 'lerna.json' );

const json = {
	packages: [
		'packages/*',
		'.'
	],
	hoist: true,
	nohoist: 'husky',
	command: {
		bootstrap: {
			concurrency: 1
		}
	},
	version: '0.0.0'
};

fs.writeFileSync( lerna, JSON.stringify( json, null, 2 ) + '\n', 'utf-8' );
