/*
 * AD.util.string
 *
 * A set of utilities manipulating strings.
 *
 */

module.exports = {

    
    /**
     * @function replaceAll
     *
     * Replace all occurrences of replaceThis with withThis  inside the provided origString.
     *
     * NOTE: this returns a copy of the string.  origString is left as is.
     *
     * @codestart
     * var origString = 'Hello [name]. What is the Matrix, [name]?';
     * var replaceThis = '[name]';
     * withThis = 'Neo';
     *
     * var newString = AD.util.string.replaceAll(origString, replaceThis, withThis);
     *
     * console.log(origString);  // Hello [name]. What is the Matrix, [name]?
     * console.log(newString);  // Hello Neo. What is the Matrix, Neo?
     * @codeend
     *
     * @param  {string} origString the string to check
     * @return {bool}
     */
    replaceAll : function (origString, replaceThis, withThis) {
        var re = new RegExp(RegExpQuote(replaceThis),"g");
        return origString.replace(re, withThis);
    }


}




//----------------------------------------------------------------------------
// Helper Routines
//----------------------------------------------------------------------------





/**
 * @function RegExpQuote
 *
 * Prepare the given string to 
 *
 * @codestart
 * var origString = 'Hello [name]. What is the Matrix, [name]?';
 * var replaceThis = '[name]';
 * withThis = 'Neo';
 *
 * var newString = AD.util.string.replaceAll(origString, replaceThis, withThis);
 *
 * console.log(origString);  // Hello [name]. What is the Matrix, [name]?
 * console.log(newString);  // Hello Neo. What is the Matrix, Neo?
 * @codeend
 *
 * @param  {string} origString the string to check
 * @return {bool}
 */
RegExpQuote = function(str) {
     return str.replace(/([.?*+^$[\]\\(){}-])/g, "\\$1");
};






