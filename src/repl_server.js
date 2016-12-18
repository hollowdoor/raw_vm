import repl from 'repl';
import vm from '.';


function theEval(cmd, context, filename, callback) {
  var result;
  try {
    result = vm(cmd);
  } catch (e) {
    if (isRecoverableError(e)) {
      return callback(new repl.Recoverable(e));
    }
  }
  callback(null, result);
}

function isRecoverableError(error) {
  if (error.name === 'SyntaxError') {
    return /^(Unexpected end of input|Unexpected token)/.test(error.message);
  }
  return false;
}

repl.start({prompt: '> ', eval: theEval});
