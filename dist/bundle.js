'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var mz_fs = require('mz/fs');
var rollup = require('rollup');
var nodeResolve = _interopDefault(require('rollup-plugin-node-resolve'));
var commonjs = _interopDefault(require('rollup-plugin-commonjs'));
var babel = _interopDefault(require('rollup-plugin-babel'));
var vm = _interopDefault(require('vm'));
var Module = _interopDefault(require('module'));
var fs = _interopDefault(require('fs'));
var EventEmitter = _interopDefault(require('events'));
var util = _interopDefault(require('util'));

function rollit(source, options){

    const babelSettings = getBabelSettings();

    return rollup.rollup({
        entry: source,
        plugins: [
            {
                resolveId: function (importee, importer) {

                    if(importer && /^\//.test(importee)){
                        return importee;
                    }
                    return null;
                }
            },
            nodeResolve({
                jsnext: true,
                main: true,
                module: true
            }),
            commonjs(),
            babel(babelSettings)
        ],
        acorn: {
            allowHashBang: true
        },
        onwarn: (warning)=>{
            //No need for warnings.
            //Try to act like a normal child process.
            if(options.showWarning){
                console.warn(warning);
            }
        }
    }).then(bundle=>{
        let sourceMapCode = '';
        if(options.sourceMaps){
            sourceMapCode = `var _install = require(
                "${require.resolve('source-map-support')}");

        _install.install();`;
        }

        let gen = bundle.generate({
            format: 'cjs',
            sourceMap: true,
            banner: `(function (exports, require, module, __filename, __dirname) { ${sourceMapCode}`,
            footer: '\n});'
        });

        /*TODO
        Fix source map support.
        Right now source maps don't work inside vm*/

        let code = gen.code;


        let bangReg = /\n#[!][^\n]+?\n/;

        //Get rid of that pesky hash bang.
        if(bangReg.test(code)){
            code = code.replace(bangReg, '\n\n');
        }

        if(options.sourceMaps){
            var map = JSON.stringify(gen.map);
            let map64 = new Buffer(map).toString('base64');
            let mapInbed = ['\n//# ', 'sourceMappingURL=data:application/json;',
            'charset=utf8;base64,'].join('');

            mapInbed =  mapInbed + map64;

            code += mapInbed;
        }

        return code;

    });

}

function getBabelSettings(){

    return {
        presets: [
            ["env", {
                "targets": {
                    "node": "current"
                },
                modules: false
            }]
        ],
        sourceMaps: 'both'
    };
}

/*function getBabelSettings(){
    return fs.readFile(path.join(process.cwd(), '.babelrc'))
    .then(
        contents=>{},
        error=>{
            return {
                presets: [require.resolve("babel-preset-stage-3")],
                sourceMaps: true
            };
        }
    );
}*/

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

    let contextified = vm.createContext(context);
    context.global = contextified;

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

        if(['on', 'emit', 'argv', 'argv0', 'env'].indexOf(key) === -1){
            addProperty(this, key);
        }
    });

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

function makeEnvironment(filename, code, options){

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

function deepCopy(dest, src){

    if(typeof src !== 'object'){
        return src;
    }

    for(let name in src){

        if(name === 'global'){
            continue;
        }
        console.log('name ', name);
        console.log(src);
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

const cwd = process.cwd();

function esVM(mainscript, options){
    let wholeName = mainscript;
    let argv0 = options.argv0 || null;

    if(!/^\//.test(wholeName)){
        wholeName = path.join(cwd, mainscript);
    }

    let scriptname = mainscript.replace(/[.]\//, '');

    return rollit(wholeName, {
        showWarning: options.showWarning || false,
        sourceMaps: options.sourceMaps || false
    }).then(code=>{
        return makeEnvironment(scriptname, code, options);
    });
}

module.exports = esVM;
