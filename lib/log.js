/*
 * AD.log
 *
 * A set of utilities for printing to the console.
 *
 */
var colog = require('colog');
var cJSON = require('circular-json');
var util  = require('util');


/**
 * @function AD.log
 *
 * print out a log entry on the console.  This is a wrapper around colog
 * which enables colored output.
 *
 * @codestart
 *
 * AD.log('<red><bold>Error!</bold>  That didn\'t go well!</red>'
 *         + '<yellow> but this is in yellow. </yellow>');
 * @codeend
 *
 *
 */
var Log = function() {

    colog.format('    '+argsToString(arguments));
};

module.exports = Log;




/**
 * @function AD.log.error
 *
 * a default error log entry. auto formats the entry with red text.
 *
 * @codestart
 *
 * AD.log.error('<bold>Error!</bold>  That didn\'t go well!');
 * @codeend
 *
 *
 */
Log.error = function() {
    Log('<red>*** '+argsToString(arguments)+'</red>');
};




/**
 * @function AD.log.raw
 *
 * just print the data without our spacing.
 *
 * @codestart
 *
 * AD.log.raw('<bold>Error!</bold>  That didn\'t go well!');
 * @codeend
 *
 *
 */
Log.raw = function() {

    colog.format(argsToString(arguments));
};





//----------------------------------------------------------------------------
// Helper Routines
//----------------------------------------------------------------------------





/**
 * @function argsToString
 *
 * a helper fn designed to give better (deeper) object dumping display,
 * than the standard console.log()
 *
 * @codestart
 * AD.log.error('<bold>Error!</bold>  That didn\'t go well!');
 * @codeend
 */
var argsToString = function (args) {

    var all = [];
    for (var a in args) {

    	if (typeof args[a] == 'undefined') {
    		all.push('undefined');
        } else if (util.isError(args[a])) {

            var err = args[a];
            var obj = {};
            obj.message = err.message;
            obj.stack = [];
            if (err.stack) {
                obj.stack = err.stack.split('\n');
            } 
            for (var e in err) {
                obj[e] = err[e];
            }

            all.push(cJSON.stringify(obj,null, 4));

    	} else if (typeof args[a] == 'object') {
    		all.push(cJSON.stringify(args[a],null, 4));
        } else {
        	all.push(args[a]);
        }
    }

    return all.join('');
};


