/*
 * AD.util.fs
 *
 * A set of utilities for file system.
 *
 */
var fs   = require('fs');
var path = require('path');

module.exports = {


    /**
     * @function AD.util.fs.moveToDirUP
     *
     * attempt to move to a directory that looks like the provided checks object.
     *
     * if we are able to move to that directory, we return true.  Otherwise
     * we return false.
     *
     * @param {object} checks   the description of the directory
     *                          {
     *                              fileName:1, // fileName exists in directory
     *                              dirName:0   // dirName !exists in directory
     *                          }
     * @param {integer} limit   a limit to the number of directories to traverse up
     * @param {integer} current how many times have we done this already.
     * @return {bool}  did we move to the directory?
     */
     moveToDirUP: function( checks, limit, current ) {


            // some sanity checks here ...
            limit = limit || 20;
            current = current || 0;

            // where are we at now?
            var currDir = process.cwd();

            // if we are at filesystem root,  or have passed our limit
            if (currDir == path.sep || current >= limit) {

                // exit with error!

                var str = 'could not move to desired directory';
                if (current >= limit) str += ' after '+current+'attempts.';
                AD.log.error(str);
                return false;
            }

            // if we didn't find our searchfor file in our current directory
            if (!this.looksLikeDir(checks, currDir)) {

                // move up a level
                process.chdir('..');
                return this.moveToDirUP(checks, limit, current+1);

            } else {

                // HEY!  found it.
                return true;
            }

    },


    /**
     * @function AD.util.fs.looksLikeDir
     *
     * returns true if current path looks like the given checks description.
     * returns false otherwise.
     *
     * @param {object} checks   the description of the directory
     *                          {
     *                              fileName:1, // fileName exists in directory
     *                              dirName:0   // dirName !exists in directory
     *                          }
     * @param {string} currPath the path to examine
     * @return {bool}  does the current directory pass all checks.
     */
    looksLikeDir : function( checks, currPath ) {

        var isDir = true;

        for (var k in checks) {

            var check = path.join(currPath, k);
    //console.log('  .check:'+check);
            if (checks[k]) {
                // this is supposed to be here
                if (!fs.existsSync(check)) {
                    isDir = false;
                }
            } else {
                // this is not supposed to be here
                if (fs.existsSync(check)) {
                    isDir = false;
                }
            }
        }

    //console.log('  .isRoot = '+isRoot);

        return isDir;


    },




};




//----------------------------------------------------------------------------
// Helper Routines
//----------------------------------------------------------------------------


