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


module.exports = {


        /**
         * @function AD.spawn.AD()
         *
         * !!! should only be used internally by ad-utils to pass in the global
         * AD object. !!!
         *
         * @param {object} obj  the global AD object.
         */
        AD:function(obj) {
            AD = obj;
        },



        /**
         * @function AD.module.setup
         *
         * make sure all the file and directory links are in place for sails
         * to use all the files for this plugin.
         *
         * Our goal is to leave sails as is and make these files appear in the
         * right places.
         *
         * This routine is used by the module's /setup/setup.js script that is
         * called as npm postinstall.
         *
         */
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
//            var parts = sailsDir.split(path.sep);
//            parts.pop();
            var sailsBasePath = sailsDir; // parts.join(path.sep);

    //console.log('moduleName:'+moduleName);
    //console.log('sailsDir:'+sailsDir);
    //AD.log.error('sailsRelative:'+ shortPath(sailsBasePath, __dirname));

            var filesToIgnore = [];
            var undoIgnore = [];


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


                        // put this directory in our .gitignore
                        filesToIgnore.push(sailsLink);


                        if (!fs.existsSync(sailsLink)) {
                            fs.symlinkSync(currDir, sailsLink, 'dir');

                            AD.log('<green><bold>creating:</bold>'+shortPath(sailsBasePath, sailsLink)+'</green>');
                            AD.log('         <yellow> ---> '+shortPath(sailsBasePath, currDir)+'</yellow>');

                        } else {

                            AD.log('<white><bold>exists:</bold>'+shortPath(sailsBasePath, sailsLink)+'</white>');
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
                        AD.log('<yellow><bold>unlinking:</bold></yellow><green>'+shortPath(sailsBasePath, filePath)+'</green>');

                        // should remove this from our .gitignore
                        undoIgnore.push(filePath);

                    });

                    next();
                },


                // 4th: now setup links to files in our module
                function(next) {

                    options.dirLinks.forEach(function(dir) {

                        syncDirLinks({
                            moduleDir:path.join(moduleDir, dir),
                            sailsDir:path.join(sailsDir, dir),
                            files:filesToIgnore
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
                },


                // 6th: .gitignore the files in our module
                function(next) {

                    AD.log();
                    AD.log('Patching .gitignore:');

                    // prepare the text to insert
                    var text = [];
                    var pluginOpen  = '\n\n### plugin:['+moduleName+']';
                    var pluginClose = '### end:'+moduleName+'\n\n';

                    text.push(pluginOpen);
                    filesToIgnore.forEach(function(pathFile){
                       text.push(shortPath(sailsDir+path.sep, pathFile));
                    });
                    text.push(pluginClose);



                    var ignoreText = text.join('\n');

                    var pathGitIgnore = path.join(sailsDir, '.gitignore');
                    if (fs.existsSync(pathGitIgnore)) {

                        var contents =  fs.readFileSync(pathGitIgnore, 'utf8');

                        // if we have already inserted for this module:
                        if (contents.indexOf(pluginOpen) != -1) {
//console.log('previous gitignore insert found:');
                            // replace with our new ignoreText
                            var regExpItems = [
                               '(',
                               pluginOpen.replace('[', '\\[').replace(']', '\\]'),
                               '[\\s\\S]*',
                               pluginClose,
                               ')'].join('');
//console.log('regexpItems:'+regExpItems);

                            var regExp = new RegExp(regExpItems,"g");
                            contents = contents.replace(regExp, ignoreText);
//console.log();
//console.log('new Contents:');
//console.log(contents);
                            fs.writeFileSync(pathGitIgnore, contents);

                        } else {
//console.log('appending .gitignore info:');
                            // first insert, so simply append to file:
                            fs.appendFileSync(pathGitIgnore, ignoreText);
                        }

                    } else {

                        AD.log('<yellow><bold>SKIP:</bold> no .gitignore found.</yellow>');
                    }

                    next();
                }

            ], function(err,results) {

            });

        },

};





var defaultSetupActions = {
        directories:[],
        links:{
        // sailsDir : moduleDir
            'api/models/[moduleName]'       : 'api/models',
            'api/controllers/[moduleName]'  : 'api/controllers'
        },
        dirLinks:[
            // '/module/dir',    // ==> sails/module/dir
            'api/services',
            'api/policies',
            'config'
        ],
        patches:[

            { path:path.join('config', 'routes.js'), append:true,  text:'require(\'[moduleName]\').routes(routes);\n' },
            { path:path.join('config', 'policies.js'), append:true, text:'require(\'[moduleName]\').policies(policies);\n'},
            { path:path.join('config', 'adapters.js'), append:true, text:'require(\'[moduleName]\').adapters(adapters);\n'},

        ],

};


function shortPath(base, full) {

    return full.replace(base, '');
}



//----------------------------------------------------------------------------
// Helper Routines
//----------------------------------------------------------------------------






/**
 * @function filesInThisModule
 *
 * recursively scans the directory structure provided in options.dir
 * for files that are links back to this module.  Any files found to
 * link back to this plugin are stored in options.list.
 *
 *
 * @param {object} options parameter to this fn() passed in as an object
 *                  {
 *                      dir:'path/to/sails/directory/to/scan',
 *                      moduleDir: 'path/to/module/directory',
 *                      list: [], // an array of links that are found
 *                  }
 */
var filesInThisModule = function(options) {

    // for each file in the given directory
    var listFiles = fs.readdirSync(options.dir);
    listFiles.forEach(function(fileName) {

        var pathFile = path.join(options.dir, fileName);

        // if file is a symbolic link
        var stat = fs.lstatSync(pathFile);
        if (stat.isSymbolicLink()) {

            // i'm expecting links to be from root /path/to/file
            var linkInfo = fs.readlinkSync(pathFile);

            // but might be relative:  ../path/to/file
            var resolvedPath = path.resolve(options.dir, linkInfo);

            // if it points to a file in our module directory
            if ((linkInfo.indexOf(options.moduleDir) == 0)
                || (resolvedPath.indexOf(options.moduleDir) == 0)) {

                // add it to our list
                options.list.push(pathFile);

            }
        }

    });
};



/**
 * @function isModuleRoot
 *
 * returns true if current directory looks like a module directory.
 * returns false otherwise.
 *
 * @return {bool}  is the current directory a module directory.
 */
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



/**
 * @function isSailsRoot
 *
 * returns true if current directory looks like a SailsJS directory.
 * returns false otherwise.
 *
 * @return {bool}  is the current directory a SailsJS directory.
 */
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



/**
 * @function looksLikeDir
 *
 * returns true if current path looks like the given checks description.
 * returns false otherwise.
 *
 * @param {object} checks   the description of the directory
 *                          {
 *                              fileName:1, // fileName exists in directory
 *                              dirName:0   // dirName !exists in directory
 *                          }
 * @param {string} currPath the path to examine
 * @return {bool}  does the current directory pass all checks.
 */
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


};



/**
 * @function nameModule
 *
 * returns the expected name of the module.
 * @param {string} currPath the path to examine
 * @return {bool}  does the current directory pass all checks.
 */
var nameModule = function( currDir ) {

    //// Expecting to be in a [sailsRoot]/node_modules/[moduleName]  directory
    if(!isModuleRoot(currDir) ) {
        AD.log.error('Error: cant find moduleName.');
        AD.log('     -> is this not a module root? path:'+currDir);
        process.exit(1);
    }

    var pkgJson = require(currDir+'/package.json');
    if (pkgJson.name) {

        // use the 'name' field in the package.json
        AD.log('- using package.json.name:'+pkgJson.name);
        return pkgJson.name;

    } else {

        //// just take last entry in directory path
        var parts = currDir.split(path.sep);
        return parts.pop();
    }

};



/**
 * @function patchIt
 *
 * updates a file with the data in options.patch.text
 *
 *
 * @param {object} options parameter to this fn() passed in as an object
 *                  {
 *                          patch:{
 *                              path:'path/to/file',
 *                              text:'data to write to file',
 *                              append:true, // simply append data?
 *                              tag:'string' // text to replace with patch.text
 *                          },
 *                          sailsDir:'path/to/sails/directory',
 *                          moduleName:'name of the module'
 *                  }
 *
 *                  if patch.append == true, then patch.tag is ignored.
 */
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

};



/**
 * @function recursiveMakeDir
 *
 * makes sure that pathBase has a sub directory structure
 * matching the pathToMake parameter.
 *
 *
 * @param {string} pathBase the starting path
 * @param {string} pathToMake  a description of the directory structure to make
 *
 */
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

            AD.log('<yellow><bold>exists:</bold><yellow><green>'+pathBase+'</green>');

        }


        recursiveMakeDir(pathBase, pathToMake);
    }
};



/**
 * @function rootDir
 *
 * this routine scans the directory tree upwards looking for the sails root
 * directory our routine is being run in.
 *
 * @return {string}  global path to the sailsJS root directory
 */
var pathSailsRoot = null;
var rootDir = function() {
    if (pathSailsRoot == null) {

        // expect that we are in a [sailsRoot]/node_modules/[moduleName] dir
        var currDir = process.cwd();

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



/**
 * @function syncDirLinks
 *
 * makes sure each file found in options.moduleDir  are found in
 * options.sailsDir.  If not, a link from sailsDir.file => moduleDir.file
 * will be made.
 *
 *
 * @param {object} options parameter to this fn() passed in as an object
 *                  {
 *                      moduleDir:'path/to/original/module/directory',
 *                      sailsDir: 'path/to/destination/sails/directory',
 *                      files: [], // an array of links that get created
 *                  }
 */
var syncDirLinks = function(options) {

    options.files = options.files || [];

    var files = fs.readdirSync(options.moduleDir);
    files.forEach(function(file) {

        if ('.gitkeep '.indexOf(file) == -1) {

            var modulePath = path.join(options.moduleDir, file);
            var sailsPath = path.join(options.sailsDir, file);

            if (!fs.existsSync(sailsPath)) {

                fs.symlinkSync(modulePath, sailsPath);
                AD.log('<green><bold>Linked:</bold>'+sailsPath+'</green>');

                // store this in our files array.
                options.files.push(sailsPath);

            } else {

                // I expect these files to exist and not be linked so don't warn
                // if one of these: config.js, routes.js, policies.js, adapters.js
                if ('config.js, routes.js, policies.js, adapters.js'.indexOf(file) == -1 ) {

                    // but any other file alert someone!
                    AD.log('<yellow><bold>EXISTS:</bold>'+sailsPath+'</yellow>');
                    AD.log('       <yellow> could not create link! </yellow>');

                    // still store this in our files array.
                    options.files.push(sailsPath);

                }

            }
        }

    });
};


