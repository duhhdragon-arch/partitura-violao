const fs=require('fs');let js=fs.readFileSync(process.argv[2],'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
js=js.replace(/setIns\(st\.ins\);showDemo\(\);\s*\}\s*$/,'globalThis.T={st,demo,frames,analyse,showDemo,flatKey,chName,cifraTxt,render,openPick,applyPick,PK,TPL,cifraRep,pacote,REP,b64u};}');
const el=()=>({textContent:'',innerHTML:'',value:'',hidden:false,clientWidth:900,dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},showModal(){}});const els={};
globalThis.document={getElementById:id=>els[id]||(els[id]=el()),querySelectorAll:()=>[]};globalThis.ResizeObserver=class{observe(){}};
globalThis.addEventListener=()=>{};globalThis.location={pathname:'/partitura-violao/',href:'https://duhhdragon-arch.github.io/partitura-violao/'};globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.cancelAnimationFrame=()=>{};globalThis.setTimeout=f=>f();
(0,eval)(js);const {st}=T;
const seq=()=>{const fl=T.flatKey(st.A.key);return `bpm=${st.A.bpm} bars=${st.A.bars.length} `+st.A.bars.map(b=>b.ch.map(c=>T.chName(c.t,fl)).join(' ')).join(' | ')};
for(const ins of ['violao','piano','orgao','strings','pad']){st.ins=ins;T.showDemo();console.log('sem contagem',ins.padEnd(8),seq())}
// Com contagem: mesmo áudio, andamento conhecido
for(const ins of ['violao','pad']){st.ins=ins;T.showDemo();st.grid={bpm:96};st.F=T.frames(st.buf);T.analyse();console.log('contagem 96 ',ins.padEnd(8),seq())}
// Contagem + entrou 1 tempo atrasado (silêncio de 1 batida no começo): deve aparecer "—" no tempo 1 e acordes deslocados
st.ins='violao';const x=T.demo(),pad=Math.round(60/96*22050),y=new Float32Array(x.length+pad);y.set(x,pad);st.demo=false;st.grid={bpm:96};st.buf=y;st.F=T.frames(y);T.analyse();console.log('atrasou 1 tempo   ',seq().slice(0,90));
// Pad com andamento errado sem contagem vs com
// Correção: compasso 2 tempo 1 vira Dm; tempo 3 do compasso 1 ganha G7; com transposição +2
st.grid=null;st.ins='violao';T.showDemo();st.tr=2;T.openPick(1,0);console.log('picker abre com r=',T.PK.r,'(A=9+2=11 -> B)');T.PK.r=4;T.PK.q=1;T.applyPick('ok');
T.openPick(0,2);T.PK.r=9;T.PK.q=2;T.applyPick('ok');T.openPick(3,0);T.applyPick('del');
console.log(T.cifraTxt());st.tr=0;console.log(T.cifraTxt().split('\n')[1]);
console.log('edits',st.edits,'svg tem hit:',(els.score.innerHTML.match(/class="hit"/g)||[]).length,'ed:',(els.score.innerHTML.match(/fill:var\(--acc\)/g)||[]).length);
console.log('--- pacote para o Repertório (com as correções acima, tr=0) ---');
const pk=T.pacote('Ação de Graças','Tio');console.log(JSON.stringify({...pk,cifra:undefined}));console.log(pk.cifra);
const url=T.REP+'#importar='+T.b64u(JSON.stringify(pk));console.log('URL',url.length,'chars',url.slice(0,90));
fs.writeFileSync(process.argv[3]||'url.txt',url);
