/*
 * AD.cli
 *
 * A set of utilities for interacting with the command line interface (cli).
 *
 */
var q = require('read');
var AD = null;


var CLI = {};

module.exports = CLI;



/**
 * @function AD.cli._AD
 *
 * pass in the global AD object (this one) to use in our routines here.
 */
CLI._AD=function(ADObj) { AD = ADObj; };



/**
 * @function AD.cli.question
 *
 * This method performs a series of command line questions and returns the
 * answers as the 2n parameter in the callback done(err, data);
 *
 * Each question should be in the format:
 *
 * @codestart
 * {    cond:function(data) {return data.connectionType == 'port'},
 *      question:'host [localhost,http://your.server.com]:',
 *      data:'host',
 *      def :'localhost',
 *      post: function(data) { data.host = data.host.toLowerCase(); },
 *      then: [
 *              { cond:fn(){}, question:'follow up:', data:'fup', def:'yo', then: [] }
 *      ]
 * }
 * @codeend
 *
 * cond:  is a function that returns true or false.  If the result is false,
 *        the question is skipped.  The function will be passed in the current
 *        data result at the time of the question.
 *        If omitted, the default is true.
 *
 * post:  is a function that is run after the input data has been given by the
 *        user.  In this function you can modify the data, or update other
 *        values based on the current values of data.
 *
 * question: the question that is displayed on the command line
 *
 * data:  the name of the variable to store the answer as.  In the above ex,
 *        data.host will receive the result of the question.
 *
 * def:   The default value.  If the user hits [return] without any data, this
 *        will be the value.
 *
 * then:  An array of follow up questions that will be asked after this one is
 *        answered.
 *
 * @param {array} questions  an array of question objects to process
 * @param {function} done    the callback to call when all questions are done
 */
var q = require('read');
CLI.questions = function(questions, done) {
    var dfd = AD.sal.Deferred();

    questions = questions || null;
    done = done || null;
    var data = {};

    if (questions) {

        // define what a question object should look like
        var template = {
                cond: function() {return true;},
                post: function() {},
                question:'no question given',
                data:'',
                def :'default',
                then:[]
        };

        // this fn() will make sure any missing properties are set
        var completeTemplate = function (curr) {
            for (var t in template) {
                if (typeof curr[t] == 'undefined') {
                    curr[t] = template[t];
                }
            }
            return curr;
        };


        // recursively process our questions in order:
        var recurseQuestion = function(currentPrompt, cb) {

            currentPrompt = completeTemplate(currentPrompt);

            // if the condition is true for this entry
            if ( currentPrompt.cond(data) ) {

                // ask your question:
                var opt = {};
                if (currentPrompt.silent) opt.silent = currentPrompt.silent;
                if (currentPrompt.replace) opt.replace = currentPrompt.replace;
                opt.prompt = '?   '+currentPrompt.question;
                opt['default'] = currentPrompt.def;

                q(opt, function(err, value, isDefault) {


                    if (err) {

                        AD.log.error('Error from question.  Did you hit ctl^c ?');
                        AD.log.error(err);
                        if (cb) cb(err, data);

                    } else {

//console.log('value:['+value+']');
//console.log('isDefault:'+isDefault);

                        //store the value
                        data[currentPrompt.data] = value;

                        // post process the given value
                        currentPrompt.post(data);


                        // if there are followup questions
                        if (currentPrompt.then.length > 0 ) {

                            var recurseThen = function( indx, list, cb) {
                                if (indx >= list.length) {
                                    if (cb) cb(null);
                                } else {
                                    recurseQuestion(list[indx], function(err){
                                        if (err) {
                                            if (cb) cb(err);
                                        } else {
                                            recurseThen(indx+1, list, cb);
                                        }
                                    });
                                }
                            };

                            recurseThen(0, currentPrompt.then, function(err){
                                // all then:[] processed now:
                                if (cb) cb(err);
                            });

                        } else {
                            // nothing else to do,
                            if (cb) cb(null);
                        }

                    }

                });

            } else {

                // condition is not valid, so don't process this one.
                if (cb) cb(null);  // return with no error
            }

        }; // end recurseQuestions


        // start the recursion
        recurseQuestion(questions, function(err){

            // call the provided cb
            if (done) {done(err, data);}

            // now process our deferred
            if (err) {
                dfd.reject(err);
            } else {
                dfd.resolve(data);
            }
        });

    } else {
        if (done) done(null, data);
        dfd.resolve(data);
    }


    return dfd;
};



//----------------------------------------------------------------------------
// Helper Routines
//----------------------------------------------------------------------------


