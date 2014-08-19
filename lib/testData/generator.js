/*
 * AD.testData.generate
 *
 * A set of utilities to help with generating test data for our modules.
 *
 * The idea here is that we have a system that currently has good data that we want
 * to export as test data.
 *
 * We can specify Tasks that allow us to work with that data here.
 *
 */
var path = require('path');
var AD = {};
var Tasks = require(path.join(__dirname, 'generator_tasks.js'));


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
                        done('unknown task :'+entry.task);
                    }


                    // otherwise run the processor:
                    taskList[entry.task](entry)
                    .fail(function(err) {
                        AD.log();
                        AD.log.error('unable to complete process ['+entry.task+'] :', err, 'entry:', entry);
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