/*
 * AD.util.clone
 *
 * creates a clone of an object.
 *
 */

module.exports = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};
