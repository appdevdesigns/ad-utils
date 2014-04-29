


var AD = {

    util: { }

};
module.exports = AD;


// log utilities
AD.log = require('./lib/log.js');


//now attach AD.module
AD.module = require('./lib/module.js');
AD.module.AD(AD);  // make sure the library can access the global AD obj.


// define our software abstraction layer
AD.sal = require('./lib/sal.js');


// now attach AD.spawn
AD.spawn = require('./lib/spawn.js');
AD.spawn.AD(AD);  // make sure the library can access the global AD obj.


// now our utils:
AD.util.clone   = require('./lib/utils/clone.js');
AD.util.obj     = require('./lib/utils/obj.js');
AD.util.string  = require('./lib/utils/string.js');
AD.util.uuid    = require('./lib/utils/uuid.js');
