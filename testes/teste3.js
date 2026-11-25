const fs=require('fs');let js=fs.readFileSync(process.argv[2],'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
js=js.replace(/setIns\(st\.ins\);showDemo\(\);\s*\}\s*$/,'globalThis.T={st,yin,forma,Q,CORDAS,showDemo,render,svgViolao,svgTeclado};}');
const el=()=>({textContent:'',innerHTML:'',value:'',hidden:false,clientWidth:900,dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},showModal(){}});const els={};
globalThis.document={getElementById:id=>els[id]||(els[id]=el()),querySelectorAll:()=>[]};globalThis.ResizeObserver=class{observe(){}};
globalThis.addEventListener=()=>{};globalThis.location={pathname:'/partitura-violao/',href:'https://duhhdragon-arch.github.io/partitura-violao/'};globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.cancelAnimationFrame=()=>{};globalThis.setTimeout=f=>f();
(0,eval)(js);
// 1) YIN: tom com harmônicos + ruído, 4096 amostras a 48 kHz
const sr=48000;let worst=0,falhas=0;const linhas=[];
const tom=(f,ph=0)=>{const x=new Float32Array(4096);for(let i=0;i<4096;i++){let s=0;for(let h=1;h<=8;h++)s+=Math.sin(2*Math.PI*f*h*i/sr+ph*h)/h**1.1;x[i]=.3*s+.01*(Math.random()*2-1)}return x};
const alvos=[[41.20,'Mi baixo E1'],[82.41,'E2'],[110,'A2'],[146.83,'D3'],[196,'G3'],[246.94,'B3'],[329.63,'E4'],[440,'A4'],[880,'A5']];
for(const [f0,n] of alvos)for(const c of[-30,-7,0,4,25]){const f=f0*2**(c/1200),r=T.yin(tom(f,Math.random()),sr);
 if(!r){falhas++;linhas.push(`${n} ${c}c: SEM LEITURA`);continue}const err=1200*Math.log2(r.f/f);worst=Math.max(worst,Math.abs(err));if(Math.abs(err)>2)linhas.push(`${n} ${c}c: erro ${err.toFixed(2)}c`)}
console.log('YIN: pior erro',worst.toFixed(3),'cents; sem leitura:',falhas,linhas.length?linhas:'');
console.log('silêncio ->',T.yin(new Float32Array(4096),sr),'; ruído ->',(()=>{const x=new Float32Array(4096).map(()=>.2*(Math.random()*2-1));const r=T.yin(x,sr);return r?('f='+r.f.toFixed(1)+' conf='+r.conf.toFixed(2)):null})());
// 2) Formas de violão
const N=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];let ruins=[];
for(let r=0;r<12;r++)for(let q=0;q<4;q++){const {f}=T.forma(r,q),ns=f.map((v,i)=>v<0?null:T.CORDAS[i]+v).filter(v=>v!==null),pcs=new Set(ns.map(m=>m%12)),chord=T.Q[q].iv.map(i=>(r+i)%12);
 const fora=[...pcs].filter(p=>!chord.includes(p)),falta=[0,1,3].filter(k=>chord[k]!==undefined&&!pcs.has(chord[k])),grave=Math.min(...ns)%12;
 if(fora.length||falta.length||grave!==r||Math.max(...f)>15)ruins.push(`${N[r]}${T.Q[q].s} ${JSON.stringify(f)} fora=${fora} falta=${falta} grave=${N[grave]}`)}
console.log('Formas: 48 testadas, problemas:',ruins.length,ruins);
console.log('exemplos:',['0:0','5:0','10:1','6:2','1:3'].map(k=>{const[r,q]=k.split(':').map(Number);return N[r]+T.Q[q].s+'='+JSON.stringify(T.forma(r,q).f)}).join('  '));
T.st.ins='violao';T.showDemo();console.log('quadro violão:',(els.chd.innerHTML.match(/class="cc"/g)||[]).length,'cartões');
T.st.ins='piano';T.showDemo();T.st.tr=2;T.render();console.log('quadro teclado (tr+2):',(els.chd.innerHTML.match(/<b>[^<]+<\/b>/g)||[]).join(' '));
// 3) corda dedilhada (Karplus-Strong, 22050 Hz): janelas de 4096 do ataque até 2 s
const SRk=22050;let tot=0,oit=0,ruim=0,piores=[];
for(const m of [28,33,38,40,45,50,55,59,64]){const L=Math.round(SRk/(440*2**((m-69)/12))),fEsp=SRk/(L+.5);
 const x=new Float32Array(SRk*2);const d=new Float32Array(L).map(()=>Math.random()*2-1);let p=0;for(let i=0;i<x.length;i++){const q=(p+1)%L,v=d[p];d[p]=.4985*(d[p]+d[q]);x[i]=v*.5;p=q}
 for(let o=0;o+4096<=x.length;o+=2048){const r=T.yin(x.subarray(o,o+4096),SRk);if(!r||r.conf<.85)continue;tot++;const e=1200*Math.log2(r.f/fEsp);
  if(Math.abs(Math.abs(e)-1200)<60)oit++;else if(Math.abs(e)>3){ruim++;piores.push(`m${m} t=${(o/SRk).toFixed(2)}s ${e.toFixed(1)}c`)}}}
console.log(`Corda dedilhada: ${tot} leituras, erro de oitava: ${oit}, erro > 3 cents: ${ruim}`,piores.slice(0,6));
for(const m of [28,33,38,40,45,50,55,59,64]){const L=Math.round(SRk/(440*2**((m-69)/12)));
 const x=new Float32Array(SRk*2);const d=new Float32Array(L).map(()=>Math.random()*2-1);let p=0;for(let i=0;i<x.length;i++){const q=(p+1)%L,v=d[p];d[p]=.4985*(d[p]+d[q]);x[i]=v*.5;p=q}
 const cs=[];let oct=[];for(let o=0;o+4096<=x.length;o+=2048){const r=T.yin(x.subarray(o,o+4096),SRk);if(!r||r.conf<.85)continue;const n=69+12*Math.log2(r.f/440);cs.push(n);if(Math.abs(n-cs[0])>6)oct.push((o/SRk).toFixed(2)+'s:'+n.toFixed(2))}
 const s=[...cs].sort((a,b)=>a-b),med=s[s.length>>1],sp=(s[s.length-1]-s[0])*100;
 console.log(`MIDI ${m} (L=${L}): nota lida ${med.toFixed(3)}  variação ${sp.toFixed(2)} cents  leituras ${cs.length}${oct.length?'  SALTOS: '+oct:''}`)}
