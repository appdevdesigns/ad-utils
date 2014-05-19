/*
 * AD.module
 *
 * A set of utilities for managing our plugin modules.
 *
 */
var fs = require('fs');
var path = require('path');
var async = require('async');

var AD = {};            // we reuse our ad-util object in here as well.




//----------------------------------------------------------------------------
// The Module Handler Object
//----------------------------------------------------------------------------



var Handler = function(opts, newAD) {
    this.pathDir = opts.directory;

    var parts = this.pathDir.split(path.sep);
    this.moduleName = parts.pop();

    // if a AD obj was passed in, use that for our AD
    if (newAD) { AD = newAD; }
}
module.exports = Handler;



Handler.prototype.connections = function(connections) {
    combineConfigObj({
        obj:connections,
        file:path.join(this.pathDir, 'config', 'connections.js'),
        kind:'connection',
        moduleName:this.moduleName
    });
}


Handler.prototype.policies = function(policies) {
    combineConfigObj({
        obj:policies,
        file:path.join(this.pathDir, 'config', 'policies.js'),
        kind:'policy',
        moduleName:this.moduleName
    });
}


Handler.prototype.routes = function(routes) {
    combineConfigObj({
        obj:routes,
        file:path.join(this.pathDir, 'config', 'routes.js'),
        kind:'route',
        moduleName:this.moduleName
    });
}


Handler.prototype.bootstrap = function( next ) {
    var bootstrap = require(path.join(this.pathDir, 'config', 'bootstrap.js'));
    bootstrap(next);
}


var combineConfigObj = function( opts ) {

    var obj = opts.obj;
    var myObj = require(opts.file);
    for (var key in myObj) {

        if (typeof obj[key] == 'undefined') {
            obj[key] = myObj[key];
        } else {

            AD.log( '<yellow><bold>Warning:</bold> '+ opts.moduleName + ':  '+opts.kind+' ['+key+'] already defined in sails</yellow>');

        }
    }
};

