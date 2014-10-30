/**
 * AD.sal
 *
 * A set of software methods that abstract away the underlying software libraries
 * used to perform the action.  (useful for providing a common programming library
 * across different environments: web using jQuery, server using nodeJS, phonegap, etc..)
 *
 *
 */


var request = require('request');
var $ = require('jquery-deferred');


var SAL = {};
module.exports = SAL;



//--------------------------------------------------------------------------
/*
 * return a deferred or a promise.
 */
SAL.Deferred = function() {
    return $.Deferred();
};



//--------------------------------------------------------------------------
/*
 * extend an object
 */
SAL.extend = $.extend;



//--------------------------------------------------------------------------
/*
 * use this for making http requests
 */
SAL.http = function (args) {
    var dfd = $.Deferred();
//console.log('AD.sal.http(): ');
    // Map jQuery.ajax() args into request() equivalents
    var method = args.method || args.type;
    method = method.toUpperCase();

    var body, qs, form;

    var opts = {
        uri: args.url,
        method: method,
        followRedirect:true ,
        jar: true
    };

    // use the provided cookie jar
    if (args.jar) {
        opts.jar = args.jar;
    }

    // figure out where the data goes:
    if ((args.contentType == 'application/json')
        && (typeof args.data != 'undefined')) {
        opts.json = JSON.parse(args.data);
    } else if (method == 'GET' || method == 'HEAD') {
        opts.qs = args.data;
    } else if (typeof args.data == 'string') {
        opts.body = args.data;
    } else if (typeof args.data == 'object') {
        opts.form = args.data;
    }

    if (args.headers) {
        opts.headers = args.headers;
    }


    // allow the ability to override the followRedirect default
    // behavior.
    if (typeof args.followRedirect != 'undefined') {
        opts.followRedirect = args.followRedirect;
    }
    
//console.log('AD.sal.request(): opts:');
//console.log(opts);

    request(opts, function (err, res, body) {

        if (typeof res == 'undefined'){
            console.log('*** error: AD.sal.request() did not receive an res object');
            console.log('*** perhaps your connection failed');
            res = {statusCode:'??', headers:{ not:'given' }};
        }

        // Deliver results in a similar format as jQuery.ajax()
        var xhr = {
            responseText: body,
            status: res.statusCode,
            getResponseHeader: function (name) {
                return res.headers[String(name).toLowerCase()];
            },
            getAllHeaders: function () {
                return res.headers;
            },
            then: dfd.then,
            fail: dfd.fail,
            done: dfd.done,
            always: dfd.always
        };


        if (err) {
            dfd.reject(xhr, "error", err);
        } else if (res.statusCode >= 400) {
            dfd.reject(xhr, "error");
        } else {
            var data = body;
            if (typeof body == 'string') {
                try {
                    data = JSON.parse(body);
                }
                catch(_) {
                    if (args.dataType == 'json') {
                        err = new Error('JSON parse error');
                        err.devDescription = 'attempted to parse body['+body+']';
                        dfd.reject(xhr, "error", err);
                    }
                }
            }
            if (!err) {
                dfd.resolve(data, "success", xhr);
            }
        }
    });

    return dfd;
};



//--------------------------------------------------------------------------
/*
 * parse your json string into an object
 */
SAL.parseJSON = function(text) {
    return JSON.parse(text);
};



//--------------------------------------------------------------------------
/*
 * queue the given fn to be run immediately after all other events in Event
 * loop complete.
 */
SAL.setImmediate = function(fn) {
    setImmediate(fn);
};

