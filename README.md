raw-vm
===

Install
-------

`npm install --save raw-vm`

Usage
-----

```javascript
"use strict";
const vm = require('raw-vm');
const path = require('path');

vm('./script.js', {
    //Set the argv of process.argv inside script.js
    argv: process.argv.slice(2).concat(['--bla']),
    //Set argv0 of the process object inside script.js
    argv0: 'something',
    //Set the first argv item to commandPath
    //process.argv[0] = commandPath
    commandPath: __dirname,
    //Set the running script path in argv
    //process.argv[1] = scriptName
    scriptName: path.resolve('./script.js')
})
.then(environment=>{
    //Run script.js in a new vm context
    environment.run();
})
.catch(err=>console.error(err));

```

Something To Note
-----------------

Source map support is not available in V8/node so compiled scripts do not provide very useful errors.


About
-----

raw-vm is a unsafe vm that runs ecma scripts.

It relies on babel to compile not yet supported syntax.

The principle plugin for babel used inside raw-vm for now is [babel-preset-env](https://github.com/babel/babel-preset-env). It's no telling how long this dependency will be needed. Versions of nodejs come out quite quickly now so maybe that's not long.

rollup is used to compile javascript es2015 modules.

The options you pass to raw-vm allow it to pretend to be running the script as the main module. You can also set argv0 to make it pretend to be another runtime (vs the usual node path).

The usual globals are masked with various things like `Object.defineProperty()` getters. So altered globals won't effect the script running the vm. Also some globals have been converted to read only.

`require`, and `module.exports` can be used like usual.

If you want more control, and safety you should probably use [vm2](https://github.com/patriksimek/vm2) instead of this module.
