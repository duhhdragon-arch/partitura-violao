// Melodia no Chrome (precisa de WebGL): piano/violão sintetizados, com acorde no fim e com as duas mãos.
// Compara o método antigo (uma nota por vez) com a IA (Basic Pitch). Usa o gancho window.__P (só existe em 127.0.0.1).
// Uso: node testes/teste6.js <pasta que contém partitura-violao/> <porta do Chrome headless>
const http=require('http'),fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]),port=+process.argv[3];
const T={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=path.resolve(path.join(root,decodeURIComponent(q.url.split('?')[0])));if(!p.startsWith(root)){r.writeHead(403);return r.end()}try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html')}catch{}fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':T[path.extname(p)]||'application/octet-stream'});r.end(d)})});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PAGINA=async function(caso){const P=window.__P,st=P.st,SR=22050;
 let sd=caso.seed;const R=()=>(sd=(sd*1103515245+12345)%2147483648)/2147483648;const ESC=[0,2,4,5,7,9,11];
 const mel=[];{let b=0,m=Math.round((caso.lo+caso.hi)/2);while(b<16){const d=[.5,1,1,1,2][Math.floor(R()*5)];if(b+d>16)break;let k;do{k=m+Math.floor(R()*9)-4}while(!ESC.includes(((k%12)+12)%12)||k<caso.lo||k>caso.hi);m=k;mel.push({b,d,m});b+=d}}
 const spb=60/caso.bpm,lead=.12,end=16,tot=(end+(caso.acorde?4:0))*spb+lead+1.5,x=new Float32Array(Math.ceil(tot*SR));P.setSeed(3);
 const J=()=>caso.real?(R()-.5)*.05:0,V=()=>caso.real?.7+.6*R():1;
 const toca=(m,b,d,amp)=>{amp*=V();const a=Math.max(0,Math.round((lead+b*spb+J())*SR)),D=Math.round(d*spb*SR*.95);if(caso.ins=='violao')P.pluck(x,a,m,D,amp*2);else P.kb(x,a,m,D,amp,'piano')};
 mel.forEach(n=>toca(n.m,n.b,n.d,.15));
 const baixo=[];if(caso.maos)for(let c=0;c<4;c++){const m=[36,33,29,31][c];baixo.push({b:c*4,m});toca(m,c*4,4,.12)}
 let ac=null;if(caso.acorde){ac=caso.ins=='violao'?P.forma(0,0).f.map((v,i)=>v<0?null:[40,45,50,55,59,64][i]+v).filter(v=>v!==null):[48,60,64,67];ac.forEach(m=>toca(m,end,4,.1))}
 let y=x;if(caso.real){const oc=new OfflineAudioContext(1,x.length,SR),ir=oc.createBuffer(1,Math.round(.9*SR),SR),d=ir.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(R()*2-1)*Math.exp(-i/SR/.18);const src=oc.createBufferSource(),b=oc.createBuffer(1,x.length,SR);b.copyToChannel(x,0);src.buffer=b;
  const cv=oc.createConvolver();cv.normalize=true;cv.buffer=ir;const wet=oc.createGain();wet.gain.value=.5;src.connect(oc.destination);src.connect(cv);cv.connect(wet);wet.connect(oc.destination);src.start();
  y=(await oc.startRendering()).getChannelData(0);let m=0;for(const v of y)m=Math.max(m,Math.abs(v));for(let i=0;i<y.length;i++)y[i]=y[i]/m+.006*(R()*2-1)}
 const x2=y;let mx=0;for(const v of x2)mx=Math.max(mx,Math.abs(v));for(let i=0;i<x2.length;i++)x2[i]*=.5/mx;
 st.ins=caso.ins;st.demo=false;st.bpb=4;st.grid={bpm:caso.bpm,met:true};
 const nota=()=>{const got=[];st.A.bars.forEach((b,i)=>b.notes.forEach(n=>(n.ms||[n.m]).forEach(m=>got.push({b:i*4+n.pos,m,sf:n.sf,pos:n.pos,n}))));
  const us=new Set();let h=0,hb=0,hx=0;mel.forEach(n=>{const g=got.findIndex((q,i)=>!us.has(i)&&Math.abs(q.b-n.b)<=.5&&q.m===n.m);if(g>=0){us.add(g);h++;if(got[g].b===n.b)hx++}});
  baixo.forEach(n=>{const g=got.findIndex((q,i)=>!us.has(i)&&Math.abs(q.b-n.b)<=.5&&q.m===n.m);if(g>=0){us.add(g);hb++}});
  let okA=null;if(ac){const pc=new Set(got.filter((q,i)=>!us.has(i)&&Math.abs(q.b-end)<=1).map(q=>q.m%12));okA=[0,4,7].every(p=>pc.has(p));got.forEach((q,i)=>{if(Math.abs(q.b-end)<=1&&[0,4,7].includes(q.m%12))us.add(i)})}
  return{h,hx,n:mel.length,hb,nb:baixo.length,extra:got.length-us.size,okA}};
 // Antigo
 P.BPS.fail=true;st.mode='cifra';P.run(x2);await new Promise(r=>setTimeout(r,200));while(!st.A||st.buf!==x2)await new Promise(r=>setTimeout(r,50));
 st.mode='melodia';P.analyse();const velho=nota();
 // IA
 P.BPS.fail=false;const t0=performance.now();P.setMode('melodia');while(!st.BP&&!P.BPS.fail)await new Promise(r=>setTimeout(r,100));
 const novo=nota();return JSON.stringify({velho,novo,ms:Math.round(performance.now()-t0),falhou:P.BPS.fail})};
(async()=>{await new Promise(r=>srv.listen(8765,'127.0.0.1',r));const t=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
 let id=0;const pend={},errs=[];ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id]}if(d.method=='Runtime.exceptionThrown')errs.push(d.params.exceptionDetails.exception?.description)});
 const cmd=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});const ev=async e=>{const r=await cmd('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true});return r.result?.result?.value??JSON.stringify(r.result?.exceptionDetails?.exception?.description)};
 await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Page.navigate',{url:'http://127.0.0.1:8765/partitura-violao/'});await sleep(3000);
 const casos=[];for(let s=1;s<=4;s++){casos.push({nome:'piano só melodia',ins:'piano',lo:60,hi:81,bpm:[72,90,110,84][s-1],seed:s*7+1});casos.push({nome:'piano + acorde fim',ins:'piano',lo:60,hi:81,bpm:[90,110,72,96][s-1],seed:s*11+3,acorde:true});casos.push({nome:'piano duas mãos',ins:'piano',lo:60,hi:81,bpm:[80,96,104,88][s-1],seed:s*13+5,maos:true});casos.push({nome:'violão + acorde',ins:'violao',lo:52,hi:76,bpm:[80,96,104,88][s-1],seed:s*5+2,acorde:true});
  casos.push({nome:'REAL piano 2 mãos+ac',ins:'piano',lo:60,hi:81,bpm:[76,92,100,86][s-1],seed:s*17+9,maos:true,acorde:true,real:true});casos.push({nome:'REAL violão + acorde',ins:'violao',lo:52,hi:76,bpm:[76,92,100,86][s-1],seed:s*19+4,acorde:true,real:true})}
 const tot={};for(const c of casos){const r=JSON.parse(await ev(`(${PAGINA.toString()})(${JSON.stringify(c)})`));
  for(const k of['velho','novo']){const o=tot[c.nome+'|'+k]||(tot[c.nome+'|'+k]={h:0,hx:0,n:0,hb:0,nb:0,extra:0,a:0,na:0});const v=r[k];o.h+=v.h;o.hx+=v.hx;o.n+=v.n;o.hb+=v.hb;o.nb+=v.nb;o.extra+=v.extra;if(v.okA!==null){o.na++;if(v.okA)o.a++}}
  if(process.env.DET)console.log(c.nome.padEnd(18),c.bpm,'antigo',JSON.stringify(r.velho),'| IA',JSON.stringify(r.novo),r.ms+'ms',r.falhou?'FALHOU':'')}
 console.log('--- RESUMO (notas certas da melodia, baixo, notas inventadas, acorde do fim)');
 for(const[k,o]of Object.entries(tot))console.log(k.padEnd(26),`melodia ${o.h}/${o.n} (${Math.round(100*o.h/o.n)}%) no tempo exato ${Math.round(100*o.hx/o.n)}%`,o.nb?`baixo ${o.hb}/${o.nb}`:'',`inventadas ${o.extra}`,o.na?`acorde ${o.a}/${o.na}`:'');
 if(errs.length)console.log('ERROS',errs);ws.close();srv.close();srv.closeAllConnections();process.exit(0)})().catch(e=>{console.error('ERRO',e);process.exit(1)});
