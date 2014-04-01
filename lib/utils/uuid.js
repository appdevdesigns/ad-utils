/*
 * AD.util.uuid
 *
 * creates a UUID.
 *
 */
var uuid = require('node-uuid');


module.exports = function() {
    return uuid.v4();
}

