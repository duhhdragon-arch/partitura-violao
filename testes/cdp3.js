// Screenshots via CDP: quadro de acordes (violão com pestana, teclado) e afinador com microfone falso do Chrome.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2]), out = process.argv[3], port = +process.argv[4];
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let p = path.resolve(path.join(root, decodeURIComponent(q.url.split('?')[0])));
  if (!p.startsWith(root)) { r.writeHead(403); return r.end(); }
  try { if (fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); } catch {}
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await new Promise((r) => srv.listen(8765, '127.0.0.1', r));
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pend = {};
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } });
  const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (e) => (await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const shot = async (nome, sel) => {
    let clip;
    if (sel) { const r = JSON.parse(await ev(`(()=>{const e=document.querySelector('${sel}');e.scrollIntoView();const b=e.getBoundingClientRect();return JSON.stringify({x:b.x,y:b.y+scrollY,width:b.width,height:b.height})})()`)); clip = { ...r, scale: 1 }; }
    const s = await cmd('Page.captureScreenshot', { format: 'png', ...(clip ? { clip, captureBeyondViewport: true } : {}) });
    fs.writeFileSync(path.join(out, nome), Buffer.from(s.result.data, 'base64'));
  };
  await cmd('Page.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1000, height: 900, deviceScaleFactor: 1, mobile: false });
  await cmd('Page.navigate', { url: 'http://127.0.0.1:8765/partitura-violao/' }); await sleep(3000);
  await ev(`localStorage.clear();document.getElementById('iV').click();document.getElementById('tU').click();1`); await sleep(800);
  const errs=[];await cmd('Runtime.enable');ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.method=='Runtime.exceptionThrown')errs.push(d.params.exceptionDetails.exception?.description);if(d.method=='Runtime.consoleAPICalled'&&d.params.type=='error')errs.push(JSON.stringify(d.params.args))});await ev("(()=>{const b=document.getElementById('cMet');if(b.getAttribute('aria-pressed')!='true')b.click();document.getElementById('rec').click();return 1})()");await sleep(1200);await shot('met_contagem.png','#live');await sleep(5000);console.log('ao vivo:',await ev("JSON.stringify({dots:document.querySelectorAll('#lvB i').length,on:[...document.querySelectorAll('#lvB i')].findIndex(i=>i.classList.contains('on')),hidden:document.getElementById('lvB').hidden,msg:document.getElementById('msg').textContent,aria:document.getElementById('cMet').getAttribute('aria-pressed')})"));await shot('met_gravando.png','#live');await ev("document.getElementById('rec').click();1");await sleep(2500);console.log('depois:',await ev("JSON.stringify({sub:document.getElementById('sub').textContent,kbpm:document.getElementById('kBpm').textContent,hidden:document.getElementById('lvB').hidden})"));await shot('met_botoes.png','.cntg');console.log('erros:',JSON.stringify(errs));ws.close(); srv.close(); srv.closeAllConnections(); process.exit(0);
  await ev(`document.getElementById('iT').click();1`); await sleep(1500);
  await shot('chd_teclado.png', '#chd');
  await ev(`window.scrollTo(0,0);document.getElementById('tunBtn').click();1`); await sleep(3500);
  console.log('leituras:', await ev('JSON.stringify((window.__t||[]).filter((x,i)=>i%3==0).slice(0,14))'));console.log('afinador:', await ev(`JSON.stringify({nota:document.getElementById('tnN').textContent+document.getElementById('tnO').textContent,status:document.getElementById('tnS').textContent,aberto:document.getElementById('tun').open})`));
  await shot('tuner.png');
  await ev(`document.querySelector('#tun button[value=x]').click();1`); await sleep(500);
  console.log('depois de fechar:', await ev(`JSON.stringify({aberto:document.getElementById('tun').open})`));
  ws.close(); srv.close(); srv.closeAllConnections(); process.exit(0);
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
