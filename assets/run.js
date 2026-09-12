let pyodideReady = false;
let pyodide = null;
const status = document.getElementById('status');
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');
const outputEl = document.getElementById('output');
const explainEl = document.getElementById('explain');
const runtimeEl = document.getElementById('runtime');
const editor = document.getElementById('editor');
const preset = document.getElementById('preset');
const loadPreset = document.getElementById('loadPreset');

async function initPyodide(){
  status.textContent = 'Pyodide: loading…';
  try{
    pyodide = await loadPyodide({indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'});
    pyodideReady = true;
    status.textContent = 'Pyodide: ready';
  }catch(e){
    status.textContent = 'Pyodide: failed to load';
    explainEl.textContent = 'Failed to load Pyodide. Check your network or try again later.';
    console.error(e);
  }
}

function clearOutput(){
  outputEl.textContent = '(no output yet)';
  explainEl.textContent = 'Run code to see explanations and suggestions.';
  runtimeEl.textContent = '—';
}

function simpleExplain(outputText){
  // Very small heuristic parser for common beginner issues
  if(!outputText || outputText.trim()==='') return 'No output — your program did not print anything.';
  const txt = outputText;
  if(txt.includes('Traceback (most recent call last):')){
    // get last non-empty line
    const lines = txt.trim().split('\n');
    const last = lines[lines.length-1] || '';
    if(last.startsWith('SyntaxError')){
      if(txt.includes("expected ':'") || txt.includes("expected ':' (")){
        return 'SyntaxError: It looks like you are missing a colon at the end of a statement (e.g., after for/if/while/def). Add the colon to start the indented block.';
      }
      return 'SyntaxError: There is a problem with Python syntax on one of the lines — check for missing colons, parentheses, or incorrect indentation.';
    }
    if(last.startsWith('IndentationError')){
      return 'IndentationError: Python relies on indentation to define blocks. Make sure lines inside a block are indented consistently (spaces vs tabs) and that nested blocks are aligned.';
    }
    if(last.startsWith('NameError')){
      return 'NameError: A variable or name is used before it was defined. Check for typos or missing assignments (e.g., using x before setting x = 5).';
    }
    if(last.startsWith('TypeError')){
      return 'TypeError: The operation was applied to an object of the wrong type. Check the types of the variables in the line that failed.';
    }
    if(last.startsWith('ZeroDivisionError')){
      return 'ZeroDivisionError: Your code attempted to divide by zero. Add a check to avoid dividing by zero.';
    }
    return 'An exception occurred. Read the traceback above to see where it happened — the last line shows the error type and message.';
  }
  return 'Program output (no errors). Good job!';
}

async function runCode(){
  if(!pyodideReady){
    explainEl.textContent = 'Pyodide is not ready yet.';
    return;
  }
  const code = editor.value;
  outputEl.textContent = 'Running…';
  explainEl.textContent = '';
  const t0 = performance.now();
  try{
    // pass code into the Python runtime
    pyodide.globals.set('user_code', code);
    const result = await pyodide.runPythonAsync(`import sys, io, traceback\nbuf = io.StringIO()\nsys.stdout = buf\nsys.stderr = buf\ntry:\n    exec(user_code, {})\nexcept Exception:\n    traceback.print_exc()\noutput = buf.getvalue()\noutput`);
    const t1 = performance.now();
    const elapsed = Math.round(t1 - t0);
    runtimeEl.textContent = `${elapsed} ms`;
    const outStr = result ? result.toString() : '';
    outputEl.textContent = outStr || '(no output)';
    explainEl.textContent = simpleExplain(outStr);
  }catch(err){
    const t1 = performance.now();
    const elapsed = Math.round(t1 - t0);
    runtimeEl.textContent = `${elapsed} ms`;
    const message = err && err.toString ? err.toString() : String(err);
    outputEl.textContent = message;
    explainEl.textContent = 'Runtime error: ' + message;
  }
}

runBtn.addEventListener('click', runCode);
clearBtn.addEventListener('click', clearOutput);
loadPreset.addEventListener('click', ()=>{
  const val = preset.value;
  editor.value = val;
});

// initialize
initPyodide();
