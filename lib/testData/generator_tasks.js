/*
 * AD.testData.generator.generator_tasks.js
 *
 * A common set of Tasks that can be reused for our data generation needs.
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
    this.log('this routine will attempt to generate a new set of test data from your current databases.');
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
    this.log('The following models are used to gather data from your existing database:');

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
    AD.log('make sure their connection settings are pointing to the right settings for the data you want to pull from.');
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

    AD.log();
    this.log('The following files will be overwritten with new data:');

    var pathPre = options.pathToFiles; //path.join('setup', 'test_data') + path.sep;

    this._toDos.forEach(function(entry){
        if (entry.outputFile) {
            AD.log('   '+pathPre+'<yellow>'+entry.outputFile+'</yellow>');
        }
    });

    AD.log();
    AD.log('If you want to keep any of this data then make a backup now.');
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
                    AD.log('Backup your data and then try again.');
                    disableMessage(options, dfd);
                    break;

            }

    });

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

    AD.log();
    this.log('These data files are required:');

    var allFound = true;
    var fileList = options.additionalFiles || [];  

    // add any importFiles from our defined list of processors:
    this._toDos.forEach(function(entry){
        if (entry.importFile) {
            fileList.push(entry.importFile);
        }
    });

    AD.log();
    AD.log('directory path:<yellow>'+options.pathToFiles+'</yellow>');
    AD.log();

    fileList.forEach(function(file){

        var filePath = path.join(options.pathToFiles, file);
        if (fs.existsSync(filePath)) {
            AD.log( dotLine(file)+'<green>found</green>');
        } else {
            AD.log( dotLine(file)+'<red><bold>not found</bold></red>');
            allFound = false;
        }
    });


    if (allFound) {

        AD.log();
        AD.log('all required data is accounted for.  <green><bold>Lets continue ...</bold></green>');
        AD.log();
        AD.log();
        dfd.resolve();

    } else {

        AD.log();
        AD.log.error('we are missing some files!');
        AD.log();
        AD.log();
        dfd.reject('missing data files.');

    }

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

    if (typeof options.uniqueValues == 'undefined') {
        options.uniqueValues = false;
    }


    var newList = [];
    if (options.uniqueValues) {

        var hash = {};
        // update the guid fields:
        this.datastore(options.dataRef).forEach(function(data){
            hash[data[options.field]] = 1;
        })

        for (var h in hash) {
            newList.push(h);
        }

    } else {
        // just push them all on the new list

        // update the guid fields:
        this.datastore(options.dataRef).forEach(function(data){
            newList.push(data[options.field]);
        })
    }

    this.datastore(options.destDataRef, newList);

// console.log('... createIDList => ['+entry.destDataRef+'] :');
// console.log(globalData[entry.destDataRef]);

    if (next) next();
    dfd.resolve(newList);
    
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
    var self = this;

    var pathToFile = options.importDirectory || this.datastore('default.importData.importDirectory');
    if (pathToFile) {

        readIt(path.join(pathToFile, options.importFile))
        .fail(function(err){
            AD.log();
            AD.log.error('error reading in import file ['+options.importFile+'] :', err);
            dfd.reject(err);
        })
        .then(function(entries){
            self.datastore(options.dataRef, entries);
            dfd.resolve(entries);
        })

    } else {

        AD.log();
        AD.log.error('task.importData(): called without an importDirectory set:', options);
        AD.log();
        dfd.reject('task.importData(): called without an importDirectory set');
    }

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


    //// TODO: do some error checking here

    var A = this.datastore(options.dataRef);
    var hashA = {};
    A.forEach(function(value){
        var val = value[options.field];
        hashA[val] = val;
    })

    var B = null;

    if (options.mapRef) B = this.datastore(options.mapRef);
    else B = options.mapValues;

// console.log('... mapAtoB: B has '+B.length+' entries');
    var hashB = {};
    var cloneB = [];
    B.forEach(function(value){
        var val = value[options.field];
        hashB[val] = val;
        cloneB.push(value);
    })
    
// console.log('... mapAtoB: cloneB has '+cloneB.length+' entries');
// console.log('... hashB:');
// console.log(hashB);

    var method = options.methodEmpty.toLowerCase();


    //// at this point, 
    //// hashA represents { currentVal: currentVal }
    //// hashB represents { acceptableVal : acceptableVal }
    //// cloneB represents a reusable set of acceptable values that we can modify without 
    ////        trashing the globalData



    //// now step through each hashA to find a suitable acceptable value
    for (var currentValue in hashA) {
// console.log('... currentValue:'+currentValue);
        // if currentValue isn't an acceptable value
        if (typeof hashB[currentValue] == 'undefined') {

            var currB = cloneB.shift();                 // pull the first B value
// console.log('... mapping ['+currentValue+'] => ['+currB[options.field]+']');
            hashA[currentValue] = currB[options.field];   // match the hashA to that value

            switch(method) {
                case 'roundrobin':
                    cloneB.push(currB);                 // stick this at the end to be reused again.
                    break;

                case 'reuse':
                    if (cloneB.length == 0)             // if we are out of values
                        cloneB.push(currB);             // reuse this last entry.
                    break;
            }
        
        }
    }


    //// now 
    //// hashA represents { currentVal: acceptableValue }

    
    // create a new list of data that contains the values of A with field remapped to 
    // an acceptable value:
    var newData = [];
    A.forEach(function(value){
        value[options.field] = hashA[ value[options.field] ];
        newData.push(value);
    })


    // now save this 
    this.datastore(options.dataRef, newData);
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
    var self = this;


    if ('undefined' ==  typeof options.model) {
        dfd.reject('task.readModel() : no model defined!');
    } else if ('undefined' == typeof sails.models[options.model.toLowerCase()]) {
        dfd.reject('task.readModel() : model['+options.model+'] not found!');
    } else {


        var Model = sails.models[options.model.toLowerCase()];
        var filter = options.filter || {};

        if (options.fieldIn) {
            for (var f in options.fieldIn) {
                filter[f] = self.datastore(options.fieldIn[f]);
            }
        }

        // check for this after any other filter value checks!
        if (options.limit) {
            filter = { where: filter,  limit:options.limit };
        }

        Model.find(filter)
        .fail(function(err){
            AD.log('task.readModel() : error trying to read in '+options.model+' data :', err, 'filter:', filter);
            dfd.reject(err);
        })
        .then(function(list){

             self.datastore(options.dataRef, list);
             dfd.resolve(list);
        })
        .done();

    }
    
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

    var list = this.datastore(options.dataRef);
    var bData = this.datastore(options.bRef);
    var cloneB = AD.util.clone(bData);

    var updatedList = [];
    list.forEach(function(entry){

        var randomData = cloneB.shift();
        
        switch(options.methodEmpty) {

            case 'roundrobin':
                cloneB.push(randomData);
                break;

            case 'reuse':
                if (cloneB.length ==0) {
                    AD.log('... <yellow>ran out of '+options.bRef+' data ...</yellow> reusing last one.');
                    cloneB.push(randomData);
                }
                break;
        }
        

        // now replace each of the listed field values:
        options.fields.forEach(function(field){
            entry[field] = randomData[field];
        })

        updatedList.push(entry);
    })

    this.datastore(options.dataRef, updatedList);

    if (next) next();
    dfd.resolve(updatedList);
    

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

    options.fields = options.fields || [];
    if (typeof options.toLower == 'undefined') options.toLower = false;
    options.replacements = options.replacements || {};

    var data =  this.datastore(options.dataRef);
    var newData = [];

    data.forEach(function(entry) {

        options.fields.forEach(function(field){

            if (typeof entry[field] != 'undefined') {

                if (typeof entry[field] == 'string') {
                    if (options.toLower) {
                        entry[field] = entry[field].toLowerCase();
                    }
                    for (var r in options.replacements) {
                        entry[field] = AD.util.string.replaceAll(entry[field], r, options.replacements[r]);
                    }
                } else {
                    AD.log(' provided field is not a string type: '+field);
                }
            }
        })

        newData.push(entry);
    })

    this.datastore(options.dataRef, newData);
    dfd.resolve();
    
    return dfd;
}



/*
 * @function saveData
 *
 * Save the current state of data to a file.
 *
 * @param [string] dataRef          : the datastore id of the data to save
 * @param [string] outputFile       : the name of the file to save it to
 * @param [string] destinationDirectory : the path to the destination directory to store this data.
 */
Tasks.prototype.saveData = function(options, next){
    var dfd = AD.sal.Deferred();

    var filePath = options.destinationDirectory || this.datastore('default.saveData.destinationDirectory');
    if (filePath) {

        var data = this.datastore(options.dataRef);

        if (options.log) {
            var count = data.length +'';
            for (var i=count.length; i<=4; i++) {
                count = ' '+count;
            }
            var log = options.log.replace('[count]', count);
            AD.log(log);
        }

        writeIt(path.join(filePath, options.outputFile), data, function(err){
            if (err) {
                if (next) next(err);
                dfd.reject(err);

            } else {
                if (next) next();
                dfd.resolve();
            }
        });

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

