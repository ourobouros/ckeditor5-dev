#!/usr/bin/env node

/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

require( '../packages/ckeditor5-dev-env' )
	.generateChangelogForSubPackages( {
		cwd: process.cwd(),
		packages: 'packages'
	} );
