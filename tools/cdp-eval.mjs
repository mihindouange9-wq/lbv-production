import { spawn } from 'node:child_process';
const [page, y = '0', expr = 'document.title', W = '1440', H = '900'] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--allow-file-access-from-files --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --autoplay-policy=no-user-gesture-required','--no-first-run',`--remote-debugging-port=${port}`,`--user-data-dir=C:/Users/mihin/AppData/Local/Temp/claude/chrome-cdp-${port}`,`--window-size=${W},${H}`,'about:blank'],{stdio:'ignore'});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let wsUrl; for(let i=0;i<40&&!wsUrl;i++){await sleep(250);try{const l=await(await fetch(`http://127.0.0.1:${port}/json`)).json();wsUrl=l.find(t=>t.type==='page')?.webSocketDebuggerUrl;}catch{}}
const ws=new WebSocket(wsUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pending=new Map();const logs=[];
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id);}else if(d.method==='Runtime.consoleAPICalled'||d.method==='Runtime.exceptionThrown')logs.push(JSON.stringify(d.params).slice(0,300));};
const send=(method,params={})=>new Promise(res=>{const i=++id;pending.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
await send('Page.enable');await send('Runtime.enable');
await send('Page.navigate',{url:'file:///C:/Users/mihin/Documents/geek/lbv-production/'+page});
await sleep(4000);
await send('Runtime.evaluate',{expression:`window.scrollTo(0, ${y})`});
await sleep(1500);
const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
console.log(JSON.stringify(r.result?.result?.value ?? r.result, null, 1));
console.log('LOGS:', logs.join('\n'));
ws.close();chrome.kill();
