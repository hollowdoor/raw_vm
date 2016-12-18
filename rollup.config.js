//import babel from 'rollup-plugin-babel';
let pack = require('./package.json');
let external = Object.keys(pack.dependencies);

export default {
  entry: 'src/index.js',
  external: external,
  //plugins: [ babel() ],
  targets: [
      { dest: 'dist/bundle.js', format: 'cjs' },
      { dest: 'dist/bundle.es.js', format: 'es' },
  ]
};
