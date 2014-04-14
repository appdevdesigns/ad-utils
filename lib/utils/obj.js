/*
 * AD.util.obj
 *
 * A set of utilities for objects.
 *
 */

module.exports = {

    /**
     * @function isEmpty
     *
     * returns True if a given object has no properties.
     *
     * NOTE: place holders will be the obj properties with a '[' & ']' around it.
     * @codestart
     * if (AD.utils.obj.isEmpty({})) {
     *    console.log('yep, empty!');
     * }
     * @codeend
     *
     * @param {object} obj  the object to test
     * @return {bool} true of obj has no properties, false otherwise.
     */
    isEmpty : function(obj) {
        for (var o in obj) {
            return false;
        }
        return true;
    },

};




//----------------------------------------------------------------------------
// Helper Routines
//----------------------------------------------------------------------------


