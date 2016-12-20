import path from 'path';
import compile from 'compile-es-for-node';
import Module from 'module';
import vm from 'vm';
import EventEmitter from 'events';
import util from 'util';

const rootProps = [
    'Buffer',
    'clearImmediate',
    'clearInterval',
    'clearTimeout',
    'setImmediate',
    'setInterval',
    'setTimeout'
];

function getContext(options){
    options = options || {};
    let context = Object.create(null);
    rootProps.forEach(name=>{
        if(name in global)
            context[name] = global[name];
    });

    context.process = new VMProcessMask(options);
    context.console = createConsole();
    //console.log(context.process.mainModule)
    let contextified = vm.createContext(context);
    context.global = contextified;
    //context.global = context;

    return contextified;
}

function createConsole(){
    const c = {};
    Object.keys(console).forEach(key=>{
        c[key] = console[key].bind(console);
    });
    return c;
}

function VMProcessMask(options){
    EventEmitter.call(this);
    const keys = Object.keys(process);

    keys.forEach(key=>{

        if(['on', 'emit', 'argv', 'argv0', 'env', 'mainModule'].indexOf(key) === -1){
            addProperty(this, key);
        }
    });

    this.mainModule = options.main;

    this.env = {};

    Object.keys(process.env).forEach(key=>{
        this.env[key] = process.env[key];
    });

    this.argv0 = process.argv0;
    this.argv = process.argv.slice(0, process.argv.length);

    if(options.commandPath){
        this.argv[0] = options.commandPath;
    }

    if(options.argv0){
        this.argv0 = options.argv0;
    }

    if(options.argv){
        this.argv = this.argv.slice(0, 2).concat(options.argv);
    }

    if(options.scriptName){
        this.argv[1] = options.scriptName;
    }

    function addProperty(self, key){
        Object.defineProperty(self, key, {
            get: function(){
                return process[key];
            },
            enumerable: true
        });
    }
}

util.inherits(VMProcessMask, EventEmitter);

VMProcessMask.prototype.on = function(){
    process.on.apply(process, arguments);
};

VMProcessMask.prototype.emit = function(){
    process.on.apply(process, arguments);
};

function compileModule(name, code, module, Module$$1, options){

    let filename = path.resolve(name);

    module.filename = filename;

    let script = new vm.Script(code, {
		filename: filename,
		displayErrors: false
    });

    const sandbox = getContext(options);

    const _require = function(path$$1){
        return module.require(path$$1);
    };

    _require.resolve = function(request) {
        return Module$$1._resolveFilename(request, self);
    };

    require.main = module;

    module.id = '.';

    require.extensions = Module$$1._extensions;

    require.cache = Module$$1._cache;

    Module$$1._cache[filename] = module;


    try{
        let closure = script.runInNewContext(sandbox, {
            filename: filename,
            breakOnSigint: true
        });

        let dirname = path.dirname(filename);

        let returned = closure.call(
            sandbox,
            module.exports,
            require, //createRequire(module, Module, require),
            module,
            filename,
            dirname
        );

        return returned;

    }catch(e){
        console.log(e);
    }
}

//http://fredkschott.com/post/2014/06/require-and-the-module-system/
//https://github.com/nodejs/node-v0.x-archive/blob/069dd07a1732c6a752773aaed9e8c18ab472375f/lib/module.js#L354
function makeEnvironment(filename, code, options){
    let module = loadMain();
    let running = false;

    return {
        run: function(){
            if(running) return;
            running = true;
            return compileModule(
                filename,
                code,
                module,
                Module,
                options
            );
        }
    };

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
          module.id = path.resolve(filename);
        //}

        Module._cache[filename] = module;
        process._tickCallback();

        module.loaded = true;

        return module;
    }
}

//import compile from './compile_es.js';
const cwd = process.cwd();

function esVM(mainscript, options){
    let wholeName = mainscript;
    let argv0 = options.argv0 || null;

    if(!/^\//.test(wholeName)){
        wholeName = path.join(cwd, mainscript);
    }

    let scriptname = mainscript.replace(/[.]\//, '');

    return compile(wholeName, {
        wrap: true,
        showWarning: options.showWarning || false,
        sourceMaps: options.sourceMaps || false
    }).then(result=>{
        return makeEnvironment(
            scriptname,
            result.code,
            options);
    });
}

export default esVM;
