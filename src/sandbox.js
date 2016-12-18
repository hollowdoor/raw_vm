//http://fredkschott.com/post/2014/06/require-and-the-module-system/
//https://github.com/nodejs/node/blob/master/lib/module.js
//https://nodejs.org/api/modules.html#modules_the_module_object
//https://gist.github.com/ghaiklor/f11c8424310afb4b9018
//const Module = require('module');
//https://github.com/patriksimek/vm2


return ((host)=>{

    const createRequire = function(module, Module, r){

        const _require = function(path){
            return module.require(path);
        };

        Object.defineProperties(_require, {
            main: {value: host.main},
            resolve: {
                get: function(){
                    return r.resolve;
                }
            },
            cache: {
                get: function(){
                    return Module._cache;
                }
            },
            extensions: {
                get: function(){
                    return r.extensions;
                }
            }
        });

        return _require;
    };

    return createRequire;
})(host);
