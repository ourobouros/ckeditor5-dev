/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

const chalk = require( 'chalk' );
const { logger } = require( '@ckeditor/ckeditor5-dev-utils' );
const utils = require( './transform-commit-utils' );

// A size of indent for a log. The number is equal to length of the log string:
// '* 1234567 ', where '1234567' is a short commit id.
const INDENT_SIZE = 10;

/**
 * Parses a single commit:
 *   - displays a log when the commit has invalid format of the message,
 *   - filters out the commit if it should not be visible in the changelog,
 *   - makes links to issues and organizations on GitHub.
 *
 * @param {Commit} commit
 * @param {Object} context
 * @param {Boolean} context.displayLogs Whether to display the logs.
 * @param {Boolean} [context.returnInvalidCommit=false] Whether invalid commit should be returned.
 * @param {Object} context.packageData Content from the 'package.json' for given package.
 * @returns {Commit}
 */
module.exports = function transformCommitForSubRepository( commit, context ) {
	const log = logger( context.displayLogs ? 'info' : 'error' );

	const hasCorrectType = utils.availableCommitTypes.has( commit.type );
	const isCommitIncluded = utils.availableCommitTypes.get( commit.type );

	// Our merge commit always contains two lines:
	// Merge ...
	// Prefix: Subject of the changes.
	// Unfortunately, merge commit made by Git does not contain the second line.
	// Because of that hash of the commit is parsed as a body and the changelog will crash.
	// See: https://github.com/ckeditor/ckeditor5-dev/issues/276.
	if ( commit.merge && !commit.hash ) {
		commit.hash = commit.body;
		commit.header = commit.merge;
		commit.body = null;
	}

	if ( typeof commit.hash === 'string' ) {
		commit.hash = commit.hash.substring( 0, 7 );
	}

	let logMessage = `* ${ chalk.yellow( commit.hash ) } "${ utils.truncate( commit.header, 100 ) }" `;

	if ( hasCorrectType && isCommitIncluded ) {
		logMessage += chalk.green( 'INCLUDED' );
	} else if ( hasCorrectType && !isCommitIncluded ) {
		logMessage += chalk.grey( 'SKIPPED' );
	} else {
		logMessage += chalk.red( 'INVALID' );
	}

	// Avoid displaying commit merge twice.
	if ( commit.merge && commit.merge !== commit.header ) {
		logMessage += `\n${ ' '.repeat( INDENT_SIZE ) }${ commit.merge }`;
	}

	log.info( logMessage );

	if ( !isCommitIncluded ) {
		return context.returnInvalidCommit ? commit : undefined;
	}

	// Remove [skip ci] from the commit subject.
	commit.subject = commit.subject.replace( /\[skip ci\]/, '' ).trim();

	// If a dot is missing at the end of the subject...
	if ( !commit.subject.endsWith( '.' ) ) {
		// ...let's add it.
		commit.subject += '.';
	}

	commit.rawType = commit.type;
	commit.type = utils.getCommitType( commit.type );

	if ( typeof commit.subject === 'string' ) {
		commit.subject = makeLinks( commit.subject );
	}

	// Remove additional notes from commit's footer.
	// Additional notes are added to footer. In order to avoid duplication, they should be removed.
	if ( commit.footer && commit.notes.length ) {
		commit.footer = commit.footer.split( '\n' )
			.filter( footerLine => {
				// For each footer line checks whether the line starts with note prefix ("NOTE": ...).
				// If so, this footer line should be removed.
				return !commit.notes.some( note => footerLine.startsWith( note.title ) );
			} )
			.join( '\n' )
			.trim();
	}

	if ( commit.footer && !commit.body ) {
		commit.body = commit.footer;
		commit.footer = null;
	}

	if ( typeof commit.body === 'string' ) {
		commit.body = commit.body.split( '\n' )
			.map( line => {
				if ( !line.length ) {
					return '';
				}

				return '  ' + line;
			} )
			.join( '\n' );

		commit.body = makeLinks( commit.body );
	}

	for ( const note of commit.notes ) {
		if ( note.title === 'BREAKING CHANGE' ) {
			note.title = 'BREAKING CHANGES';
		}

		note.text = makeLinks( note.text );
	}

	// Clear the references array - we don't want to hoist the issues.
	delete commit.references;

	return commit;
};

function makeLinks( comment ) {
	comment = utils.linkToGithubIssue( comment );
	comment = utils.linkToGithubUser( comment );

	return comment;
}

/**
 * @typedef {Object} Commit
 *
 * @property {String} [type] Type of the commit.
 *
 * @property {String} [subject] Subject of the commit.
 *
 * @property {String} [header] First line of the commit message.
 *
 * @property {String|null} [body] Body of the commit message.
 *
 * @property {String|null} [footer] Footer of the commit message.
 *
 * @property {Array.<CommitNote>} [notes] Notes for the commit.
 *
 * @property {String} [hash] The commit SHA-1 id.
 *
 */
/**
 * @typedef {Object} CommitNote
 *
 * @property {String} [title] Type of the note.
 *
 * @property {String} [text] Text of the note.
 */
