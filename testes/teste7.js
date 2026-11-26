// Looper no Chrome (precisa de AudioWorklet e áudio em tempo real): microfone simulado com atraso conhecido de ida e volta.
// Confere: calibração acha o atraso, loop e camada saem no tempo exato, clique do metrônomo não fica gravado, fechar desliga tudo.
// Uso: node testes/teste7.js <pasta que contém partitura-violao/> <porta do Chrome headless> [atraso em ms, padrão 137]
// Chrome: chrome --headless=new --remote-debugging-port=<porta> --user-data-dir=<perfil> --use-fake-ui-for-media-stream --use-fake-device-for-media-stream --autoplay-policy=no-user-gesture-required --mute-audio (mudo: senão o teste toca no som do computador)
const http=require('http'),fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]),port=+process.argv[3],ATRASO=+(process.argv[4]||137)/1000;
const T={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=path.resolve(path.join(root,decodeURIComponent(q.url.split('?')[0])));if(!p.startsWith(root)){r.writeHead(403);return r.end()}try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html')}catch{}fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':T[path.extname(p)]||'application/octet-stream'});r.end(d)})});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PAGINA=async function(D){const P=window.__P,LP=P.LP,$=id=>document.getElementById(id),esp=ms=>new Promise(r=>setTimeout(r,ms)),out={};
 // "Microfone": tudo que sai do looper volta com atraso D (como alto-falante -> ar -> microfone), e o músico também entra por ele
 LP.fakeIn=ctx=>{const d=ctx.createDelay(2);d.delayTime.value=D;LP.out.connect(d);window.__mic=d;return d};
 // O músico toca no que OUVE: a nota que ele toca "no tempo t" chega ao microfone em t+D, igual ao som do loop. Por isso passa pelo mesmo atraso.
 const nota=(t,f)=>{const c=LP.ctx,o=c.createOscillator(),g=c.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3,t+.005);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.connect(g);g.connect(window.__mic);o.start(t);o.stop(t+.4)};
 const env=(x,f,sr)=>{const w=2*Math.PI*f/sr,W=Math.round(.004*sr),e=new Float32Array(x.length);let a=0,b=0;const I=[],Q=[];for(let i=0;i<x.length;i++){I[i]=x[i]*Math.cos(w*i);Q[i]=x[i]*Math.sin(w*i);a+=I[i];b+=Q[i];if(i>=W){a-=I[i-W];b-=Q[i-W]}e[i]=Math.hypot(a,b)}return e};
 const inicio=(x,f,sr,pos)=>{const e=env(x,f,sr),a=Math.max(0,pos-Math.round(.1*sr)),z=Math.min(x.length,pos+Math.round(.1*sr));let pk=0,pi=a;for(let i=a;i<z;i++)if(e[i]>pk){pk=e[i];pi=i}let i=pi;while(i>a&&e[i-1]>=pk/2)i--;return{i,pk}};
 // o mesmo medidor numa nota limpa (viés do medidor)
 const tom=(f,sr)=>{const p=Math.round(.2*sr),x=new Float32Array(p*2+Math.round(.35*sr));for(let i=0;i<x.length-2*p;i++){const t=i/sr,a=t<.005?.3*t/.005:.3*Math.pow(.001/.3,(t-.005)/.345);x[p+i]=a*Math.sin(2*Math.PI*f*t)}return inicio(x,f,sr,p).i-p};
 const erros=(buf,f,tempos)=>{const x=buf.getChannelData(0),sr=buf.sampleRate,bias=tom(f,sr);return tempos.map(t=>Math.round(((inicio(x,f,sr,Math.round(t*sr)).i-bias)/sr-t)*1000))};
 $('lpBtn').click();for(let i=0;i<60&&!LP.ctx;i++)await esp(100);if(!LP.ctx)return JSON.stringify({erro:'sem contexto',msg:$('lpM').textContent});
 out.sr=LP.sr;out.latInicial=LP.lat+' '+LP.src;
 // 1) calibração
 $('lpCal').click();for(let i=0;i<80&&!LP.cal;i++)await esp(20);while(LP.cal)await esp(100);out.calibrado=LP.lat+' ms ('+LP.src+') msg: '+$('lpM').textContent;
 // 2) loop de 2 compassos a 120 bpm: notas Lá 440 em cada tempo
 LP.n=2;st=P.st;st.cnt.bpm=120;st.bpb=4;$('lpRec').click();for(let i=0;i<50&&LP.T0==null;i++)await esp(20);
 const T0=LP.T0,bs=.5;for(let i=0;i<8;i++)nota(T0+i*bs,440);
 while(!LP.layers.length&&LP.take)await esp(100);out.camadas1=LP.layers.length;if(!LP.layers.length)return JSON.stringify({...out,erro:'loop não gravado',msg:$('lpM').textContent});
 out.loopSeg=(LP.len/LP.sr).toFixed(4);out.loopErrosMs=erros(LP.layers[0].buf,440,[0,1,2,3,4,5,6,7].map(i=>i*bs));
 // clique que vazou no microfone: energia em 2637/2093 Hz no loop, comparada com a nota
 {const x=LP.layers[0].buf.getChannelData(0),sr=LP.sr,mx=a=>{let m=0;for(const v of a)if(v>m)m=v;return m},eN=mx(env(x,440,sr)),eC=mx(env(x,2637,sr)),eC2=mx(env(x,2093,sr));out.cliqueVsNotaDb=Math.round(20*Math.log10(Math.max(eC,eC2)/eN))}
 // 3) camada 2 com o loop tocando: Mi 660 nos contratempos
 await esp(300);$("lpRec").click();for(let i=0;i<50&&!LP.take;i++)await esp(20);const Tb=LP.take.Tb;for(let i=0;i<8;i++)nota(Tb+(i+.5)*bs,660);
 while(LP.take)await esp(100);out.camadas2=LP.layers.length;out.camada2ErrosMs=erros(LP.layers[1].buf,660,[0,1,2,3,4,5,6,7].map(i=>(i+.5)*bs));
 out.tocando=LP.T0!=null;out.status=$('lpS').textContent;
 // 4) ajuste manual: +50 ms tem que puxar as camadas 50 ms para trás
 const antes=LP.lat;$('lpLu').click();for(let k=0;k<9;k++)$('lpLu').click();out.ajuste=antes+'→'+LP.lat;
 out.camada2Com50ms=erros(LP.layers[1].buf,660,[0,1,2,3].map(i=>(i+.5)*bs));
 // 5) mudo, desfazer, apagar, fechar
 $('lpL').querySelector('button').click();out.mudo=LP.layers[0].on===false;
 $('lpUndo').click();out.depoisDesfazer=LP.layers.length;window.confirm=()=>true;$('lpClr').click();out.depoisApagar=LP.layers.length+' tocando='+(LP.T0!=null);
 const ms=LP.ms;$('lp').close();await esp(200);out.fechou='ctx='+(LP.ctx===null)+' mic='+(ms.getTracks().every(t=>t.readyState==='ended'));
 out.salvo=localStorage.getItem('partitura.lat');return JSON.stringify(out)};
(async()=>{await new Promise(r=>srv.listen(8765,'127.0.0.1',r));const t=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
 let id=0;const pend={},errs=[];ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id]}if(d.method=='Runtime.exceptionThrown')errs.push(d.params.exceptionDetails.exception?.description)});
 const cmd=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
 await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Page.navigate',{url:'http://127.0.0.1:8765/partitura-violao/'});await sleep(2500);
 const r=await cmd('Runtime.evaluate',{expression:`(${PAGINA.toString()})(${ATRASO})`,awaitPromise:true,returnByValue:true});
 const v=r.result?.result?.value;if(r.result?.exceptionDetails)console.log("EXCEÇÃO",r.result.exceptionDetails.exception?.description);console.log('atraso simulado',Math.round(ATRASO*1000),'ms');try{for(const[k,x]of Object.entries(JSON.parse(v)))console.log(k.padEnd(16),Array.isArray(x)?x.join(' '):x)}catch{console.log(v||JSON.stringify(r).slice(0,1500))}
 if(errs.length)console.log('ERROS',errs);ws.close();srv.close();srv.closeAllConnections();process.exit(0)})().catch(e=>{console.error('ERRO',e);process.exit(1)});
