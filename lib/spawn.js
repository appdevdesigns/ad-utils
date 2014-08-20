/*
 * AD.spawn
 *
 * A set of utilities to make interacting with spawned processes easier.
 *
 */

var spawn = require('child_process').spawn;
var $ = require('jquery-deferred');


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
    _AD:function(obj) {
        AD = obj;
    },


    /**
     * @function AD.spawn.command
     *
     * Issues a single spawn command.
     *
     * @codestart
     *
     * var responses = {
     *           'name:':'\n',
     *           'entry point:': 'module.js\n',
     *           'test command:': 'make test\n',
     *           'keywords': '\n',
     *           'license': '\n',
     *           'Is this ok?': '\n'
     *   };
     * AD.spawn.command({
     *       command:'npm',
     *       options:['init'],
     *       shouldEcho:false,
     *       responses:responses,
     *       exitTrigger:'ok?',
     *   })
     *   .fail(function(err){
     *       AD.log.error('<red> NPM init exited with an error</red>');
     *       AD.log(err);
     *       process.exit(1);
     *   })
     *   .then(function(code){
     *       done();
     *   });
     * @codeend
     *
     * @param {object} opt  the options to send this command:
     *
     *        opt.command     {string} the command to issue
     *
     *        opt.options     {array}  an array of additional command line
     *                                 arguments
     *
     *        --- optional arguments ---
     *
     *        [opt.exitTrigger] {string} consider this matching text string
     *                                 the end of the script
     *        [opt.onData]    {function} a fn() to pass data returned back
     *                                 from the script to.
     *
     *        [opt.responses] {object} a hash of text keys and responses to
     *                                 send the running script
     *
     *        [opt.shouldEcho]{bool}   echo the text to the screen? [true]
     *        [opt.textFilter]{array}  of strings that will prevent echoing
     *                                 of data to console.
     *                                 only matters if shouldEcho == true
     *        [opt.log]       {string} display on console before running
     *                                 command.
     *        [opt.shouldPipe]{bool}   pipe the current stdin to the spawned
     *                                 process?  [false]
     *                                 useful for command line tools that
     *                                 want to pipe the users input to the
     *                                 spawned script.
     * @return {Deferred}
     */
    command: function(opt) {  // command, options, responses, exitTrigger

        var dfd = $.Deferred();

        // make sure optional values are defaulted
        opt.responses = opt.responses || null;

        if(typeof opt.shouldEcho == 'undefined') opt.shouldEcho = true;

        opt.onData = opt.onData || function(){};

        opt.exitTrigger = opt.exitTrigger || '_AD.spawn.no.exit.trigger_';

        opt.textFilter = opt.textFilter || [];

        opt.log = opt.log || null;

        opt.shouldPipe = opt.shouldPipe || false;



        // display optional log
        if (opt.log) AD.log(opt.log);

        // issue the command
        cmd = spawn(opt.command, opt.options);


        //Listen for stdout messages
        cmd.stdout.on('data', function (data) {

            data = data.toString();

            // should we echo them?
            if (opt.shouldEcho) {

                // does data pass our text filters?
                if (!isFiltered(data, opt.textFilter)) {

                    data = data.trim();

                    // if this isn't one of our embedded questions
                    if (data.indexOf('?  ') == -1) {

                        AD.log(data.replace("\n", ""));

                    } else {
                        // leave out the spacing
                        AD.log.raw(data);
                    }
                }
            }

            // any responses to handle?
            if (opt.responses) {
                consoleResponse(cmd, data, opt.responses);
            }

            // call the onData fn();
            opt.onData(data);

            // Catch the final response text and then continue
            if (data.indexOf(opt.exitTrigger) != -1){
                unpipeStdin(cmd, opt.shouldPipe);
                dfd.resolve(0);
            }

        });


        //Listen for stderr messages
        cmd.stderr.on('data', function (data) {

            data = data.toString().trim();

            if (data != '') {
                
                // does data pass our text filters?
                if (!isFiltered(data, opt.textFilter)) {

                    AD.log('<yellow><bold>stderr:</bold>[' + data + ']</yellow>');
                }
            }


            // this was an error?
        });


        //Listen for error messages
        cmd.on('error', function (err) {
            AD.log.error('err: '+err);
            unpipeStdin(cmd, opt.shouldPipe);
            dfd.reject(err);
        });


        //Listen for closing
        cmd.on('close', function (code) {
//          console.log('child process exited with code ' + code);
            unpipeStdin(cmd);
            dfd.resolve(code);
        });


        // now tie in current stdin to our command:
        pipeStdin(cmd, opt.shouldPipe);

        return dfd;
    },



    /**
     * @function AD.spawn.series
     *
     * Issues multiple spawn commands in series.
     *
     * @codestart
     * var listDependencies = [
     *
     *   // > npm install appdevdesigns/ad-util --save
     *   { command:'npm', options:[ 'install',  'appdevdesigns/ad-utils', '--save'], textFilter:['npm', 'http'], log:'<green><bold>installing:</bold> ad-utils </green>', shouldEcho:false },
     *
     * ];
     *
     * AD.spawn.series(listDependencies)
     * .fail(function(err){
     *     AD.log();
     *     AD.log.error('<red><bold>Error:</bold> Installing dependencies</red>');
     *     AD.log(err);
     *     AD.log();
     *     process.exit(1);
     * })
     * .then(function(data){
     *     done();
     * });
     * @codeend
     *
     * @param {array} cmds  an array of options
     * @return {Deferred}
     */
    series:function( cmds ) {
        var dfd = $.Deferred();

        var runIt = function(indx, list) {

            if (indx >= list.length) {
                dfd.resolve();
            } else {

                // make sure a retry value is set:
                if ('undefined' == typeof list[indx].retry )  list[indx].retry = 0;

                AD.spawn.command(list[indx])
                .fail(function(err){
                    dfd.reject(err);
                })
                .then(function(code){
                    if ((code > 0) && (list[indx].retry > 0)) {

                        AD.log('<red><bold>error:</bold></red> \''+list[indx].command + ' '+ list[indx].options.join(' ')+'\'  exited with code ('+code+') ... retries ('+list[indx].retry+')');
                        list[indx].retry--;
                        runIt(indx, list);  // repeat attempt

                    } else {
                        runIt(indx+1, list);
                    }
                });

            }

        };
        runIt(0, cmds);

        return dfd;
    }

};




/**
 * @function consoleResponse
 *
 * checks to see if provided data matches one of the expected responce tags
 * and returns the response.
 *
 *
 * @param {object} cmd  the spawn() object to write to.
 * @param {buffer} data the current data returned from the cmd process
 * @param {object} responses  the object hash representing the responses
 *                  the hash is in form:  'textMatch' : 'text to send'
 *                  ex:
 *                  var responses = {
 *                        'name:':'\n',
 *                        'entry point:': 'module.js\n',
 *                        'test command:': 'make test\n',
 *                        'keywords': '\n',
 *                        'license': '\n',
 *                        'Is this ok?': '\n'
 *                  };
 * @return {Deferred}
 */
function consoleResponse (cmd, data, responses) {

    var dataString = data.toString();

    // foreach possible response:
    for (var r in responses) {

        // if string trigger exists in data
        if (dataString.indexOf(r) != -1) {

            // write the response
            cmd.stdin.write( responses[r]);
        }
    }
}



/**
 * @function isFiltered
 *
 * returns true if the provided data contains one of the text filters
 * specified in filter array.
 *
 * Used by: AD.spawn.command()
 *
 * @param {buffer} data the current data returned from the cmd process
 * @param {array}  filters  an array of strings
 * @return {bool}  true if data contains one of the filters, false otherwise
 */
function isFiltered (data, filters) {
    var str = data + '';
    var foundMatch = false;

    filters.forEach(function(filter){

        if (str.indexOf(filter) != -1) {
            foundMatch = true;
        }
    });

    return foundMatch;
}



/**
 * @function pipeStdin
 *
 * connects the current process.stdin to the given spawn command.
 *
 * Used by: AD.spawn.command()
 *
 * @param {object} cmd the current spawn command
 * @param {bool}   shouldPipe are pipes allowed right now?
 */
function pipeStdin (cmd, shouldPipe) {

    if (shouldPipe) {
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.pipe(cmd.stdin);
    }
}



/**
 * @function unpipeStdin
 *
 * unconnects the current process.stdin from the given spawn command.
 *
 * Used by: AD.spawn.command()
 *
 * @param {object} cmd the current spawn command
 * @param {bool}   shouldPipe are pipes allowed right now?
 */
function unpipeStdin (cmd, shouldPipe) {
    if (shouldPipe) {
        process.stdin.unpipe(cmd.stdin);
        process.stdin.pause();
    }
}