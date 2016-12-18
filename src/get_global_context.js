import vm from 'vm';
import EventEmitter from 'events';
import util from 'util';

const rootProps = [
    'Buffer',
    'clearImmediate',
    'clearInterval',
    'clearTimeout',
    'setImmediate',
    'setInterval',
    'setTimeout'
];

export default function getContext(options){
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
        })
    }
}

util.inherits(VMProcessMask, EventEmitter);

VMProcessMask.prototype.on = function(){
    process.on.apply(process, arguments);
};

VMProcessMask.prototype.emit = function(){
    process.on.apply(process, arguments);
};
