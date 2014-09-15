/*
 * AD.test
 *
 * A set of utilities to make working with unit tests easier.
 *
 */

var $ = require('jquery-deferred');
var fs = require('fs');
var path = require('path');

var AD = null;
var Sails = null;
var sailsInst = null;



/**
 * @function findIt
 *
 * Recursively search upwards until the given path is found.
 *
 * @param [string] pathToLookFor    The desired path we are searching for
 * @param [integer] count           How many tries we have currently attempted
 * @return [string] the relative path to the given pathToLookFor or null if not found.
 */
var findIt = function( pathToLookFor, count ) {

    if (typeof count == 'undefined') count = 0;

    // sanity check!!
    if (count > 100) {
        return null;
    }

    if ( fs.existsSync(pathToLookFor)) { 
        return pathToLookFor;
    } else {
        return findIt(path.join('..', pathToLookFor), count+1);
    }

}



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


    _AD:function(adObj) {
        AD = adObj;
    },


    data:{



        /**
         * @function load
         *
         * initialize the data in the given Models with the data found in the specified files.
         *
         * @param [array] options  an array of Model & file path  definitions
         *                          each entry should contain { model: MODEL,  path:'path/to/file' }
         * @return [deferred]
         */
        load:function(options) {
            var dfd = AD.sal.Deferred();

// AD.log('... typeof:'+ typeof options);

            if (!options.length) {
// AD.log('... converting to array!');
                options = [ options ];
            }


            var numResolved = 0;

            options.forEach(function(def) {

// AD.log(def);
                var Model = def.model;
                var file = def.path;
                var Key = def.key;

                var importData = null;

                var shouldImport = false;

                async.series([

                    // step 1: get existing values and store in Model.___oldValues
                    function(next) {
// AD.log('... pulling model values:');
                        if (Model.___oldValues) {

                            // we've already done this step
                            next();

                        } else { 

                            Model.find()
                            .fail(function(err){
                                next(err);
                            })
                            .done(function(list){
                                var oldValues = [];
                                var numDeleted = 0;
                                list.forEach(function(entry) {
                                    var json = entry.toObject();
                                    oldValues.push(json);
                                    
                                })
                                Model.___oldValues = oldValues;
                                Model.___oldModels = list;

                                next();

                            })

                        }

                    }, 


                    // step 2: read in values 
                    function(next) {
// AD.log('... reading in values:');
                        fs.exists(file, function(isThere) {

                            if (!isThere) {

                                next(new Error('file not found:'+file));

                            } else {

                                fs.readFile(file, { encoding:'utf8' }, function(err, data){

                                    if (err) {
                                        next(err);
                                    } else {

                                        importData = JSON.parse(data);
                                        next();
                                    }
                                })

                            } 
            

                        });

                    },



                    // step 3 : if new data != existing data, delete oldData:
                    //          here we are trying to save some db work if the data is the same
                    function(next) {

// AD.log('... comparing values to determine if we should actually modify db');

                        shouldImport = false;

                        var oldData = Model.___oldValues;

                        if (importData.length != oldData.length) {
// AD.log('... lengths of import data not same:');

                            shouldImport = true;

                        } else {



                            var iHash = {};
                            importData.forEach(function(iEntry) {
                                iHash[iEntry[Key]] = iEntry;
                            });

                            var oHash = {};
                            oldData.forEach(function(oEntry){
                                oHash[oEntry[Key]] = oEntry;
                            })

                            for (var i in iHash) {

                                // if we don't have a matching entry
                                if (typeof oHash[i] == 'undefined') {
    // AD.log('... old data doesnt have matching key: '+i);
                                    shouldImport = true;

                                } else {

                                    // if our entry isn't the same:
                                    for (var v in iHash[i]) {

                                        if (v != null) {

                                            // old data doesn't have this field:
                                            if (typeof oHash[i][v] == 'undefined') {
        // AD.log('... old data doesnt have new data field: '+v+' file:'+file);
        // AD.log('... old data:', oHash[i]);
        // AD.log('... new data:', iHash[i]);
                                                shouldImport = true;
                                            } else {

                                                // field value not the same:
                                                if (iHash[i][v] != oHash[i][v]) {
        // AD.log('... old data field value not same as new data: '+v+'->');

                                                    shouldImport = true;
                                                }
                                            }
                                        }
                                        
                                    }
                                }
                            }

                        }

                        next();

                    },



                    // if we are importing the data, then 1st delete the existing data
                    function(next){

                        if (shouldImport) {
// AD.log('... modifying data: remove existing info');
                            var numDeleted = 0;
                            var numParallel = 25;

                            //// OK running into a situation where MySQL adaptor returns error after 150+ concurrent operations:
                            //// this is a sequential workaround for that.
                            var doThisSequentially = function( list, cb ) {

                                // if our list is empty, then return successfully:
                                if (list.length == 0) {
                                    cb(null);
                                    return;
                                } else {

                                    // get next entry in list and destroy it
                                    var entry = list.shift();
                                    entry.destroy()
                                    .fail(function(err){
                                        cb(err);
                                    })
                                    .done(function(){
                                        doThisSequentially(list, cb);
                                    });

                                }
                            }

                            for (var i=0; i<numParallel; i++) {
                                doThisSequentially(Model.___oldModels, function(err){
                                    if (err){
                                        next(err);
                                    } else {
                                        numDeleted++;

                                        // once all our parallel operations have completed:
                                        if (numDeleted >= numParallel) {
                                            next();
                                        }
                                        
                                    }
                                });
                            }
//                             Model.___oldModels.forEach(function(entry){
// AD.log('... entry : '+entry.ren_guid);
//                                 entry.destroy()
//                                 .fail(function(err){
// AD.log.error('... entry failed! '+ entry.ren_guid+'\n err:', err);

//                                     next(err);
//                                 })
//                                 .done(function(){
// AD.log('... args:', arguments);
// AD.log('... entry done: '+entry.ren_guid);
//                                     numDeleted ++;
//                                     if (numDeleted >= Model.___oldModels.length) {
//                                         next();
//                                     }
//                                 })
//                             });

                        } else {

                            delete Model.___oldModels;
                            next();
                        }
                    },



                    // step 3: create import Data
                    function(next) {

                        if (shouldImport) {


//                             var numDone=0;
//                             Model.create(importData)
//                             .fail(function(err){
//                                 next(err);
//                             })
//                             .done(function(data){
//                                 next();
//                             })


                            var numDone = 0;
                            var numParallel = 25;

                            //// OK running into a situation where MySQL adaptor returns error after 150+ concurrent operations:
                            //// this is a sequential workaround for that.
                            var doThisSequentially = function( list, cb ) {

                                // if our list is empty, then return successfully:
                                if (list.length == 0) {
                                    cb(null);
                                    return;
                                } else {

                                    // get next entry in list and destroy it
                                    var entry = list.shift();
                                    Model.create(entry)
                                    .fail(function(err){
                                        cb(err);
                                    })
                                    .done(function(){
                                        doThisSequentially(list, cb);
                                    });

                                }
                            }

                            for (var i=0; i<numParallel; i++) {
                                doThisSequentially(importData, function(err){
                                    if (err){
                                        next(err);
                                    } else {
                                        numDone++;

                                        // once all our parallel operations have completed:
                                        if (numDone >= numParallel) {
                                            next();
                                        }
                                        
                                    }
                                });
                            }



                        } else {

                            delete Model.___oldValues;
                            next();
                        }
                    }



                ], function(err, results){


                    if (err) {
                        dfd.reject(err);
                    } else {

                        numResolved++;
                        if (numResolved >= options.length) {
                            dfd.resolve();
                        }
                    }

                });
                
            })

            return dfd;
        },



        /**
         * @function restore
         *
         * restore the original values for each of the given models
         *
         * @param [array] options  an array of Models
         * @return [deferred]
         */
        restore: function(options) {
            var dfd = AD.sal.Deferred();


            if (!options.length) {
                options = [options];
            }

            var numRestored = 0;
            options.forEach(function(Model){


                if (!Model.___oldValues) {
                    numRestored++;
                } else {

                    async.series([

                        // remove testing data:
                        function(next) {

                            Model.find()
                            .fail(function(err){
                                next(err);
                            })
                            .done(function(list){

                                var numDestroyed = 0;
                                list.forEach(function(row){
                                    row.destroy()
                                    .fail(function(err){
                                        next(err);
                                    })
                                    .done(function(){

                                        numDestroyed++;
                                        if (numDestroyed >= list.length) {
                                            next();
                                        }

                                    })
                                })
                            })
                        },

                        // recreate original data:
                        function(next){
                            Model.create(Model.___oldValues)
                            .fail(function(err){
                                next(err);
                            })
                            .done(function(){

                                // remove our oldValues from the Model.
                                delete Model.___oldValues;
                                next();
                            })
                        }
                    ], function(err){

                        if (err) {
                            dfd.reject(err);
                        } else {

                            numRestored++;
                            if (numRestored >= options.length) {
                                dfd.resolve();
                            }
                        }

                    });  // async.series()

                } // if Model.___oldValues


            });  // options.forEach();


            // if none of the provided models had any data to restore
            // this should catch that:
            if (numRestored >= options.length) {
                dfd.resolve();
            }

            return dfd;
        }
    },

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
    
    },



    /**
     * @object sails
     *
     * This is used to help our unit tests load a working copy of sails so our
     * tests can access models/services/constants, etc...
     *
     */
    sails:{


        load:function(options) {
            var dfd = AD.sal.Deferred();

            // setup the default options:
            options = options || {};
            options.hooks = options.hooks || {grunt:false, i18n: false};
            options.log   = options.log   || {level:'error'};
            options.session = options.session || {secret:'abc123'};


            // load our Sails app if not already loaded:
            if (Sails == null) {

                // find the proper location of our project's root sails path
                var sPath = path.join('node_modules', 'sails', 'lib', 'app');
                var sailsPath = findIt(sPath);

                // convert this to an absolute path to load
                var absPath = path.join(process.cwd(), sailsPath);
                Sails = require(absPath);

                // remember the sails root path
                Sails.___startPath = absPath.replace(sPath, '');
            } 


            // if we don't already have a sails instance loaded:
            if (sailsInst == null) {


                // load sails from the project's sails root directory:
                var cwd = process.cwd();
                process.chdir(Sails.___startPath);

                // load sails
                sailsInst = new Sails();
                sailsInst.load(options, function (err) {
                    if (err) {
                        process.chdir(cwd);
                        dfd.reject(err);
                    } else {
                        process.chdir(cwd);
                        dfd.resolve(sailsInst);
                    }
                });


            } else {

                // just return the current sails instance
                dfd.resolve(sailsInst);

            }

            return dfd;

        },




        service: function(key) {



        }







    }

}