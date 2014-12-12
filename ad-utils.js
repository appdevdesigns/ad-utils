

var path = require('path');


var AD = {

    util: { }

};
module.exports = AD;


// command line interface utilities
AD.cli = require('./lib/cli.js');
AD.cli._AD(AD);


// log utilities
AD.log = require('./lib/log.js');


//now attach AD.module
AD.module = require('./lib/module.js');
AD.module._AD(AD);  // make sure the library can access the global AD obj.


// define our software abstraction layer
AD.sal = require('./lib/sal.js');


// now attach AD.spawn
AD.spawn = require('./lib/spawn.js');
AD.spawn._AD(AD);  // make sure the library can access the global AD obj.


// unit testing tools:
AD.test = require('./lib/test.js');
AD.test._AD(AD);
AD.testData = require(path.join(__dirname, 'lib', 'testData', 'testData.js'));
AD.testData._AD(AD);


// now our utils:
AD.util.clone   = require('./lib/utils/clone.js');
AD.util.fs		= require('./lib/utils/fs.js');
AD.util.obj     = require('./lib/utils/obj.js');
AD.util.string  = require('./lib/utils/string.js');
AD.util.uuid    = require('./lib/utils/uuid.js');
