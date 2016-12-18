import fs from 'fs';
function testError(){
    fs.readFileSync('nonexistent')
        //console.log('bla ERROR');
}
//testError();
export default function talk(){
    console.log('This is sub.js talking.')
}
