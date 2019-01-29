/*
 * AD.log
 *
 * A set of utilities for printing to the console.
 *
 */
var colog = require('colog');
var cJSON = require('circular-json');
var util  = require('util');

var __silent = false;

const maxErrorLength = 500;
const maxLogLength = 0; // unlimited

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

    if (!__silent) {
        colog.format('    '+argsToString(arguments, maxLogLength));
    }
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
	Log('<red>*** '+argsToString(arguments, maxErrorLength)+'</red>');
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
    if (!__silent) {
        colog.format(argsToString(arguments));
    }
};



Log.silent = function(){
    __silent = true;
}





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
var argsToString = function (args, maxLength=0) {

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
			var item = cJSON.stringify(args[a],null, 4);
			if ((maxLength > 0) && (item.length > maxLength)) {
				  item = item.substring(0, maxLength) + '...';
			}
			all.push(item);
		} else if (typeof args[a] == 'string') {
			 var item = args[a];
			 if ((maxLength > 0) && (item.length > maxLength)) {
				 item = item.substring(0, maxLength) + '...';
			 }
			 all.push(item);
		} else {
			all.push(args[a]);
		}
	}

	return all.join('');
};


