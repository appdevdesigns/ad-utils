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
var async = require('async');

var superTest = require('supertest');



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






var _sailsInstance = function(options, method) {
    var dfd = AD.sal.Deferred();


    method = method || 'lift';

    // setup the default options:
    options = options || {};
    options.hooks = options.hooks || {
        // blueprints: false,
        // controllers: false,
        // cors: false,
// runBootstrap:true, 
        csrf: false,
        grunt: false,
        // http: false,
        // i18n: false,
        // logger: false,
        //orm: leave default hook
        // policies: false,
        // pubsub: false,
        // request: false,
        // responses: false,
        //services: leave default hook,
        // session: false,
        // sockets: false,
        // views: false

    };
    options.log   = options.log   || {level:'error'};
    options.session = options.session || {secret:'abc123'};


    // load our Sails app if not already loaded:
    // if (Sails == null) {

    //     // find the proper location of our project's root sails path
    //     var sPath = path.join('node_modules', 'sails', 'lib', 'app');
    //     var sailsPath = findIt(sPath);

    //     // convert this to an absolute path to load
    //     var absPath = path.join(process.cwd(), sailsPath);
    //     Sails = require(absPath);

    //     // remember the sails root path
    //     Sails.___startPath = absPath.replace(sPath, '');
    // } 

    if (Sails == null) {
        var sPath = path.join('node_modules', 'sails');
        var sailsPath = findIt(sPath);

        // convert this to an absolute path to load
        var absPath = path.join(process.cwd(), sailsPath);
        Sails = require(absPath);
        // Sails = require('sails');

        Sails.___startPath = absPath.replace(sPath, '');
    }


    // if we don't already have a sails instance loaded:
    if (sailsInst == null) {


        // // load sails from the project's sails root directory:
        var cwd = process.cwd();
        process.chdir(Sails.___startPath);

        // // load sails
        // sailsInst = new Sails();
        // sailsInst.load(options, function (err) {
        //     if (err) {
        //         process.chdir(cwd);
        //         dfd.reject(err);
        //     } else {
        //         process.chdir(cwd);
        //         dfd.resolve(sailsInst);
        //     }
        // });
        // 
        Sails[method](options, function(err, app){

            if (err) {
                process.chdir(cwd);
                dfd.reject(err);
            } else {
                sailsInst = app;
                process.chdir(cwd);
                dfd.resolve(sailsInst);
            }

        })
//         .catch(function(err){

// console.err('... err:', er);
//         })


    } else {

        // just return the current sails instance
        dfd.resolve(sailsInst);

    }

    return dfd;

}






module.exports = {


    _AD:function(adObj) {
        AD = adObj;
    },

    common:{

        /*
         * AD.test.common.accessedOnlyWithPermission
         *
         * verifies the current url can only be accessed by
         * users with proper permissions set.
         *
         * It reuses 2 common SiteUser entries: 'test', and 'testNoPerm'
         * to verify one can receive a success response, and the
         * other a 403 forbidden response.
         *
         * @codestart
         *   // only accessible by users with permission
         *   it('only accessible by users with permission', function(ok) {
         *       this.timeout(8000);
         *       AD.test.common.accessedOnlyWithPermission({url:'/module/object'}, assert, ok);
         *   })
         * @codeend
         * @param {json} opt    the url access settings for this test:
         *                  .url {string} the url to access
         *                  .verb {string} the method of access 
         *                                 [default: 'get']
         * @param {obj} assert  the chai assert object passed in from your test
         * @param {fn}  cb      the mocha callback to call after the tests
         */
        accessedOnlyWithPermission: function(opt, assert, cb) {

            var request = null;
            var requestNoPerm = null;

            if (!opt || !opt.url) {
                assert.ok(false, ' called AD.test.common.accessedOnlyWithPermission() with not .url value');
                cb();
                return;
            }

            opt.verb = opt.verb || 'get';

            async.series([

                // step 1: create the request 
                function(next) {
                    request = AD.test.request(function(err){
                        next(err);
                    });
                },

                // step 2: create requestNoPerm
                function(next) {
                    requestNoPerm = AD.test.request({username:'testNoPerm'}, function(err){
                        next(err);
                    })
                },

                // step 3: test request for 200
                function(next) {
                    request[opt.verb](opt.url)
                        .set('Accept', 'application/json')
                        // .expect('Content-Type', /json/)     // should return json
                        .expect(200)                        // should return a successful response.
                        .end(function(err, res){

                           assert.isNull(err, ' --> there should be no error.');
                            // assert.isArray(res.body, ' --> should have gotten an array back. ');
                            // assert.lengthOf(res.body, 3, ' --> should only get 3 of our test entries back.');
                            next(err);
                        });
                },

                // step 4: test requestNoPerm for 403
                function(next) {
                    requestNoPerm[opt.verb](opt.url)
                        .set('Accept', 'application/json')
                        // .expect('Content-Type', /json/)     // should return json
                        .expect(403)                        // should return a successful response.
                        .end(function(err, res){

                           assert.isNull(err, ' --> there should be no error.');
                            // assert.isArray(res.body, ' --> should have gotten an array back. ');
                            // assert.lengthOf(res.body, 3, ' --> should only get 3 of our test entries back.');
                            next(err);
                        });
                }
            ],function(err){

                cb(err);
            })
        }
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



    events: {
        TEST_BARRELS_POPULATED:'test.barrels.populated'
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
     * @object model
     *
     * A set of common unit test routines that relate to Models
     */
    model: {

        /**
         * @function count
         *
         * return the number of entries that match the provided filter.
         *
         * @codestart
         * var numUsers = 0;
         * AD.test.model.count(Users, function(err, count) {
         *    if (err) { 
         *        // handle error 
         *    } else {
         *        numUsers = count;
         *    }
         * })
         * @codeend
         *
         * @param {object} Model the Sails Model to scan for entries.
         * @param {object} filter (optional) set of filter criteria
         * @param {fn} cb  the callback to send the result to:
         *                 cb(err, count);
         */
        count:function(Model, filter, cb) {

            if( _.isFunction(filter)) {
                cb = filter;
                filter = {};
            }

            Model.count(filter)
            .exec(function(err, count){
                cb(err, count);
            });
        }
    },



    /**
     * @object request
     *
     * Return an instance of the supertest request object.
     *
     * By default this method will return a logged in instance of
     * the username you provide.  (the 'test' user by default);
     *
     * @param { obj } opt the options for the request
     * @param { fn } cb the callback fn to call once the login has been successful.
     */
    request:function(opt, cb) {

        // make sure params are correct.
        if (typeof opt == 'function') {
            cb = opt;

            // our expected default setup:
            opt = {
                verb:'post',
                uri:'/site/login',
                data:{
                    username:'test',
                    password:'test'
                }
            }
        }

        // verify opt values:
        opt.verb = opt.verb || 'post';
        opt.uri  = opt.uri  || '/site/login';
        opt.data = opt.data || {};
        opt.data.username = opt.username || 'test';
        opt.data.password = opt.password || 'test';

        var request = superTest.agent(sails.hooks.http.app);

        request[opt.verb](opt.uri)
            .send(opt.data)
            .end(function(err, res){

                cb(err);

            })
 
        return request;
    },



    /**
     * @object sails
     *
     * This is used to help our unit tests load a working copy of sails so our
     * tests can access models/services/constants, etc...
     *
     */
    sails:{


        lift:function adutilSailsLift(options) {

            return _sailsInstance(options, 'lift');
        },


        load:function adutilSailsLoad(options) {
            
            return _sailsInstance(options, 'load');
        },

        service: function(key) {



        }

    },


    util: {

        /**
         * AD.test.util.isDeferred()
         * @function isDeferred
         *
         * checks the provided object to see if it looks like a Deferred
         *
         * @param {Deferred} dfd the supposed Deferred object
         * @param {obj} assert  the chai assert object to perform the tests
         */
        isDeferred:function( dfd, assert) {
            assert.isDefined(dfd, ' should be defined ');
            assert.property(dfd, 'fail', ' should look like a deferred. .fail() ');
            assert.property(dfd, 'then', ' should look like a deferred. .then() ');
        },


        /**
         * AD.test.util.newOnDone()
         * @function newOnDone
         *
         * this initializes a data structure that AD.test.util.onDone()
         * uses to track the number of return calls made.
         *
         * @param {fn} ok the mocha callback to be called
         * @param {int} numPaths  the number of times this should be called.
         * @return {obj}
         */
        newOnDone:function( ok, numPaths) {
            numPaths = numPaths || 2; // default 2 paths to map.
            return { numDone:0, ok:ok, limit:numPaths };
        },


        /**
         * AD.test.util.onDone()
         * @function onDone
         *
         * process the finish of a set of tests.  When several return
         * paths are being tested, a callback AND a deferred, this will
         * wait until each expected route calls this before continuing.
         *
         * @param {obj} o  The object returned by AD.test.util.newOnDone()
         */
        onDone:function(o) {

            if (o.err) {
                o.ok(o.err);
            } else {
                o.numDone++;
                if (o.numDone == o.limit) {
                    o.ok();
                }
            }
        }
    }

}


