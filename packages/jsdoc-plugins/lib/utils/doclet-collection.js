/**
 * @license Copyright (c) 2016-2017, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

'use strict';

/**
 * Collection of doclets as <String, Doclet[]> pairs. Also stores all doclets and their longnames as arrays.
 */
class DocletCollection {
	/**
	 * Creates collection of doclets.
	 */
	constructor() {
		this._data = {};
		this._allData = [];
		this._allLongnames = [];
	}

	/**
	 * Adds doclet to collection.
	 *
	 * @param {String} category
	 * @param {Doclet} doclet
	*/
	add( category, doclet ) {
		if ( !this._data[ category ] ) {
			this._data[ category ] = [];
		}

		this._data[ category ].push( doclet );
		this._allData.push( doclet );

		if ( doclet.longname ) {
			this._allLongnames.push( doclet.longname );
		}
	}

	/**
	 * Returns doclets filtered by category.
	 *
	 * @param {String} category
	 * @returns {Doclet[]}
	 */
	get( category ) {
		return this._data[ category ] || [];
	}

	/**
	 * Returns all doclets.
	 *
	 * @returns {Doclet[]}
	*/
	getAll() {
		return this._allData;
	}

	/**
	 * Returns all longnames.
	 *
	 * @returns {String[]}
	 */
	getAllLongnames() {
		return this._allLongnames;
	}
}

module.exports = DocletCollection;