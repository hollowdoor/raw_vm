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

About
-----

raw-vm is a unsafe vm that runs ecma scripts.

It relies on babel to compile not yet supported syntax.

The principle plugin for babel used inside raw-vm for now is [babel-preset-env](https://github.com/babel/babel-preset-env). It's no telling how long this dependency will be needed. Versions of nodejs come out quite quickly now so maybe that's not long.

rollup is used to compile javascript es2015 modules.

Something To Note
-----------------

Source map support is not good in V8/node so compiled scripts do not provide very useful errors.
