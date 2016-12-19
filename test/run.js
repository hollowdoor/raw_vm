"use strict";
const vm = require('../');
const path = require('path');


vm('./script.js', {
    argv: process.argv.slice(2).concat(['--bla']),
    argv0: 'something',
    commandPath: __dirname,
    scriptName: path.resolve('./script.js'),
    sourceMaps: true
})
.then(environment=>{
    environment.run();
})
.catch(err=>console.error(err));
