import path from 'path';
//import compile from './compile_es.js';
import compile from 'compile-es-for-node';
import createEnvironment from './environ.js';
const cwd = process.cwd();

export default function esVM(mainscript, options){
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
        return createEnvironment(
            scriptname,
            result.code,
            options);
    });
}
