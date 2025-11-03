// MIT License

// plotcat.js
// Copyright (c) 2025-- Soumendra Ganguly

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

let pyodide;
const { log, warn } = console;
let ready = false;
let typeListening = true

let terminalCols;
let terminalFontSize;
// Check the screen width
if (window.innerWidth <= 600) {
    terminalCols = 50;
    terminalFontSize = 12
} else {
    terminalCols = 80;
    terminalFontSize = 20;
}
const term = new Terminal({
    rows: 15,
    cols: terminalCols,
    allowTransparency: true,
    allowProposedApi: true,
    cursorBlink: true,
    fontFamily: 'Courier Prime, monospace',
    theme: {
	background: 'rgba(0, 0, 0, 0.0)'
    },
    fontSize: terminalFontSize,
    lineWrap: true
});
window.term = term;

const termHistory = ['']
let currentHistoryLine = 0
let currentLine = ''

let prompt = '>>>';

term.open(document.getElementById("sg-term"));
term.write("\x1b[37;1mPlease wait.\r\n\r\nImporting numpy, matplotlib, sympy.\r\n\r\n");
term.write("Defining the following:\r\n\r\nsympy symbols x,y,z,t,\r\nintegers k,m,n,\r\nfunctions f,g,h.\r\n\r\n");

const pressed = {}
const isDown = key =>{
    if(pressed[key]) return true;
    return false;
}
//.replace(/\n/g,'\r\n')
let bracketComplete = true;
let multiLine = false;
let curCode = '';
const willBreakeLine = ()=>{
    const openP = []
    let done = true;
    let inString = false
    for(let i=0;i<curCode.length;i++){
	switch(curCode[i]){
	case '(':
            if(inString) break;
            openP.push(0)
            break;
	case '{':
            if(inString) break;
            openP.push(1)
            break;
	case '[':
            if(inString) break;
            openP.push(2)
            break;
	case ')':
            if(inString) break;
            if(openP[openP.length-1]===0) openP.pop()
            else return false
            break;
	case '}':
            if(inString) break;
            if(openP[openP.length-1]===1) openP.pop()
            else return false
            break;
	case ']':
            if(inString) break;
            if(openP[openP.length-1]===2) openP.pop()
            else return false
            break;
	case "'":
            if(inString && openP[openP.length-1]===3){
		inString = false
		openP.pop()
            }else{
		inString = true
		openP.push(3)
            }
            break;
	case '"':
            if(inString && openP[openP.length-1]===4){
		inString = false
		openP.pop()
            }else{
		inString = true
		openP.push(4)
            }
            break;
	default:
            break;
	}
    }
    if(openP.length===0){
	if(curCode[curCode.length-1]===':')return true;
	return false;
    }
    return true;
}

const main = async () => {
    pyodide = await loadPyodide();
    await pyodide.loadPackage(["sympy", "numpy", "matplotlib"]);
    // await pyodide.loadPackage("micropip");
    // const micropip = pyodide.pyimport("micropip");
    // await micropip.install(["sympy", "numpy", "matplotlib"]);

    pyodide.globals.set('termwrite', (data) => term.write(data.replace(/\n/g,'\r\n')));
    pyodide.globals.set('sleep',(t)=>new Promise(r=>setTimeout(r,t*1000)));

    pyodide.runPython(
	`
import sys
import time
from pyodide.console import PyodideConsole, repr_shorten, BANNER
import __main__
pyconsole = PyodideConsole(__main__.__dict__)

sys.stdin.write = termwrite
sys.stdout.write = termwrite
sys.stderr.write = termwrite
time.sleep = sleep

# print(f"\x1b[37;1mPython {sys.version}\x1b[37;0m")

import numpy
import matplotlib
from sympy import *
x, y, z, t = symbols('x y z t')
k, m, n = symbols('k m n', integer=True)
f, g, h = symbols('f g h', cls=Function)

import js, io, base64
def pcat(*args, h=500, w=500):
    p = plot(*args, show=False)
    buf = io.BytesIO()
    p.save(buf)
    buf.seek(0)
    img_str = 'data:image/png;base64,' + base64.b64encode(buf.read()).decode('UTF-8')
    img_elt = js.document.createElement("img")
    img_elt.style.height = f"{h}px"
    img_elt.style.width = f"{w}px"
    img_elt.src = img_str
    js.document.body.append(img_elt)

def ed():
    print('''\x1b[32;1mEnter, Backspace, Delete, Left, Right:\x1b[37;0m usual functions
\x1b[32;1mUp, Down:\x1b[37;0m history navigation
\x1b[32;1mTab:\x1b[37;0m completion
\x1b[32;1mHome:\x1b[37;0m move cursor to start of line
\x1b[32;1mEnd:\x1b[37;0m move cursor to end of line
\x1b[32;1mCtrl+Backspace:\x1b[37;0m delete word backward
\x1b[32;1mCtrl+Delete:\x1b[37;0m delete word forward
\x1b[32;1mCtrl+Left:\x1b[37;0m move backward (left) by word
\x1b[32;1mCtrl+Right:\x1b[37;0m move forward (right) by word
\x1b[32;1mCtrl+l:\x1b[37;0m clear screen
\x1b[32;1mCtrl+e:\x1b[37;0m clear current line
\x1b[32;1mCtrl+k:\x1b[37;0m clear current line forward
\x1b[32;1mCtrl+u:\x1b[37;0m clear current line backward
\x1b[32;1mAlt+c:\x1b[37;0m copy to clipboard
\x1b[32;1mAlt+v:\x1b[37;0m paste from clipboard (permission might be required)''')
`);

    let pyconsole = pyodide.globals.get("pyconsole");
    let repr_shorten = pyodide.globals.get("repr_shorten");
    let banner = pyodide.globals.get("BANNER").replace(/\n/g,'\r\n');

    let edocmsg = "Type \x1b[32;1med()\x1b[37;1m for line editor key bindings."
    let pcatmsg = "\x1b[37;1mAppend plots at the bottom:\r\n\x1b[32;1mpcat(sin(x))\r\npcat(cos(x), (x, -2*pi, 2*pi), h=200, w=200)\x1b[37;1m"
    term.write(`\x1b[2J\x1b[0;0H\x1b[32;1mPlotCat\r\n\r\n${pcatmsg}\r\n\r\n${edocmsg}\r\n\r\n\x1b[34;1m${banner}\r\n\x1b[37;0m`);

    let completions, pos, pre, post, indx;

    term.attachCustomKeyEventHandler(async e=>{
	if(!ready)return null;
	if(e.type==='keyup')pressed[e.key]=false
	else if(e.type==='keydown') pressed[e.key]=true
    })
    term.onKey(async e=>{
	if(!typeListening){
	    if(e.domEvent.key==='Backspace') term.write('\x1b[D \x1b[D')
	    else if(e.key==='\r') term.write('\r\n')
	    else term.write(e.key);
	    return 0;
	}
	if(e.key==='\r'){//enter is pressed
	    termHistory[0] = currentLine
	    curCode += currentLine
	    currentLine = ''
	    currentHistoryLine = 0
	    termHistory.unshift('')
	    if(isDown('Shift') || willBreakeLine()){
		//multi-line script
		multiLine = true;
		curCode += '\n'
		prompt = '...'
		term.write(`\r\n${prompt} `)
	    }else{
		if(multiLine===true){
		    //when multi-line code is completed
		    //this looks dirty tho
		    if(curCode[curCode.length-1]==='\n')multiLine = false;
		    else {
			curCode += '\n'
			prompt = '...'
			term.write(`\r\n${prompt} `)
			return 0;
		    }
		}
		term.write('\r\n')
		if(curCode.length===0){
		    prompt = '>>>'
		    term.write(prompt+' ')
		    return 0;
		}

		//execute Python
		typeListening = false;
		await pyodide.runPythonAsync(curCode).then(value=>{
		    if (value === undefined) {
			term.write('\x1b[A');
		    }else{
			term.write(
			    repr_shorten.callKwargs(value, {
				separator: "\n<long output truncated>\n",
			    }).replace(/\n/g,'\r\n')
			);
		    }
		    if (value && value.isPyProxy) {
			value.destroy();
		    }
		}).catch(err=>{
		    if (err.constructor.name === "PythonError") {
			//write errors in red
			term.write("\x1b[31;1m");
			//write error message
			term.write(err.message.trimEnd().replace(/\n/g,'\r\n'));
			//switch back to white
			term.write("\x1b[37;0m");
		    } else {
			throw err;
		    }
		}).then(()=>{
		    typeListening = true
		    curCode = ''
		    prompt = '>>>'
		    term.write(`\r\n${prompt} `)
		})
	    }
	    return 0;
	}else if (e.domEvent.ctrlKey && e.domEvent.type === "keydown"){
	    e.domEvent.stopPropagation();
	    e.domEvent.preventDefault();

	    switch(e.domEvent.key){
	    case "Backspace"://delete word backward
		pos = term.buffer.active.cursorX;
		pre = currentLine.slice(0,pos-4);
		post = currentLine.slice(pos-4,currentLine.length);

		//remove trailing spaces
		pre = pre.replace(/\s*$/, '');
		//remove last word
		pre = pre.substring(0, pre.lastIndexOf(' ') + 1);
		currentLine = pre + post;
		termHistory[currentHistoryLine] = currentLine;

		term.write(`\x1b[2K\r${prompt} ${currentLine}\x1b[${pre.length + 5}G`);
		break;
	    case "Delete"://delete word forward
		pos = term.buffer.active.cursorX;
		pre = currentLine.slice(0,pos-4);
		post = currentLine.slice(pos-4,currentLine.length);

		//remove starting spaces
		post = post.replace(/^\s*/, '');
		//remove first word
		indx = post.indexOf(' ');
		if(indx===-1){
		    post = "";
		}else{
		    post = post.substring(indx);
		}
		currentLine = pre + post;
		termHistory[currentHistoryLine] = currentLine;

		term.write(`\x1b[2K\r${prompt} ${currentLine}\x1b[${pos+1}G`);
		break;
	    case "ArrowLeft"://move backward by word
		pos = term.buffer.active.cursorX;
		pre = currentLine.slice(0,pos-4);

		//remove trailing spaces
		pre = pre.replace(/\s*$/, '');
		//remove last word
		pre = pre.substring(0, pre.lastIndexOf(' ') + 1);
		term.write(`\x1b[${pre.length + 5}G`);
		break;
	    case "ArrowRight"://move for by word
		pos = term.buffer.active.cursorX;
		if(pos<currentLine.length + 4){
		    post = currentLine.slice(pos-4,currentLine.length);

		    //remove starting spaces, remove first word
		    indx = post.length;
		    post = post.replace(/^\s*/, '');
		    pos = post.indexOf(' ');
		    if(pos!==-1){
			indx = indx - post.length + pos;
		    }

		    term.write(`\x1b[${indx}C`);
		}
		break;
	    case "l"://clear screen
		currentLine = '';
		termHistory[currentHistoryLine] = currentLine;
		term.write(`\x1b[2J\x1b[0;0H${prompt} `);
		break;
	    case "e"://clear line
		currentLine = '';
		termHistory[currentHistoryLine] = currentLine;
		term.write(`\x1b[2K\r${prompt} `);
		break;
	    case "k"://clear line forward
		pos = term.buffer.active.cursorX;
		currentLine = currentLine.slice(0,pos-4);
		termHistory[currentHistoryLine] = currentLine;
		// term.write(`\x1b[2K\r${prompt} ${currentLine}`);
		term.write(`\x1b[0K`);
		break;
	    case "u"://clear line backward
		pos = term.buffer.active.cursorX;
		currentLine = currentLine.slice(pos-4,currentLine.length);
		termHistory[currentHistoryLine] = currentLine;
		term.write(`\x1b[2K\r${prompt} ${currentLine}\x1b[5G`);
		break;
	    default:
		break;
		// case "c":
		//     // Need to handle SIGINT via Ctrl+C here, which unfortunately
		//     // only works via Webworker interruptBuffers currently.
		//     break;
	    }
	    return 0;
	}else if (e.domEvent.altKey && e.domEvent.type === "keydown"){
	    e.domEvent.stopPropagation();
	    e.domEvent.preventDefault();

	    switch(e.domEvent.key){
	    case "c"://copy
		const selection = term.getSelection();
		if (selection) {
		    navigator.clipboard.writeText(selection);
		}
		break;
	    case "v"://paste
		navigator.clipboard.readText().then(text => {
		    term.write(text);
		});
		break;
	    default:
		break;
	    }
	    return 0;
	}

	switch(e.domEvent.key){
	case "Backspace":
	    pos = term.buffer.active.cursorX;
	    if(pos>4){
		pre = currentLine.slice(0,pos-5);
		post = currentLine.slice(pos-4,currentLine.length);
		currentLine = pre + post;
		termHistory[currentHistoryLine] = currentLine
		// term.write('\x1b[D \x1b[D')
		term.write(`\x1b[D${post} \x1b[${pos}G`)
	    }
	    break;
	case "Delete":
	    pos = term.buffer.active.cursorX;
	    if(pos>3){
		pre = currentLine.slice(0,pos-4);
		post = currentLine.slice(pos-3,currentLine.length);
		currentLine = pre + post;
		termHistory[currentHistoryLine] = currentLine
		// term.write('\x1b[D \x1b[D')
		term.write(`${post} \x1b[${pos+1}G`)
	    }
	    break;
	case "ArrowRight":
	    if(term.buffer.active.cursorX<currentLine.length + 4){
		term.write('\x1b[C');
	    }
	    break;
	case "ArrowLeft":
	    if(term.buffer.active.cursorX>4){
		term.write('\x1b[D');
	    }
	    break;
	case "ArrowUp":
	    if(currentHistoryLine<termHistory.length-1){
		currentHistoryLine++;
		term.write('\x1b[5G\x1b[K')
		term.write(termHistory[currentHistoryLine])
		currentLine = termHistory[currentHistoryLine]
	    }
	    break;
	case "ArrowDown":
	    if(currentHistoryLine>0){
		currentHistoryLine--
		term.write('\x1b[5G\x1b[K')
		term.write(termHistory[currentHistoryLine])
		currentLine = termHistory[currentHistoryLine]
	    }
	    break;
	case "Tab":
	    // term.write('    ');
	    // currentLine += '    '
	    pos = term.buffer.active.cursorX;
	    pre = currentLine.slice(0,pos-4);
	    post = currentLine.slice(pos-4,currentLine.length);

	    completions = pyconsole.complete(pre).toJs()[0]
	    if(completions.length===1){
		// let words = currentLine.split(' ');
		// words[words.length - 1] = completions[0];
		// currentLine = words.join(' ');

		//remove last word
		pre = pre.substring(0, pre.lastIndexOf(' ') + 1);
		//add completed word
		pre += completions[0];
		currentLine = pre + post;
		termHistory[currentHistoryLine] = currentLine;
		term.write(`\x1b[2K\r${prompt} ${currentLine}\x1b[${pre.length + 5}G`);
		break;
	    }
	    term.write(`\r\n${completions.join('  ')}\r\n${prompt} ${currentLine}\x1b[${pos+1}G`)
	    break;
	case "Home":
	    // pos = term.buffer.active.cursorX;
	    // if(pos>4){
	    //   term.write(`\x1b[${pos-4}D`);
	    // }
	    term.write('\x1b[5G');
	    break;
	case "End":
	    // pos = term.buffer.active.cursorX;
	    // if(pos<currentLine.length+4){
	    // 	  term.write(`\x1b[${currentLine.length-pos+4}C`);
	    // }
	    term.write(`\x1b[${currentLine.length+5}G`);
	    break;
	default:
	    pos = term.buffer.active.cursorX;
	    pre = currentLine.slice(0,pos-4);
	    post = currentLine.slice(pos-4,currentLine.length);
	    currentLine = `${pre}${e.key}${post}`;
	    termHistory[currentHistoryLine] = currentLine;
	    term.write(`\x1b[2K\r${prompt} ${currentLine}\x1b[${pos+2}G`);
	    break;
	}
	return 0;
    })

    term.write(prompt+' ');
    ready=true;
}

main();
