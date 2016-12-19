import Module from 'module';
import path from 'path';
import compileModule from './compile_module.js';
//http://fredkschott.com/post/2014/06/require-and-the-module-system/
//https://github.com/nodejs/node-v0.x-archive/blob/069dd07a1732c6a752773aaed9e8c18ab472375f/lib/module.js#L354
export default function makeEnvironment(filename, code, options){
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
