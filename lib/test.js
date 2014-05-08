/*
 * AD.test
 *
 * A set of utilities to make interacting with spawned processes easier.
 *
 */

var $ = require('jquery-deferred');

var Debug = function( log ) {

}


var Values = {
    httpCalled : false,
    logCalled : false,
    logErrorCalled: false
}
var Log = function(data) {
    Values.logCalled = true;
}
Log.error = function(data) {
    Values.logErrorCalled = true;

}




var Fixtures = {
    // 'method url' : { success:true, data:data, status:'', response:{} },
    // 'method url2' : { success:false, response:'', status:'', error:data }
}

var onHttpHandlers = [];
var OnHTTP = function( params ) {
    Values.httpCalled = true;
    onHttpHandlers.forEach(function(handler) {
        handler(params);
    });
}

var SAL = {}
SAL.Deferred = $.Deferred;
SAL.extend = $.extend;
SAL.http = function(params) {
    var dfd = $.Deferred();

//console.log('mockAD.sal.http():');

    // handle any additional handlers:
    OnHTTP(params);


    // now respond with any fixture data:
    var key = params.type + ' ' + params.url;
//console.log('key:'+key);
//console.log(Fixtures);

    if (typeof Fixtures[key] != 'undefined') {
        var response = Fixtures[key];

        if (response.success) {

            dfd.resolve( response.data, response.status || 'success', response.response || {} );

        } else {
            dfd.reject(response.response || {}, response.status || 'error', response.error || {}); 
        }
    } else {

        Debug('mockAD.sal.http(): unknown url key:<yellow>'+key+'</yellow>');
        dfd.reject({}, 'error', { unknownKey:true });

    }

    return dfd;

}




// Klass : export class definitions
//
var Klasses = {};

var Klass = function(key) {
    return Klasses[key];
}

Klass.add = function(key, ObjDef) {
    Klasses[key] = ObjDef;
}




module.exports = {


    /**
     * @object mockAD
     *
     * This is used in unit tests so any AD.*,  AD.sal.* methods can
     * be overwritten for unit tests.
     *
     */
    mockAD:{

        // our AD utility overrides:
    
        log:Log,
        
        sal: SAL,


        //// mock helper functions


        // set the debugging console fn() :  AD.log
        debug: function( log ) {
            Debug = log;
        },


        // set some fixture values to return data
        fixtures: function( fixtureObj ) {

            for (var f in fixtureObj) {
                Fixtures[f] = fixtureObj[f];
            }

        },



        // set the exported Class Definitions if they are not available otherwise
        klass: Klass,


        // set a callback(params) when AD.sal.http() is called.
        onHttp: function( fn ) {
            onHttpHandlers.push(fn);
        },


        // reset the mock values and httpHandlers back to initial conditions.
        reset: function() {
            this.setVals({
                httpCalled:false,
                logCalled:false,
                logErrorCalled:false
            });
            onHttpHandlers = [];
        },


        // set a mock value
        setVals: function( vals ) {
            for (var v in vals) {
                Values[v] = vals[v];
            }
        },


        // get a mock value
        val: function( key ) {
            return Values[key];
        },
    
    }

}