var fs = require('fs');
var path = require('path');
var async = require('async');

var colog = require('colog');



var defaultSetupActions = {
        directories:[],
        links:{
        // sailsDir : moduleDir
            'api/models/[moduleName]' : 'api/models'
        },
        dirLinks:[
            // '/module/dir',    // ==> sails/module/dir
            'api/services',
            'api/policies',
            'config'
        ],
        patches:[

            { path:'config/routes.js', append:true,  text:'require(\'[moduleName]\').routes(routes);\n' },
            { path:'config/policies.js', append:true, text:'require(\'[moduleName]\').policies(policies);\n'},
            
        ],

};





var AD = {


    log: function() {

        colog.format('    '+argsToString(arguments));
    },

    module: {

    setup:function( options ) {

        options = options || {};

        // let options override the default actions
        for (var k in options) {
            defaultSetupActions[k] = options[k];
        }
        options = defaultSetupActions;
       

//console.log(options);

        var moduleDir = process.cwd();
        var moduleName = nameModule(moduleDir);
        var sailsDir = rootDir();
//console.log('moduleName:'+moduleName);

        AD.log();
        AD.log('setting up module: <green><bold>'+moduleName+'</bold></green>');

        async.series([

            // first create any directories specified in our options:
            function(next) {
                AD.log();
                AD.log('<green>Making Directories:</green>');
                options.directories.forEach(function(directoryTmpl) {
                    var directory = AD.util.string.replaceAll(directoryTmpl,'[moduleName]',moduleName);
                    recursiveMakeDir(sailsDir, directory);

                });

                next();
                
            },



            // 2nd: create any symbolic links back to our directories
            function(next) {
                AD.log();
                AD.log('<green>Creating Symbolic Links:</green>');
                for (var k in options.links) {

                    var link = path.join(sailsDir, k);
                    var sailsLink = AD.util.string.replaceAll(link, '[moduleName]', moduleName);
                    var currDir = path.join(moduleDir, options.links[k]);

                    if (!fs.existsSync(sailsLink)) {
                        fs.symlinkSync(currDir, sailsLink, 'dir');

                        AD.log('<green><bold>creating:</bold>'+sailsLink+'</green>');
                        AD.log('         <yellow> ---> '+currDir+'</yellow>');

                    } else {

                        AD.log('<white><bold>exists:</bold>'+sailsLink+'</white>');

                    }
                }

                next();
            },



            // 3rd: prepare file links by 1st removing ALL links to files in our module
            function(next) {

                AD.log();
                AD.log('<green>Linking Individual Files:</green>');

                var listFiles = [];

                // get list of files to remove
                options.dirLinks.forEach(function(dir){

// AD.log('.dir:'+dir);
                    filesInThisModule({
                        list:listFiles, 
                        dir:path.join(sailsDir,dir),
                        moduleDir:moduleDir
                    });
                    
                });
                
//AD.log(' files to remove:');
//AD.log(listFiles);

                listFiles.forEach(function(filePath) {

                    fs.unlinkSync(filePath);
                    AD.log('<yellow><bold>unlinking:</bold></yellow><green>'+filePath+'</green>');

                });

                next();
            },


            // 4th: now setup links to files in our module
            function(next) {

                options.dirLinks.forEach(function(dir) {

                    syncDirLinks({
                        moduleDir:path.join(moduleDir, dir),
                        sailsDir:path.join(sailsDir, dir)
                    });
                });
                next();
            },


            // 5th: patch the standard sails files with our additions:
            function(next) {

    
                AD.log();
                AD.log('Patching Sails files:');

                options.patches.forEach(function(patch) {


                    patchIt({
                        patch:patch,
                        sailsDir:sailsDir,
                        moduleName:moduleName
                    });

                });

                next();
            }

        ], function(err,results) {

        });

    },

    },


    util: {

        string:{

            


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
 * @param {string} origString the string to check
 * @return {bool}
 */
replaceAll : function (origString, replaceThis, withThis) {
    var re = new RegExp(RegExpQuote(replaceThis),"g");
    return origString.replace(re, withThis);
}


        }

    }

};
module.exports = AD;


var pathSailsRoot = null;
var rootDir = function() {
    if (pathSailsRoot == null) {

        // expect that we are in a [sailsRoot]/node_modules/[moduleName] dir
        var currDir = process.cwd();

        var testDir = currDir;
        var numAttempts = 0;
        while( (!isSailsRoot(process.cwd()))
                && (numAttempts++ < 10)) {
            process.chdir('..');
//console.log('numAttempts:'+numAttempts+'  currDir:'+process.cwd());
        }

//// TODO: check for errors and keep pathSailsRoot == null;
        pathSailsRoot = process.cwd();

        process.chdir(currDir);
    }
    return pathSailsRoot;
};



var isModuleRoot = function(currPath) {

    var moduleDir = {
        'api':1,
        'assets':1,
        'config':1,
        'views':1,
        'module.js':1
    };
    return looksLikeDir(moduleDir, currPath);

};



var isSailsRoot = function(currPath) {

    var sailsDirs = {
        'api':1,
        'assets':1,
        'config':1,
        'views':1,
        'module.js':0
    };
    return looksLikeDir(sailsDirs, currPath);

};


var looksLikeDir = function( checks, currPath ) {

    var isDir = true;

    for (var k in checks) {

        var check = path.join(currPath, k);
//console.log('  .check:'+check);
        if (checks[k]) {
            // this is supposed to be here
            if (!fs.existsSync(check)) {
                isDir = false;
            }
        } else {
            // this is not supposed to be here
            if (fs.existsSync(check)) {
                isDir = false;
            }
        }
    }

//console.log('  .isRoot = '+isRoot);

    return isDir;


}



var nameModule = function( currDir ) {

    //// Expecting to be in a [sailsRoot]/node_modules/[moduleName]  directory
    if(!isModuleRoot(currDir) ) {
        AD.log.error('Error: cant find moduleName.');
        AD.log('     -> is this not a module root? path:'+currDir);
        process.exit(1);
    }

    //// just take last entry in directory path
    var parts = currDir.split(path.sep);
    return parts.pop();
};





var recursiveMakeDir = function( pathBase, pathToMake) {

    if (pathToMake == '') {

        // nothing else to make
        return;

    } else {

        // take next path step from pathToMake and add to base:
        var parts = pathToMake.split(path.sep);
        var newDir = parts.shift();

        pathBase = path.join(pathBase, newDir);

        pathToMake = parts.join(path.sep);

//        console.log(' base:'+pathBase+'  make:'+pathToMake);

        if (!fs.existsSync(pathBase)) {

            fs.mkdirSync(pathBase);
            AD.log('<green><bold>created:</bold>'+pathBase+'</green>');

        } else {
            
            AD.log('<white><bold>exists:</bold>'+pathBase+'</white>');

        }


        recursiveMakeDir(pathBase, pathToMake);
    }
}




RegExpQuote = function(str) {
     return str.replace(/([.?*+^$[\]\\(){}-])/g, "\\$1");
};




AD.log.error = function() {

    AD.log('<red>*** '+argsToString(arguments)+'</red>');
}



var argsToString = function (args) {

    var all = [];
    for (var a in args) {

        if (typeof args[a] == 'object')  all.push(JSON.stringify(args[a],null, 4));
        else all.push(args[a]);
    }

    return all.join('');
};



var filesInThisModule = function(options) {

    // for each file in the given directory
    var listFiles = fs.readdirSync(options.dir);
    listFiles.forEach(function(fileName) {
        
        var pathFile = path.join(options.dir, fileName);

//AD.log('..pathfile:'+pathFile);

        // if file is a symbolic link
        var stat = fs.lstatSync(pathFile);
        if (stat.isSymbolicLink()) {

            // i'm expecting links to be from root /path/to/file
            var linkInfo = fs.readlinkSync(pathFile);

            // but might be relative:  ../path/to/file
            var resolvedPath = path.resolve(options.dir, linkInfo);

//AD.log('....linkInfo:'+linkInfo);
//AD.log('....path1:' + path1);
//AD.log('....moduledir:'+options.moduleDir);

            // if it points to a file in our module directory
            if ((linkInfo.indexOf(options.moduleDir) == 0)
                || (resolvedPath.indexOf(options.moduleDir) == 0)) {

                // add it to our list
                options.list.push(pathFile);

            }
        }
        

    });
};



var syncDirLinks = function(options) {


    var files = fs.readdirSync(options.moduleDir);
    files.forEach(function(file) {


        if ('.gitkeep '.indexOf(file) == -1) { 
        var modulePath = path.join(options.moduleDir, file);
        var sailsPath = path.join(options.sailsDir, file);

        if (!fs.existsSync(sailsPath)) {

            fs.symlinkSync(modulePath, sailsPath);
            AD.log('<green><bold>Linked:</bold>'+sailsPath+'</green>');

        } else {

            // I expect these files to exist and not be linked so don't warn 
            // if one of these: config.js, routes.js, policies.js
            if ('config.js, routes.js, policies.js'.indexOf(file) == -1 ) {
                
                // but any other file alert someone!
                AD.log('<yellow><bold>EXISTS:</bold>'+sailsPath+'</yellow>');
                AD.log('       <yellow> could not create link! </yellow>');

            }


        }
        }

    });
}




var patchIt = function(options) {

    var filePath = path.join(options.sailsDir, options.patch.path);
    var textData = AD.util.string.replaceAll(options.patch.text,'[moduleName]',options.moduleName);


    // if file already has our text data => alert and move along
    var fileContents = fs.readFileSync(filePath, 'utf8');
    if (fileContents.indexOf(textData) > -1) {

        AD.log('<yellow><bold>SKIP:</bold>already patched: '+filePath+'</yellow>');

    } else {

        if (options.patch.append) {


            // simply append to the file
            fs.appendFileSync(filePath, textData);
            AD.log('<green><bold>PATCHED:</bold>'+filePath+'</green>');
        
        }

    }

}
