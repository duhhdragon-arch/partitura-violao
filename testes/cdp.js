// Teste do modo offline via Chrome DevTools Protocol (Chrome já aberto com --remote-debugging-port=9334).
// Sobe o servidor aqui mesmo, para poder desligá-lo no meio do teste.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2]);
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm' };
const srv = http.createServer((q, r) => {
  let p = path.resolve(path.join(root, decodeURIComponent(q.url.split('?')[0])));
  if (!p.startsWith(root)) { r.writeHead(403); return r.end(); }
  try { if (fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); } catch {}
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await new Promise((r) => srv.listen(8765, '127.0.0.1', r));
  const P = 'http://127.0.0.1:8765/partitura-violao/', R = 'http://127.0.0.1:8765/repertorio-palco/';
  const t = await (await fetch('http://127.0.0.1:9334/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pend = {};
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } });
  const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => (await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const estado = `(async()=>{const n=[];for(const k of await caches.keys())n.push(k+':'+(await (await caches.open(k)).keys()).length);
    return JSON.stringify({titulo:document.title,sw:!!navigator.serviceWorker.controller,caches:n,compassos:document.querySelectorAll('#score svg').length,fonteMusica:document.fonts.check('32px "Noto Music"','𝄞')})})()`;
  const ir = async (u, ms = 3500) => { await cmd('Page.navigate', { url: u }); await sleep(ms); };
  await cmd('Page.enable');
  await ir(P); console.log('1ª visita       ', await ev(estado));
  await ir(P); console.log('2ª visita       ', await ev(estado));
  await ir(R, 4000); console.log('Repertório      ', await ev(`(async()=>JSON.stringify({titulo:document.title,caches:await caches.keys()}))()`));
  await ir(P); console.log('volta Partitura ', await ev(estado));
  srv.close(); srv.closeAllConnections();
  await sleep(500);
  await ir(P, 6000); console.log('OFFLINE         ', await ev(estado));
  await ir(R, 5000); console.log('Repertório OFF  ', await ev(`document.title`));
  ws.close(); process.exit(0);
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
