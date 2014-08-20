/*
 * AD.testData
 *
 * A set of utilities to help with generating and importing test data for our modules.
 *
 */
var path = require('path')
var Generate = require(path.join(__dirname, 'generator.js'));
var Import = require(path.join(__dirname, 'importor.js'));


module.exports = {

    _AD:function(adObj) {
        Generate._AD(adObj);
        Import._AD(adObj);
    },


    //
    // Utilities for helping with Generating new test data
    //
    generate:Generate,


    //
    // Utilities for importing out test data
    // 
    import:Import

}