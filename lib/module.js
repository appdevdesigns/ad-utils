/*
 * AD.module
 *
 * A set of utilities for managing our plugin modules.
 *
 */
var fs = require('fs');
var path = require('path');
var async = require('async');
var _ = require('lodash-node');

var AD = {};            // we reuse our ad-util object in here as well.

// #bugFix:  windows doesn't like the './path/to/file.js' 
// --> use full paths
var Handler = require(path.join( __dirname, 'module', 'handler.js'));


// these are expected asset/ directories that we don't have to search for buildable apps in:
// used in buildableAppsInPath()
var ignoreAssetDirectories = '[bootstrap] [can] [canjs] [fonts] [images] [jquery] [js] [jmvc] [steal] [style]';



module.exports = {


        /**
         * @function AD.module._AD()
         *
         * !!! should only be used internally by ad-utils to pass in the global
         * AD object. !!!
         *
         * @param {object} obj  the global AD object.
         */
        _AD:function(obj) {
            AD = obj;
        },



        /**
         * @Class Handler
         *
         * This is the object that handle's the plugin interface.
         *
         * It provides the handlers for the adapters(), policies(), routes(),
         * and bootstrap() plugin interface.
         *
         */
        handler:Handler,



        /*
         * @function buildableAppsInPath
         *
         * recursively scan all the directories in the given currentPath, for directories that resemble
         * our appdev application format:
         *   - contains a build.appdev.js, build.config.js
         *
         * @param {string} currentPath  the path to start searching from
         * @return {array}  an array of directories that are buildable apps.
         */
        buildableAppsInPath: function( currentPath, referencePath ) {

            var apps = [];

            if (!currentPath) {
                currentPath = process.cwd();
            }

            if (!referencePath) {
                referencePath = process.cwd();
            }

// AD.log('... currPath:'+currentPath);

            if (isBuildableApp(currentPath)) {
// AD.log('   ... BUILDABLE!  adding :'+currentPath);
                apps.push({ path:currentPath, command:currentPath.replace(referencePath+path.sep, '') });
            } else {
// AD.log('   ... NOT BUILDABLE! so scan it.');
                // for each file/directory in our currentPath, 
                var files = fs.readdirSync(currentPath);
                files.forEach(function(file){

                    // if this isn't one of our expected directories that should be ignored:
                    if (ignoreAssetDirectories.indexOf('['+file+']') == -1 )  {

                        var filePath = path.resolve(currentPath, file );

                        // if this file actually exists
                        // NOTE: unix systems can have symbolic links to not existant files
                        if ( fs.existsSync(filePath)) {


                            var stats = fs.lstatSync(filePath);
// AD.log('   ... checking file:'+filePath);
                            if (stats.isDirectory()) {
// AD.log('   ... Directory: '+filePath);

                                var containsApps = AD.module.buildableAppsInPath(filePath, referencePath);

                                containsApps.forEach(function(app){
                                    apps.push(app);
                                });
                                    
                            }

                            // if our file is a symbolic link to another directory
                            if (stats.isSymbolicLink()) {

                                // get the realPath to that directory/file
                                var realPath = path.resolve(currentPath, fs.readlinkSync(filePath));

                                // if this linked item was a directory
                                var checkDir = fs.lstatSync(realPath);
                                if (checkDir.isDirectory()) {

                                    // recheck this with proper directory
                                    var containsApps = AD.module.buildableAppsInPath(realPath, referencePath);

                                    // for every returned app, update to indicate it was linked
                                    containsApps.forEach(function(app) {
                                        app.linked = true;
                                        app.command = path.join(currentPath, file).replace(referencePath+path.sep, '');
                                        apps.push(app);
                                    })
                                }

                            }

                        } // end if exists

                    }  // end if not ignored file

                })  // end files.forEach();
            }

            return apps;

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
//AD.log('<yellow><bold>process.cwd():</bold>'+process.cwd()+'</yellow>');

            var moduleDir = process.cwd();
            var moduleName = nameModule(moduleDir);
            var sailsDir = rootDir();
//            var parts = sailsDir.split(path.sep);
//            parts.pop();
            var sailsBasePath = sailsDir; // parts.join(path.sep);

//console.log('moduleName:'+moduleName);
//AD.log('<yellow><bold>sailsDir:</bold>'+sailsDir+'</yellow>');
//AD.log.error('sailsRelative:'+ shortPath(sailsBasePath, __dirname));

            // if we didn't find a sails Root dir:
            if (!isSailsRoot(sailsDir)) {

                // let's assume we are in a travis ci environment with initial npm install:
                // just exit peacefully
                AD.log('<yellow><bold>sailsDir:</bold>'+sailsDir+'</yellow>');
                AD.log('<yellow><bold>WARN:</bold> this module not installed inside a sails directory.  </yellow>');
                process.exit(0);
            }

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


                // now copy any special files around:
                function(next) {

                    AD.log();
                    AD.log('<green>Copying Files:</green>');



                    for (var cF in options.copyFiles) {
                        var modulePath = AD.util.string.replaceAll(cF,'[moduleName]',moduleName);
                        var sailsPath = AD.util.string.replaceAll(options.copyFiles[cF],'[moduleName]',moduleName);

                        copyFile({
                            modulePath:path.join(moduleDir, modulePath),
                            sailsPath:path.join(sailsDir, sailsPath),
                            sailsDir:sailsDir,
                            moduleDir:moduleDir
                        });
                    }

                    next();

                },



                // 2nd: create any symbolic links back to our directories
                function(next) {
                    AD.log();
                    AD.log('<green>Creating Symbolic Links:</green>');

                    var allLinks = optionsAll(options, 'links');
// AD.log('allLinks:', allLinks);

                    // now for each link
                    for (var k in allLinks) {

                        var link = path.join(sailsDir, k);
                        var sailsLink = AD.util.string.replaceAll(link, '[moduleName]', moduleName);
                        var currDir = path.join(moduleDir, allLinks[k]);


                        // put this directory in our .gitignore
                        filesToIgnore.push(sailsLink);


                        if (!fs.existsSync(sailsLink)) {
                            fs.symlinkSync(currDir, sailsLink, 'dir');

                            AD.log('<green><bold>creating:</bold> '+shortPath(sailsBasePath, sailsLink)+'</green>');
                            AD.log('         <yellow> ---> '+shortPath(sailsBasePath, currDir)+'</yellow>');

                        } else {

                            AD.log('<white><bold>exists:</bold>   '+shortPath(sailsBasePath, sailsLink)+'</white>');
                        }
                    }

                    next();
                },



                // 3rd: prepare file links by 1st removing ALL links to files in our module
                function(next) {

                    AD.log();
                    AD.log('<green>Linking Individual Files:</green>');

                    var listFiles = [];

                    var allDirLinks = optionsAll(options, 'dirLinks');

                    // get list of files to remove
 //                   options.dirLinks.forEach(function(dir){
                    allDirLinks.forEach(function(dir) { 

// AD.log('.dir:'+dir);
                        filesInThisModule({
                            list:listFiles,
                            dir:path.join(sailsDir,dir),
                            moduleDir:moduleDir
                        });

                    });

//AD.log(' files to remove:');
//AD.log(listFiles);

                    // go ahead and include any links to our assets:
                    // which don't show up in dirLinks
                    filesInThisModule({
                        list:listFiles,
                        dir:path.join(sailsDir,'assets'),
                        moduleDir:moduleDir
                    });

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

                    var allDirLinks = optionsAll(options, 'dirLinks');
                    var ignoreListOrig = options.ignore.dirLinks || {};
                    var ignoreList = {};
                    
                    // syncDirLinks expects the ignoreList paths to start with
                    // a '/', but that is not the expected way of entering 
                    // paths in our options file.  So go through the entries
                    // and make sure they start with '/':
                    for(var il in ignoreListOrig) { 
                        var newIL = il;

                        if (il.indexOf('/') != 0) {
                            newIL = '/'+ il;
                        }
                        ignoreList[newIL] = ignoreListOrig[il];
                    }


                    allDirLinks.forEach(function(dir) { 

                        syncDirLinks({
                            moduleDir:path.join(moduleDir, dir),
                            sailsDir:path.join(sailsDir, dir),
                            files:filesToIgnore,    // .gitignore  that is
                            ignoreList:ignoreList,  // ignore == don't link
                            sailsBase:sailsBasePath,
                            isRemove:false
                        });
                    });
                    next();
                },


                // 5th: now setup links to files in our Assets
                function(next) {

                    linkAssets({sailsDir:sailsDir, moduleDir:moduleDir, files:filesToIgnore, isRemove:false});
                    next();
                },


                // 6th: patch the standard sails files with our additions:
                function(next) {


                    AD.log();
                    AD.log('Patching Sails files:');

                    var allPatches = optionsAll(options, 'patches');
 //                   options.patches.forEach(function(patch) {
                    allPatches.forEach(function(patch) {


                        patchIt({
                            patch:patch,
                            sailsDir:sailsDir,
                            moduleName:moduleName,
                            isRemove:false
                        });

                    });

                    next();
                },


                // 7th:  patch the config/local.js file with our adapter & config info
                function(next) {

                    AD.log();
                    AD.log('Patching config/local.js:');

                    var ignoreList = options.ignore.configLocal || {};
//AD.log('ignoreList:', options.ignore);

                    patchLocal({moduleDir:moduleDir, ignore:ignoreList, isRemove:false }, next);

                },


                // 8th: .gitignore the files in our module
                function(next) {

                    AD.log();
                    AD.log('Patching .gitignore:');

                    // prepare the text to insert
                    var text = [];
                    var pluginOpen  = '\n\n########################\n### plugin:['+moduleName+']\n########################';
                    var pluginClose = '########################\n### end:'+moduleName+'\n########################\n\n';

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
                },


                // 8th : patch the assets/stealconfig.js  with our build.config.js info
                function (next) {

                    AD.log();
                    AD.log('Patching '+path.join('assets', 'stealconfig.js'));

                    patchStealConfig({moduleDir:moduleDir, isRemove:false }, next);

                }

            ], function(err,results) {

            });

        },



        /**
         * @function AD.module.uninstall
         *
         * now that we've gone through all the trouble to merge all this
         * in there, we need to allow the ability to uninstall ourselves.
         *
         */
        uninstall:function( options ) {

            options = options || {};

            // let options override the default actions
            for (var k in options) {
                defaultSetupActions[k] = options[k];
            }
            options = defaultSetupActions;


//console.log(options);
//AD.log('<yellow><bold>process.cwd():</bold>'+process.cwd()+'</yellow>');

            var moduleDir = process.cwd();
            var moduleName = nameModule(moduleDir);
            var sailsDir = rootDir();
//            var parts = sailsDir.split(path.sep);
//            parts.pop();
            var sailsBasePath = sailsDir; // parts.join(path.sep);

//console.log('moduleName:'+moduleName);
//AD.log('<yellow><bold>sailsDir:</bold>'+sailsDir+'</yellow>');
//AD.log.error('sailsRelative:'+ shortPath(sailsBasePath, __dirname));

            // if we didn't find a sails Root dir:
            if (!isSailsRoot(sailsDir)) {

                // let's assume we are in a travis ci environment with initial npm install:
                // just exit peacefully
                AD.log('<yellow><bold>sailsDir:</bold>'+sailsDir+'</yellow>');
                AD.log('<yellow><bold>WARN:</bold> this module not installed inside a sails directory.  </yellow>');
                process.exit(0);
            }

            var filesToIgnore = [];
            var undoIgnore = [];


            AD.log();
            AD.log('uninstalling up module: <green><bold>'+moduleName+'</bold></green>');

            async.series([



                // 8th: remove our .gitignore 
                function(next) {

                    AD.log();
                    AD.log('Removing .gitignore modifications:');

                    // prepare the text to insert
                    var text = [];
                    var pluginOpen  = '\n\n########################\n### plugin:['+moduleName+']\n########################';
                    var pluginClose = '########################\n### end:'+moduleName+'\n########################\n\n';


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
                            contents = contents.replace(regExp, "");
//console.log();
//console.log('new Contents:');
//console.log(contents);
                            fs.writeFileSync(pathGitIgnore, contents);

                        } 

                    } else {

                        AD.log('<yellow><bold>SKIP:</bold> no .gitignore found.</yellow>');
                    }

                    next();
                },



                // 7th:  patch the config/local.js file with our adapter & config info
                function(next) {

                    AD.log();
                    AD.log('unPatching config/local.js:');

                    var ignoreList = options.ignore.configLocal || {};
//AD.log('ignoreList:', options.ignore);

                    patchLocal({moduleDir:moduleDir, ignore:ignoreList, isRemove:true }, next);

                },


                // 6th: patch the standard sails files with our additions:
                function(next) {


                    AD.log();
                    AD.log('Patching Sails files:');

                    var allPatches = optionsAll(options, 'patches');
 //                   options.patches.forEach(function(patch) {
                    allPatches.forEach(function(patch) {


                        patchIt({
                            patch:patch,
                            sailsDir:sailsDir,
                            moduleName:moduleName,
                            isRemove:true
                        });

                    });

                    next();
                },


                // 5th: now setup links to files in our Assets
                function(next) {

                    linkAssets({sailsDir:sailsDir, moduleDir:moduleDir, files:filesToIgnore, isRemove:true });
                    next();
                },

/*
                // 4th: now setup links to files in our module
                function(next) {

                    var allDirLinks = optionsAll(options, 'dirLinks');
                    var ignoreListOrig = options.ignore.dirLinks || {};
                    var ignoreList = {};
                    
                    // syncDirLinks expects the ignoreList paths to start with
                    // a '/', but that is not the expected way of entering 
                    // paths in our options file.  So go through the entries
                    // and make sure they start with '/':
                    for(var il in ignoreListOrig) { 
                        var newIL = il;

                        if (il.indexOf('/') != 0) {
                            newIL = '/'+ il;
                        }
                        ignoreList[newIL] = ignoreListOrig[il];
                    }


                    allDirLinks.forEach(function(dir) { 

                        syncDirLinks({
                            moduleDir:path.join(moduleDir, dir),
                            sailsDir:path.join(sailsDir, dir),
                            files:filesToIgnore,    // .gitignore  that is
                            ignoreList:ignoreList,  // ignore == don't link
                            sailsBase:sailsBasePath,
                            isRemove:true
                        });
                    });
                    next();
                },

*/

                // 3rd: prepare file links by 1st removing ALL links to files in our module
                function(next) {

                    AD.log();
                    AD.log('<green>unLinking Individual Files:</green>');

                    var listFiles = [];

                    var allDirLinks = optionsAll(options, 'dirLinks');

                    // get list of files to remove
 //                   options.dirLinks.forEach(function(dir){
                    allDirLinks.forEach(function(dir) { 

// AD.log('.dir:'+dir);
                        filesInThisModule({
                            list:listFiles,
                            dir:path.join(sailsDir,dir),
                            moduleDir:moduleDir
                        });

                    });

//AD.log(' files to remove:');
//AD.log(listFiles);

                    // go ahead and include any links to our assets:
                    // which don't show up in dirLinks
                    filesInThisModule({
                        list:listFiles,
                        dir:path.join(sailsDir,'assets'),
                        moduleDir:moduleDir
                    });

                    listFiles.forEach(function(filePath) {

                        fs.unlinkSync(filePath);
                        AD.log('<yellow><bold>unlinking:</bold></yellow><green>'+shortPath(sailsBasePath, filePath)+'</green>');

                        // should remove this from our .gitignore
                        undoIgnore.push(filePath);

                    });

                    next();
                },



                // 2nd: remove any symbolic links back to our directories
                function(next) {
                    AD.log();
                    AD.log('<green>Removing Symbolic Links:</green>');

                    var allLinks = optionsAll(options, 'links');
// AD.log('allLinks:', allLinks);

                    // now for each link
                    for (var k in allLinks) {

                        var link = path.join(sailsDir, k);
                        var sailsLink = AD.util.string.replaceAll(link, '[moduleName]', moduleName);
                        var currDir = path.join(moduleDir, allLinks[k]);



                        if (fs.existsSync(sailsLink)) {
                            fs.unlinkSync(sailsLink);

                            AD.log('<green><bold>removing:</bold> '+shortPath(sailsBasePath, sailsLink)+'</green>');

                        }
                    }

                    next();
                },


                // now remove any copied files:
                function(next) {

                    AD.log();
                    AD.log('<green>Removing Copied Files:</green>');



                    for (var cF in options.copyFiles) {
                        var modulePath = AD.util.string.replaceAll(cF,'[moduleName]',moduleName);
                        var sailsPath = AD.util.string.replaceAll(options.copyFiles[cF],'[moduleName]',moduleName);

                        // make sure this path is our sailsBase + path:
                        sailsPath = path.join(sailsBasePath, sailsPath);

                        if (fs.existsSync(sailsPath)) {
                            fs.unlinkSync(sailsPath);

                            AD.log('<green><bold>removing:</bold> '+shortPath(sailsBasePath, sailsPath)+'</green>');

                        }
                    }

                    next();

                },


/*

//// 
//// TODO: Remove only the directories specified here
////
                // finally remove any directories specified in our options:
                function(next) {
                    AD.log();
                    AD.log('<green>Remove Directories:</green>');
                    options.directories.forEach(function(directoryTmpl) {
                        var directory = AD.util.string.replaceAll(directoryTmpl,'[moduleName]',moduleName);
                        recursiveMakeDir(sailsDir, directory);

                    });

                    next();

                }
*/

            ], function(err,results) {

            });

        },

};




// what are the common config files that our routines should ignore:
var expectedConfigFiles = 'config.js, routes.js, policies.js, connections.js, bootstrap.js';




var defaultSetupActions = {
        directories:[],
        links:{
        // sailsDir : moduleDir
//            'api/models/[moduleName]'       : 'api/models',
            'api/controllers/[moduleName]'  : 'api/controllers',
            'views/[moduleName]' : 'views'
        },
        dirLinks:[
            // '/module/dir',    // ==> sails/module/dir
            'api/models',
            'api/services',
            'api/policies',
            'config'
        ],
        patches:[

            { path:path.join('config', 'routes.js'), append:true,  text:'require(\'[moduleName]\').routes(routes);\n' },
            { path:path.join('config', 'policies.js'), append:true, text:'require(\'[moduleName]\').policies(policies);\n'},
            { path:path.join('config', 'connections.js'), append:true, text:'require(\'[moduleName]\').connections(connections);\n'},
            { path:path.join('config', 'bootstrap.js'), append:true, text:'plugins.push(function(next){ require(\'[moduleName]\').bootstrap(next); });\n'},

        ],


        ignore:{
            //
            dirLinks:{},
            configLocal:{}
        }

};


function shortPath(base, full) {
    return full.replace(base, '');
}





//----------------------------------------------------------------------------
// Helper Routines
//----------------------------------------------------------------------------






/**
 * @function copyFile
 *
 * copy a file from a location in our plugin directory to a location in our
 * sails directory.
 *
 *
 * @param {object} options parameter to this fn() passed in as an object
 *                  {
 *                      modulePath: 'path/to/module/file.js',
 *                      sailsPath: 'path/to/sails/file.js', 
 *                  }
 */
var copyFile = function(options) {

    // if file to copy exists
    if (fs.existsSync(options.modulePath)) {

        // if file does not exists in sails
        if (!fs.existsSync(options.sailsPath)) {

            // read contents
            var contents = fs.readFileSync(options.modulePath, {encoding:'utf8'});

            // save file
            fs.writeFileSync(options.sailsPath, contents, {encoding:'utf8'});

            AD.log('<yellow><bold>copied:</bold></yellow>   '+ shortPath(options.moduleDir, options.modulePath) );

        } else {
            AD.log('<yellow><bold>exists:</bold>   sails already has file: '+shortPath(options.sailsDir, options.sailsPath)+'</yellow>');
        }

    } else {
        AD.log('<red><bold>missing:</bold>  '+shortPath(options.moduleDir, options.modulePath)+' not found </red>');
    }

}




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
 * @function isBuildableApp
 *
 * returns true if current directory looks like a buildable project.
 * returns false otherwise.
 *
 * @return {bool}  is the current directory a buildable project.
 */
var isBuildableApp = function(currPath) {

    var moduleDir = {
        // 'build.js':1,
        'build.appdev.js':1,
        'build.config.js':1,
        // 'build.html':1
    };
    return AD.util.fs.looksLikeDir(moduleDir, currPath);

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
    return AD.util.fs.looksLikeDir(moduleDir, currPath);

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
    return AD.util.fs.looksLikeDir(sailsDirs, currPath);

};



/**
 * @function linkAssets
 *
 * make sure the files in our assets folder appear in the sails assets.
 *
 * @param {object} options   the description of the directory
 *                          {
 *                              moduleDir:'', // file path to our module directory root
 *                              dirName:0   // dirName !exists in directory
 *                          }
 */
var linkAssets = function( options ) {

    if (typeof options.isRemove == 'undefined') options.isRemove = false;

    var sailsDir = options.sailsDir;
    var moduleDir = options.moduleDir;
    var files = options.files;

    var linkDirectory = function ( pathDir ) {

        // for each file in the directory path
        var files = fs.readdirSync(path.join(moduleDir, pathDir));
        files.forEach(function(file) {

            // if not a file reference I should ignore:
            if ('.gitkeep ..'.indexOf(file) == -1) {

//AD.log('linkDirectory: file:'+file);

                var pathSails = path.join(sailsDir, pathDir, file);
                var pathModule = path.join(moduleDir, pathDir, file);

                // if file does not exists
                if (!fs.existsSync(pathSails)) {

                    if (!options.isRemove) {


                        // create link
                        fs.symlinkSync(pathModule, pathSails);
                        AD.log('<green><bold>Linked:</bold>   '+shortPath(options.sailsDir, pathSails)+'</green>');

                        options.files.push(pathSails);

                    } else {

                        // our goal is to remove ourselves, so don't add anything here
                    }

                } else {

                    // if file is directory
                    var stat = fs.lstatSync(pathSails);
                    if (stat.isDirectory()) {

                       // recursive linkDirectory()
                        AD.log('<white><bold>exists:</bold>   '+shortPath(options.sailsDir, pathSails)+'</white>');
                        linkDirectory(path.join(pathDir, file));

                    } else {


                        if (stat.isSymbolicLink()) {

                            // i'm expecting links to be from root /path/to/file
                            var linkInfo = fs.readlinkSync(pathSails);

                            // but might be relative:  ../path/to/file
                            var resolvedPath = path.resolve(pathSails, linkInfo);

                            // if it points to a file in our module directory
                            if ((linkInfo.indexOf(moduleDir) == 0)
                                || (resolvedPath.indexOf(moduleDir) == 0)) {

                                if (!options.isRemove) {

                                    // it is one of ours so:
                                    AD.log('<white><bold>exists:</bold>   '+shortPath(options.sailsDir, pathSails)+' <yellow>(ours)</yellow> </white>');

                                    // add it to our list
                                    options.files.push(pathSails);

                                } else {

                                    // we want to remove this one:
                                    fs.unlinkSync(pathSails);

                                    AD.log('<yellow><bold>removed:</bold>   '+shortPath(options.sailsDir, pathSails)+'  </yellow>');


                                }

                            } else {

                                AD.log('<yellow><bold>warn:</bold>     asset file already linked: '+shortPath(options.sailsDir, pathSails)+'</yellow>');

                            }

                        } else {

                            // warn about existing file that matches our own
                            AD.log('<yellow><bold>warn:</bold>     asset file already exists in sails: '+shortPath(options.sailsDir, pathSails)+'</yellow>');

                        }
                    }
                }

            }

        });


    };

    linkDirectory('assets');


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
 * @function optionsAll
 *
 * returns an object/array of values that combine the default values,
 * with the additions listed in the options.additions settings.
 *
 * @param {object} options the setup options provided
 * @param {string} key  the option key we are working with.
 * @return {object/array}  depends on which key is provided
 */
var optionsAll = function(options, key) {

    // make sure we have options.additions
    if ('undefined' == typeof options.additions ) options.additions = {};


    // if no value exists for key then return null
    if (('undefined' == typeof options[key])
        && ('undefined' == typeof options.additions[key])) {

        return null;
    }


    //// we have something to work with so...

    var origValue = null;
    var allValues = null;
    var addValue = null;


    // determine what kind of value this should be: object/array
    if (options[key]) {
        origValue = options[key];
    } else {
        origValue = options.additions[key];
    }


    // process it as an array or object
    if ('number' == typeof origValue.length ) {

        //// process this as an array

        // be sure we have default values if missing:
        if ('undefined' == typeof options[key])  options[key] = [];
        if ('undefined' == typeof options.additions[key]) options.additions[key] = [];

        allValues = [];
        options[key].forEach(function(val){
            allValues.push(val);
        });
        options.additions[key].forEach(function(val){
            allValues.push(val);
        })

    } else {

        //// process this as an object

        // be sure we have default values if missing:
        if ('undefined' == typeof options[key])  options[key] = {};
        if ('undefined' == typeof options.additions[key]) options.additions[key] = {};


        allValues = {};
        for (var l in options[key]) {
            allValues[l] = options[key][l];
        }
        for (var al in options.additions[key] ) {
            allValues[al] = options.additions[key][al];
        }
    }


    return allValues;
    
}



/**
 * @function patchLocal
 *
 * updates the /config/local.js file with our pertinent info:
 *
 * @param {object} options  for this function
 *                  moduleDir : the directory path for where the module is
 *                  isRemove  : (bool) should we remove the info 
 * @param {fn} done  call this when finished: done(err, results);
 */
var patchLocal = function(options, done) {


    if (typeof options.isRemove == 'undefined') options.isRemove = false;

    var sailsDir = rootDir();
    var moduleDir = options.moduleDir;

    //// Apply the Connections to the config/local.js connections file
    var pathConfig = path.join(sailsDir, 'config', 'local.js');
    var pathConnections = path.join(moduleDir, 'config', 'connections.js');

    var configObj = require(pathConfig);
    var connectionsObj = require(pathConnections);

    if (typeof configObj.connections == 'undefined') {
        AD.log('<yellow><bold>WARN:</bold>     config/local.js did not have an connections set!</yellow>');
        configObj.connections = {};
    }

    for (var a in connectionsObj) {

        if (!options.isRemove) {

            // for adding the resource:
            if (typeof configObj.connections[a] == 'undefined') {
                configObj.connections[a] = connectionsObj[a];

                AD.log('<green><bold>patch:</bold>    added connection config ['+a+']</green>');
            } else {
                AD.log('<yellow><bold>SKIP:</bold>     connection config ['+a+'] already exists ... skipping</yellow>');
            }

        } else {

            // TO REMOVE the resource

           if (typeof configObj.connections[a] != 'undefined') {
                delete configObj.connections[a];

                AD.log('<green><bold>unpatch:</bold>    removed connection config ['+a+']</green>');
            } else {
                AD.log('<yellow><bold>SKIP:</bold>     connection config ['+a+'] not set ... skipping</yellow>');
            }

        }
    }

//AD.log('pathConfig:'+pathConfig);
//AD.log('pathConnections:'+pathConnections);
//
//
//AD.log(connectionsObj);


    //// Now scan for any additional config files and add their settings to
    //// config/local.js:

    var pathModuleConfigs = path.join(moduleDir, 'config');
    var files = fs.readdirSync(pathModuleConfigs);
    files.forEach(function(file) {

        // if this is not one of the expected config files:
        if (expectedConfigFiles.indexOf(file) == -1 ) {
//AD.log('file:'+file);

            // if this file isn't listed in our ignore list:
            if ('undefined' == typeof options.ignore[file]) {

                var newConfig = require( path.join(pathModuleConfigs, file));

                for (var configKey in newConfig) {

                    if (!options.isRemove) {
                        //// ADD this RESOURCE

                        // if this has not been added before:
                        if (typeof configObj[configKey] == 'undefined') {

                            configObj[configKey] = newConfig[configKey];

                            AD.log('<green><bold>patch:</bold>    added config option: '+configKey+'</green>');

                        } else {

                            AD.log('<yellow><bold>SKIP:</bold>     config option ['+configKey+'] exists </yellow>');

                            // check to see if there are any NEW parameters to add:
                            for (var i in newConfig[configKey]) {

                                if (typeof configObj[configKey][i] == 'undefined') {
                                    configObj[configKey][i] = newConfig[configKey][i];
                                    AD.log('  - <green><bold>added:</bold>config field: '+i+' </green>');
                                }
                            }

                        }

                    } else {

                        // REMOVE THIS RESOURCE
                        
                        // if this has been added before:
                        if (typeof configObj[configKey] != 'undefined') {

                            delete configObj[configKey];

                            AD.log('<green><bold>unpatch:</bold>    removed config option: '+configKey+'</green>');

                        }


                    } // end if .isRemove

                }

            } else {

                AD.log('<white><bold>ignore:   </bold>config file listed as ignore: '+file+'</white>');
            } // end if not in ignore list
        }


    });


    //// OK, now write this all back to the config/local.js

    // convert to string:
    var configData = JSON.stringify(configObj,null, 4);


    // now the port & environment settings can have additional data that isn't
    // reflected in the object values.  Make sure those are kept.
    var origConfigData = fs.readFileSync(pathConfig, { encoding:'utf8'});

    var portData = origConfigData.match(/^\s*"?port"?:(.+)$/m);
    if (portData) {
        if (portData[1]) {
            if (portData[1].indexOf(',') == -1) portData[1] += ',';
            configData = configData.replace(/^\s*"port":.+$/m, '    "port": '+portData[1].trim());
        }
    }

    var environmentData = origConfigData.match(/^\s*"?environment"?:(.+)$/m);
    if (environmentData) {
        if (environmentData[1]) {
            if (environmentData[1].indexOf(',') == -1) environmentData[1] += ',';
            configData = configData.replace(/^\s*"environment":.+$/m, '    "environment": '+environmentData[1].trim());
        }
    }


//AD.log(configData);

    // tack on the module.exports directive:
    configData = 'module.exports = '+configData;


    // OK, write this back to the config/local.js file
    fs.writeFileSync(pathConfig, configData, {encoding:'utf8'});


    done();

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

    if (typeof options.isRemove == 'undefined') options.isRemove = false;

    var filePath = path.join(options.sailsDir, options.patch.path);
    var textData = AD.util.string.replaceAll(options.patch.text,'[moduleName]',options.moduleName);

    var fileContents = fs.readFileSync(filePath, 'utf8');

    if (!options.isRemove) {

        // if file already has our text data => alert and move along
        
        if (fileContents.indexOf(textData) > -1) {

            AD.log('<yellow><bold>SKIP:     </bold>already patched: '+shortPath(options.sailsDir, filePath)+'</yellow>');

        } else {

            if (options.patch.append) {

                // simply append to the file
                fs.appendFileSync(filePath, textData);
                AD.log('<green><bold>PATCHED:  </bold>'+shortPath(options.sailsDir, filePath)+'</green>');

            }

        }

    } else {

        // if file has our text data => remove
        if (fileContents.indexOf(textData) > -1) {

            AD.log('<yellow><bold>unPATCHED:   </bold>removing patch: '+shortPath(options.sailsDir, filePath)+'</yellow>');
            fileContents = fileContents.replace(textData, "");

            fs.writeFileSync(filePath, fileContents);
        } 
    }

};




/**
 * @function patchStealConfig
 *
 * updates the /assets/stealconfig.js file with our module's build.config.js info:
 *
 * @param {object} options  for this function
 *                  moduleDir : the directory path for where the module is
 *                  isRemove  : (bool) should we remove the info 
 * @param {fn} done  call this when finished: done(err, results);
 */
var patchStealConfig = function(options, done) {


    if (typeof options.isRemove == 'undefined') options.isRemove = false;


    var contentsHeader = [
        '/*',
        ' *  This file is generated by our plugin setup routines.',
        ' * ',
        ' *  Do not make changes here, instead put them in your assets/[project]/build.config.js files',
        ' * ',
        ' *  ** Any changes to this file will be lost!  you have been warned ...',
        ' */ '
    ].join('\n');

    var sailsDir = rootDir();
    var moduleDir = options.moduleDir;

    // get pathStealConfig
    var pathStealConfig = path.join(sailsDir, 'assets', 'stealconfig.js');


    // open StealConfig
    var StealConfigContents = fs.readFileSync(pathStealConfig, { encoding:'utf8'});
    StealConfigContents = StealConfigContents.replace(contentsHeader, '').replace('steal.config(', '').replace('});', '}');
// AD.log('... configContents:',StealConfigContents);

    var StealConfig = JSON.parse(StealConfigContents);


    // find all buildable projects in our module:
    var assetsDir = path.join(moduleDir, 'assets');
    var projects = AD.module.buildableAppsInPath(assetsDir,  assetsDir);

// AD.log('... buildable projects:', projects);


    var log = function (color, action, s, key, value, msg) {
        var out = '<'+color+'>'+action+'</'+color+'> '+s+': ';
        if ( key != '') {
            out += '{ <green>"'+key+'"</green>:'+value+' } ';
        } else {
            out += value;
        }
        AD.log( out+' '+msg);
    }

    var mixin = function( newValues ) {

        for (var s in newValues ) {

            // s = [map, paths, shim, ...]
            if (_.isPlainObject(newValues[s])) {

                if (typeof StealConfig[s] == 'undefined') {
                    StealConfig[s] = {};
                    log('green', 'created:', s, '', "{}", '');
                }
                for(var key in newValues[s]) {


                    if (typeof StealConfig[s][key] == 'undefined') {

                        StealConfig[s][key] = newValues[s][key];
                        log('green', 'created:', s, key, newValues[s][key], '');
                    } else {

                        if ( _.isEqual(StealConfig[s][key], newValues[s][key] )) {
                            log('white', 'exists:', s, key, newValues[s][key], '<yellow>same</yellow>');
                        } else {
                            log('yellow', 'exists:', s, key, newValues[s][key], '<red>different</red>');
                        }
                    }

                }

            } else {

                if (typeof StealConfig[s] == 'undefined') {
                    StealConfig[s] = newValues[s];
                    log('green', 'added:', s, '', newValues[s], '');
                    // AD.log('<green>added:</green> stealconfig.js : '+s+':'+newValues[s]);
                } else {
                    if (_.isEqual(StealConfig[s], newValues[s])) {
                        log('white', 'exists:', s, '', newValues[s], '<yellow>same</yellow>');
                    } else {
                        log('yellow', 'exists:', s, '', newValues[s], '<red>different</red>');
                    }
                }
            }
        }
    }

    // foreach project
    projects.forEach(function(project) {

        // open build.config.js
        var data = require(path.join(project.path,'build.config.js'));

        // // add settings in StealConfig
        // _.merge(StealConfig, data);

        // OK, lodash is cool and I could easily do this with _.merge()
        // but I also want to display what is getting added/conflicted
        // in the process ... so here is the manual version:

        mixin(data);


    });
        
        
    // write out StealConfig -> pathStealConfig
    var newContents = JSON.stringify(StealConfig, null, 4);
    newContents = contentsHeader+'\nsteal.config('+newContents+');';
    fs.writeFileSync(pathStealConfig, newContents, {encoding:'utf8'});


    done();


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
            AD.log('<green><bold>created:  </bold>'+pathBase+'</green>');

        } else {

            AD.log('<yellow><bold>exists:   </bold></yellow><green>'+pathBase+'</green>');

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
 *                      files: [], // an array of links that get created,
 *                      sailsBase:'path/to/sails/directory/root'
 *                  }
 */
var syncDirLinks = function(options) {

    options.files = options.files || [];
    options.sailsBase = options.sailsBase || '';

    if (typeof options.isRemove == 'undefined') options.isRemove = false;


    var files = fs.readdirSync(options.moduleDir);
    files.forEach(function(file) {

        if ('.gitkeep '.indexOf(file) == -1) {

            var modulePath = path.join(options.moduleDir, file);
            var sailsPath = path.join(options.sailsDir, file);

            var sailsShortPath  = shortPath(options.sailsBase, sailsPath);


            if (typeof options.ignoreList[sailsShortPath] == 'undefined') {

                // are we trying to remove?
                if (!options.isRemove) {

                    // ADDING resources:

                    // if it doesn't exist
                    if (!fs.existsSync(sailsPath)) {

                        // add the link
                        fs.symlinkSync(modulePath, sailsPath);
                        AD.log('<green><bold>Linked:</bold>   '+sailsShortPath+'</green>');

                        // store this in our files array.
                        options.files.push(sailsPath);

                    } else {

                        // I expect these files to exist and not be linked so don't warn
                        // if one of these: config.js, routes.js, policies.js, connections.js
                        if (expectedConfigFiles.indexOf(file) == -1 ) {

                            // but any other file alert someone!
                            AD.log('<yellow><bold>EXISTS:</bold>   '+shortPath(options.sailsBase, sailsPath)+'</yellow>');
                            AD.log('       <yellow> could not create link! </yellow>');

                            // still store this in our files array.
                            options.files.push(sailsPath);

                        }

                    }


                } else {

                    //// SHOULD REMOVE

                    // if this isn't one of our expected files
                    if (expectedConfigFiles.indexOf(file) == -1 ) {

                        // if file exists
                        if (fs.existsSync(sailsPath)) {

                            fs.unlinkSync(sailsPath);
                            AD.log('<yellow><bold>unLinked:  </bold> '+shortPath(options.sailsBase, sailsPath)+'</yellow>');

                        }
                    }

                }

            } else {
                AD.log('<yellow><bold>ignored:</bold>  '+sailsShortPath+'</yellow>');
            }
        }

    });
};


