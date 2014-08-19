/*
 * AD.testData.importor.importor_tasks.js
 *
 * A common set of Tasks that can be reused for our data importing needs.
 *
 */
var path = require('path');
var fs = require('fs');

var AD = null;

var Tasks = function(options) {
    this._datastore = {};
    this._toDos = [];

    this.log = function() {

        var newArgs = [];
        for (var i=0; i<arguments.length; i++) {
            newArgs.push(arguments[i]);
        }
        newArgs.unshift('<green>Task():</green> ');
        AD.log.apply( null , newArgs);
    }

}


module.exports = {

    _AD:function(adObj) {
        AD = adObj;
    },

    tasks:function(){
        return new Tasks();
    }
};


Tasks.prototype.datastore = function(key, value) {


    if (typeof value == 'undefined') {
        // this is a read operation:
        return this._datastore[key];
    } else {
        // write operation:
        this._datastore[key] = value;
    }
}


Tasks.prototype.logger = function(logFn) {
    this.log = logFn;
}





////
////  General Verification Tasks
////













/*
 * @function verifyGenerateTestData
 *
 * This is the initial alert warning the user that the Generate Test Data 
 * startup sequence is running.  The user has an opportunity to exit the 
 * process.
 *
 * @param [string] 
 */
Tasks.prototype.verifyGenerateTestData = function(options){
    var dfd = AD.sal.Deferred();

    AD.log();
    this.log('this routine will attempt to import a new set of test data from your current data files.');
    var qset =  {
        question: 'do you wish to continue:',
        data: 'continue',
        def : 'yes'
    };

    AD.cli.questions(qset)
    .fail(function(err){
        dfd.reject(err);
    })
    .then(function(data){

            switch (data.continue )
            {
                case "yes" :
                case "y":
                    dfd.resolve();;
                    break;

                default:
                    disableMessage(options, dfd);
                    break;

            }

    });

    return dfd;
}




/*
 * @function verifyModelsAreConfigured
 *
 * This is the initial alert warning the user that the Generate Test Data 
 * startup sequence is running.  The user has an opportunity to exit the 
 * process.
 *
 * @param [string] 
 */
Tasks.prototype.verifyModelsAreConfigured = function(options){
    var dfd = AD.sal.Deferred();

    AD.log();
    this.log('The following models are used to input data into your system:');

    // find any model reference in our procedures and list there here:
    var hashModels = {};
    this._toDos.forEach(function(entry){
        if (entry.model) {
            hashModels[entry.model] = 1;
        }
    });
    for (var model in hashModels) {
        AD.log('   <yellow>'+model+'</yellow>');
    }

    AD.log();
    AD.log('make sure their connection settings are pointing to the right settings for the data you want to import.');
    var qset =  {
        question: 'do you wish to continue:',
        data: 'continue',
        def : 'yes'
    };

    AD.cli.questions(qset)
    .fail(function(err){
        dfd.reject(err);
    })
    .then(function(data){

            switch (data.continue )
            {
                case "yes" :
                case "y":
                    dfd.resolve();
                    break;

                default:
                    AD.log();
                    AD.log('Update your models and then try again.');
                    disableMessage(options, dfd);
                    break;

            }

    });

    return dfd;
}




/*
 * @function verifyFilesAreOverwritten
 *
 * This step alerts the user to the files that will be overwriten
 * in the process of generating new test data.
 *
 * The user has an option to quit the process here.
 *
 * @param [string] pathToFiles
 */
Tasks.prototype.verifyFilesAreOverwritten = function(options){
    var dfd = AD.sal.Deferred();

    dfd.resolve();

    return dfd;
}




/*
 * @function verifyWeNeedSomeTestData
 *
 * This step checks to see that all our expected random data files
 * are present.
 *
 * This step will exit the process if a file is not found.
 *
 * @param [array] additionalFiles  array of filenames to check for in addition to the .importFiles
 *                                 specified by our to do tasks.
 * @param [string] pathToFiles     directory path to where our import files should be located
 */
Tasks.prototype.verifyWeNeedSomeTestData = function(options){
    var dfd = AD.sal.Deferred();

    dfd.resolve();

    return dfd;
}












//----------------------------------------------------------------------------
// Predefined Tasks 
//----------------------------------------------------------------------------








/*
 * @function createArrayOfFieldValues
 *
 * Convert a given array of items into an array of field values.
 *
 * @param [string] dataRef        : the global id of the array of objects to use
 * @param [string] destDataRef    : the destination global id where to put the new list
 * @param [string] field            : the name of the field to use for the values
 */
Tasks.prototype.createArrayOfFieldValues = function(options, next){
    var dfd = AD.sal.Deferred();

    dfd.resolve();

    return dfd;
}





/* 
 * @function importData
 *
 * This processor pulls data in from a file and stores it according to the 
 * given data reference.
 *
 * @param [string] importDirectory  : the directory of the import file
 * @param [string] importFile       : the name of the file to read from
 * @param [string] dataRef          : the data key to store this data under
 */
Tasks.prototype.importData = function(options) {
    var dfd = AD.sal.Deferred();
    
    dfd.resolve();

    return dfd;
}



/*
 * @function mapAtoB
 *
 * Map the values in data A.field = B.field.
 *
 * When we are finished, all the values in A.field will match those in B.field.
 *
 * @param [string] dataRef          : the global id of the data we are modifying
 * @param [string] mapRef           : the global id of the data that provides our map values
 * @param [array]  mapValues        : [if mapRef not given], this array will provide the values to use for B
 * @param [string] field            : the name of the field to use for mapping the values (shared by both)
 * @param [string] methodEmpty      : what method should we use if we run out of mapping values
 *                                      roundrobin  : reuse Map values in a round robin fashion 
 *                                      reuse : reuse the last value over and over and over ...
 */
Tasks.prototype.mapAtoB = function(options, next){
    var dfd = AD.sal.Deferred();

    dfd.resolve();

    return dfd;
}






/*
 * @function readModel
 *
 * Access a model to provide a dump of data.
 *
 * @param [string] model            : the name of the Model to use
 * @param [string] dataRef          : the global id of where to store the array of objects
 * @param [string] destGlobalRef    : the destination global id where to put the new list
 * @param [object] fieldIn          : a filter value indicating field(s) and existing globalValues
 *                                    that should be true:
 *                                      { 'ren_id' : 'listRenIDs' }  => { ren_id: globalData.listRenIDs }
 * @param [integer] limit           : limit the number of results 
 */
Tasks.prototype.readModel = function(options, next){
    var dfd = AD.sal.Deferred();

    dfd.resolve();
    
    return dfd;
}



/*
 * @function replaceAwithB
 *
 * replace the specified field-values in A with the field-values in B
 *
 *
 * @param [string] dataRef        : the global id of the data we are modifying
 * @param [string] bRef             : the global id of the data that provides our new values
 * @param [array] fields            : an array of fields that will be replaced.   
 * @param [string] methodEmpty      : what method should we use if we run out of mapping values
 *                                      roundrobin  : reuse B values in a round robin fashion 
 *                                      reuse : reuse the last B value over and over and over ...
 */
Tasks.prototype.replaceAwithB = function(options, next){
    var dfd = AD.sal.Deferred();

    dfd.resolve();

    return dfd;
}



/*
 * @function replaceStrings
 *
 * Step through a list of data and perform string replacements on a field value(s).
 *
 * @param [string] dataRef        : the global id of where the array of objects to use
 * @param [array]  fields           : which fields to perform the string replacements on
 * @param [bool]   toLower          : convert field to lower case (default:false)
 * @param [hash]   replacements     : a hash of 'old string' : 'new string'  values for the
 *                                    string replacements
 */
Tasks.prototype.replaceStrings = function(options, next){
    var dfd = AD.sal.Deferred();

    
    dfd.resolve();
    
    return dfd;
}



/*
 * @function saveData
 *
 * For the Import Process, we simply work backwards from the saveData task.
 *
 * 
 *
 * @param [string] dataRef          : the datastore id of the data to save
 * @param [string] outputFile       : the name of the file to save it to
 * @param [string] destinationDirectory : the path to the destination directory to store this data.
 */
Tasks.prototype.saveData = function(options, next){
    var dfd = AD.sal.Deferred();

    var filePath = options.destinationDirectory || this.datastore('default.saveData.destinationDirectory');
    if (filePath) {

        // read file
        var filePathName = path.join(filePath, options.outputFile);
        readIt(filePathName)
        .fail(function(err){
            AD.log.error('unable to read data from file['+filePathName+'] : ', err);
            dfd.reject(err);
        })
        .then(function(data){

            if (options.log) {
                var count = data.length +'';
                for (var i=count.length; i<=4; i++) {
                    count = ' '+count;
                }
                var log = options.log.replace('[count]', count);
                AD.log(log);
            }

            var Model = sails.models[options.model.toLowerCase()];

            var createThis = function(indx) {
                if (indx >= data.length) {
                    dfd.resolve();
                } else {

                    Model.create(data[indx])
                    .fail(function(err){
                        AD.log.error('... error creating entry:  model['+options.model+'] entry:', data[indx]);
                        dfd.reject(err);
                    })
                    .then(function(obj){
                        createThis(indx+1);
                    })
                    .done();
                }
            }

            createThis(0);

        })



    } else {

        AD.log();
        AD.log.error('task.saveData() called with no destinationDirectory set.', options);
        if (next) next('task.saveData() problem!');
        dfd.reject('task.saveData() problem!');
    }
    
    return dfd;
}




/*
 * @function storeValue
 *
 * Save the provided value to our datastore.
 *
 * @param [string] dataRef          : the global id of where to store the value
 * @param [string] value            : the value to store
 */
Tasks.prototype.storeValue = function(options, next){
    var dfd = AD.sal.Deferred();

    if (typeof options.dataRef == 'undefined') {

        AD.log();
        AD.log.error(' task.storeData called without a dataRef!', options);
        dfd.reject('task.storeData() : no dataRef provided');

    } else if (typeof options.value == 'undefined') {

        AD.log();
        AD.log.error(' task.storeData called without a value!', options);
        dfd.reject('task.storeData() : no value provided');

    } else {

        this.datastore(options.dataRef, options.value);
        dfd.resolve();
    }
    
    return dfd;
}







//----------------------------------------------------------------------------
// Helper functions
//----------------------------------------------------------------------------





/**
 * @function disableMessage
 *
 * A common message on how to turn off this startup routine.
 */
var disableMessage = function(options, dfd) {
    
    var moduleConfig = options.moduleConfig || '[configFile].js';

    AD.log();
    AD.log('If you wish to disable this on startup, be sure to set:');
    AD.log('    generate_test_data:<yellow><bold>false</bold></yellow>,');
    AD.log();
    AD.log('in your <yellow>'+path.join('config', 'local.js')+'</yellow> and <yellow>'+path.join('config', moduleConfig )+'</yellow> settings.');
    AD.log();
    var err = new Error('don\'t want to continue');
    dfd.reject(err);
}



/**
 * @function dotLine
 *
 * This display util fills in a series of '.' to complete the length of data
 * to the provided length parameter.
 *
 * @param [string] data
 * @param [integer] length  : how long should the final line be?
 */
var dotLine = function(data, length) {
    length = length || 65;
    var newLine = '';
    var count=0;
    newLine += data;
    for (var i=newLine.length; i<=length; i++) { newLine+='.';}
    return newLine;
}



/*
 * @function readIt
 *
 * Read in the data description from a specified file.
 *
 * @param {string} fileName   The name of the test file to read in.
 *                            NOTE: expected to be in the same directory of this file.
 * @param {fn} cb  The callback fn(err, data) to use when this operation is finished.
 */
var readIt = function(filePath, cb) {
    var dfd = AD.sal.Deferred();

    fs.readFile(filePath, 'utf8', function(err, data) {
//console.log('fileName:'+fileName);
        if (err) {
            if (cb) cb(err);
            dfd.reject(err);
        } else {
            var jData = JSON.parse(data);
            if (cb) cb(null, jData);
            dfd.resolve(jData);
        }
    });

    return dfd;
}



/*
 * @function writeIt
 *
 * Write the data into the specified file.
 *
 * @param {string} fileName   The name of the test file to write to.
 *                            NOTE: expected to be in the same directory of this file.
 * @param {fn} cb  The callback fn(err, data) to use when this operation is finished.
 */
var writeIt = function(fileName, data, cb) {
// console.log('... writeIt:');
    var pathFile = path.join(fileName);

    if (typeof data != 'string') {
        data = JSON.stringify(data, null, 4);
    }

    fs.writeFile(pathFile, data,  {encoding:'utf8'}, function(err) {
// console.log('pathFile:'+pathFile);
        if (err) {
            cb(err);
        } else {
            cb();
        }
    });

}

