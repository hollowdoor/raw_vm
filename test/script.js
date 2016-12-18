import path from 'path';
import fs from 'fs';
import sub from './sub';
console.log('------\n', 'starting script.js')
sub();/*
console.log('--- This is a child process. ---');
console.log('path.join result ',path.join('dir', 'filename'));
console.log('__filename ',__filename)

console.log('process.cwd() ',process.cwd())
console.log('process.argv0 ',process.argv0)

let [, command] = process.argv;
console.log('command ',command)*/
console.log('__dirname', __dirname)
console.log('process.argv ',process.argv)
console.log('readdir ',fs.readdirSync(__dirname))
console.log('readfile ',fs.readFileSync('./text.css', 'utf8'))


function p(){
    return new Promise((resolve, reject)=>{
        setTimeout(()=>{
            resolve('yippy!')
        })
    });
}
async function myAsync(){

    let val = await p();
    console.log('success? ', val);
}

myAsync();
