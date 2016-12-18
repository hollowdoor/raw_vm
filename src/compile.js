import fs from 'mz/fs';
import { rollup } from 'rollup';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import path from 'path';

export default function rollit(source, options){

    const babelSettings = getBabelSettings();

    return rollup({
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
        })

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
