import vm from 'vm';
import path from 'path';
import getContext from './get_global_context.js';

export default function compileModule(name, code, module, Module, options){

    let filename = path.resolve(name);

    module.filename = filename;

    let script = new vm.Script(code, {
		filename: filename,
		displayErrors: false
    });

    const sandbox = getContext(options);

    const _require = function(path){
        return module.require(path);
    };

    _require.resolve = function(request) {
        return Module._resolveFilename(request, self);
    };

    require.main = module;

    module.id = '.';

    require.extensions = Module._extensions;

    require.cache = Module._cache;

    Module._cache[filename] = module;


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
