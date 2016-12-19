import path from 'path';
import 'mz/fs';
import { rollup as rollup$1 } from 'rollup';
import 'rollup-plugin-node-resolve';
import 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import Module from 'module';
import vm from 'vm';
import EventEmitter from 'events';
import util from 'util';

function rollit(source, options){

    const babelSettings = getBabelSettings();

    return rollup$1({
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
            /*nodeResolve({
                jsnext: true,
                main: true,
                module: true
            }),
            commonjs(),*/
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

        /*if(options.sourceMaps){

            sourceMapCode = `require(
                "${require.resolve('source-map-support')}")
                .install();`;
        }*/

        let gen = bundle.generate({
            format: 'cjs',
            sourceMap: 'inline',
            banner: `(function (exports, require, module, __filename, __dirname) { `,
            intro:`${sourceMapCode}`,
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
            code += ['\n/', '/# sourceMappingURL=', gen.map.toUrl(), '\n'].join('');
        }

        //\n
        console.log(code);

        return {
            code: code
        };

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
        ]//,
        //sourceMaps: true
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
    }).then(result=>{
        return makeEnvironment(
            scriptname,
            result.code,
            options);
    });
}

export default esVM;
