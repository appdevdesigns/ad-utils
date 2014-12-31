/*
 * AD.util.string
 *
 * A set of utilities manipulating strings.
 *
 */

module.exports = {

    /**
     * @function render
     *
     * Treat the given string as a template, that has placeholders to be filled
     * by the given obj properties.
     *
     * NOTE: place holders will be the obj properties with a '[' & ']' around it.
     * @codestart
     * var data = { name:'myModule', id:1 };
     * var template = '/module/[name]/[id]';
     * var actual = AD.Util.String.render(template, data);
     * // actual == '/module/myModule/1'
     * @codeend
     *
     * @param {string} template string with placeholders
     * @param {object} obj  template data
     * @param {string} tagOpen  the template tag opening (default: '[')
     * @param {string} tagClose the closing template tag (default: ']')
     * @return {string} template with given data replaced
     */
    render : function(template, obj, tagOpen, tagClose) {

        if (tagOpen === undefined) tagOpen = '[';
        if (tagClose === undefined) tagClose = ']';

        for (var o in obj) {
            var key = tagOpen+o+tagClose;
            template = this.replaceAll(template, key, obj[o]); //orig.replace('['+o+']', obj[o]);
        }
        return template;
    },



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
    },


    /**
    * @function uCase
    * 
    * Uppercase the first character in a string.
    *
    * @codestart
    *
    * @codeend
    *
    * @param {string} str   The string to uppercase
    * @return {string}
    */
    uCase: function(str){
        return str.charAt(0).toUpperCase() + str.substring(1);
    }


}




//----------------------------------------------------------------------------
// Helper Routines
//----------------------------------------------------------------------------





/**
 * @function RegExpQuote
 *
 * Replace any special RegExp characters with '\'+char.
 *
 * @param  {string} origString the string to check
 * @return {bool}
 */
RegExpQuote = function(str) {
     return str.replace(/([.?*+^$[\]\\(){}-])/g, "\\$1");
};






