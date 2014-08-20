/*
 * AD.testData
 *
 * A set of utilities to help with generating and importing test data for our modules.
 *
 */
var path = require('path');


var AD = {};
var Tasks = require(path.join(__dirname, 'importor_tasks.js'));


module.exports = {

    _AD:function(adObj) {
        AD = adObj;
        Tasks._AD(adObj);
    },


    //
    // Return a copy of our common tasks
    //
    tasks:function() {
        return Tasks.tasks();
    },


    //
    // Process a list of Tasks
    // 
    do:function(options, done) {


        //// Step through each of our toDos:
        var toDos = options.toDo;
        var taskList = options.tasks;
        taskList._toDos = toDos;

        var doTask = function(indx) {

            if (indx >= toDos.length) {

                done();

            } else {

                var entry = toDos[indx];

                if (entry.task) {


                    // verify processor info is correct:
                    if (typeof taskList[entry.task] == 'undefined') {
                        AD.log();
                        var err = new Error('unknown task :'+entry.task);
                        done(err);
                    }


                    // otherwise run the processor:
                    taskList[entry.task](entry)
                    .fail(function(err) {
                        AD.log();
                        AD.log.error('unable to complete process ['+entry.task+'] :', err, ' \nentry: ', entry);
                        done(err);
                    })
                    .then(function(){
// AD.log('... calling doTask('+(indx+1)+')');

                        doTask(indx+1);
                    });

                } else {

                    AD.log('... no task defined! processor:'+entry.processor);
                    doTask(indx+1);
                }
            }
        }
        doTask(0);

    }

}