import vm from 'vm';
import Module from 'module';
import fs from 'fs';
import path from 'path';
import getContext from './get_global_context.js';


export default function makeEnvironment(filename, code, options){

    options = options || {};
    const host = options.host || {};

    host.console = console;
    host.require = require;

    //code = `(function (exports, require, module, __filename, __dirname) { ${code} \n})`;

    const context = getContext(options);

    let script = new vm.Script(code, {
		filename: filename,
		displayErrors: false
    });

    return {
        run: run
    };

    function run(){

        //console.log('context ', context)

        let module = loadMain();

        let createRequire = getRequire(context, host);

        try{
            let closure = script.runInContext(context, {
        		filename: filename,
                lineOffset: 0,
        		displayErrors: true
            });

            let dirname = path.dirname(filename);

            var returned = closure.call(
                context,
                module.exports,
                createRequire(module, Module, require),
                module,
                filename,
                dirname
            );

        }catch(e){
            console.log(e);
        }

        return returned;
    }

    function loadMain(){
        /*
        // bootstrap main module.
        Module.runMain = function() {
          // Load the main module--the command line argument.
          Module._load(process.argv[1], null, true);
          // Handle any nextTicks added in the first tick of the program
          process._tickCallback();
      };*/

        //Like in Module._load(id, parent, isMain)
        var module = new Module(filename, null /*parent*/);

        //if (isMain) {
          process.mainModule = module;
          module.id = '.';
        //}

        Module._cache[filename] = module;
        process._tickCallback();

        return module;
    }

}

//http://fredkschott.com/post/2014/06/require-and-the-module-system/
function getRequire(context, host){
    let code = fs.readFileSync(`${__dirname}/sandbox.js`, 'utf8');
    let closure = vm.runInContext(
        `(function (host) { ${code} \n})`, context, {
            filename: `${__dirname}/sandbox.js`,
            displayErrors: false
    });

    return closure.call(context, host)
}

function isArray(thing){
    return (Object.prototype.toString.call(thing) === '[object Array]');
}

function copyObject(dest, src){
    for(let name in src){
        if(isArray(src[name])){
            dest[name] = src[name].map(a=>a);
        }else{
            dest[name] = src[name];
        }
    }
    return dest;
}

function deepCopyGlobal(){

    return deepCopy(Object.create(null), global);
}

function deepCopy(dest, src){

    if(typeof src !== 'object'){
        return src;
    }

    for(let name in src){

        if(name === 'global'){
            continue;
        }
        console.log('name ', name)
        console.log(src)
        if(src.hasOwnProperty && src.hasOwnProperty(name)){
            if(isArray(src[name])){
                dest[name] = src[name].map(a=>deepCopy({}, a));
            }else if(src[name] !== null && typeof src[name] === 'object'){
                dest[name] = deepCopy({}, src[name]);
            }else{
                dest[name] = src[name];
            }
        }else{
            dest[name] = src[name];
        }
    }

    return dest;
}
