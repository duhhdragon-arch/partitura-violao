// Andamento variável: gera violão/teclado com batidas em tempos irregulares e confere os compassos
const fs=require('fs');let js=fs.readFileSync(process.argv[2],'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
js=js.replace(/setIns\(st\.ins\);showDemo\(\);\s*\}\s*$/,'globalThis.T={st,demo,frames,analyse,showDemo,flatKey,chName,pluck,kb,setSeed:v=>{seed=v}};}');
const el=()=>({textContent:'',innerHTML:'',value:'',hidden:false,clientWidth:900,dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},showModal(){}});const els={};
globalThis.document={getElementById:id=>els[id]||(els[id]=el()),querySelectorAll:()=>[],documentElement:{dataset:{}}};globalThis.ResizeObserver=class{observe(){}};
globalThis.addEventListener=()=>{};globalThis.location={pathname:'/p/',href:'https://x/p/'};globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.cancelAnimationFrame=()=>{};globalThis.setTimeout=f=>f();
(0,eval)(js);const {st}=T;const SR=22050;
const PROG=['C','Am','F','G'];
function gera(ins,bpmAt,bars,lead){T.setSeed(7);const bt=[];let t=lead;for(let i=0;i<=bars*4;i++){bt.push(t);t+=60/bpmAt(i/(bars*4))}
 const x=new Float32Array(Math.ceil((t+1.5)*SR));
 const V=[[48,52,55,60,64],[45,52,57,60,64],[41,48,53,57,60,65],[43,47,50,55,59,67]],K=[[36,48,60,64,67],[33,45,60,64,69],[29,41,60,65,69],[31,43,59,62,67]];
 for(let i=0;i<bars;i++)for(let k=0;k<4;k++){const a=Math.round(bt[i*4+k]*SR),B=Math.round((bt[i*4+k+1]-bt[i*4+k])*SR);
  if(ins=='violao'){const v=V[i%4],dn=k%2==0,ns=dn?v:[...v].reverse().slice(0,4);ns.forEach((m,j)=>T.pluck(x,a+j*Math.round(.012*SR),m,Math.round(B*1.05),dn?.25:.14))}
  else if(ins=='piano'){const v=K[i%4];if(k%2==0)v.slice(0,2).forEach(m=>T.kb(x,a,m,Math.round((bt[i*4+k+2]-bt[i*4+k])*SR),.2,ins));v.slice(2).forEach(m=>T.kb(x,a,m,B,k%2?.1:.14,ins))}
  else if(k==0){const v=K[i%4],E=Math.round((bt[i*4+4]-bt[i*4])*SR);v.forEach(m=>T.kb(x,a,m,E,.08,ins))}}
 let mx=0;for(const v of x)mx=Math.max(mx,Math.abs(v));for(let i=0;i<x.length;i++)x[i]*=.5/mx;return x}
function nota(grid){const A=st.A,fl=T.flatKey(A.key);const got=A.bars.map(b=>b.ch.map(c=>T.chName(c.t,fl)).join(' '));
 let ok=0;got.forEach((g,i)=>{if(g==PROG[i%4])ok++});return{ok,n:got.length,s:`bpm=${A.bpm} `+got.join('|')}}
const casos=[['constante 96',()=>96,96],['acelera 84→104',f=>84+20*f,84],['desacelera 104→84',f=>104-20*f,104],['oscila ±7%',f=>92*(1+.07*Math.sin(f*2*Math.PI*2.5)),92],['solta: 90→100→88',f=>f<.5?90+20*f:100-24*(f-.5),90]];
let tot=0,tt=0;
for(const ins of(process.argv[3]||'violao,piano,pad').split(','))for(const[nm,fn,cb]of casos)for(const modo of['contagem','sem']){
 st.ins=ins;const x=gera(ins,fn,12,modo=='contagem'?.12:.3);st.demo=false;st.tr=0;st.lagMul=1;st.grid=modo=='contagem'?{bpm:cb}:null;st.buf=x;st.F=T.frames(x);const t0=Date.now();T.analyse();
 const r=nota();tot+=r.ok;tt+=12;console.log(`${ins.padEnd(7)} ${nm.padEnd(18)} ${modo.padEnd(8)} ${r.ok}/12 (${r.n} comp) ${Date.now()-t0}ms  ${r.s.slice(0,110)}`)}
console.log('TOTAL',tot+'/'+tt);
