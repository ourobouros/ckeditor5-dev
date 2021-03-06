/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

'use strict';

const addMissingEventDocletsForObservables = require( './addmissingeventdocletsforobservables' );

module.exports = {
	handlers: {
		processingComplete( e ) {
			e.doclets = addMissingEventDocletsForObservables( e.doclets );
		}
	}
};
