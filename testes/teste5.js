// Metrônomo vazando no microfone: cliques senoidais 2093/2637 Hz bem altos por cima do violão/pad
const fs=require('fs');let src=fs.readFileSync(process.argv[2],'utf8');
fs.writeFileSync(process.argv[2]+'.tmp.js',fs.readFileSync(__dirname+'/teste4.js','utf8').replace(/const casos=[\s\S]*$/,`
const SR2=22050;function cliques(x,bpm,amp,lead){for(let k=0;;k++){const t=lead+k*60/bpm,a=Math.round(t*SR2);if(a>=x.length)break;const f=k%4==0?2637:2093;
 for(let i=0;i<Math.round(.06*SR2)&&a+i<x.length;i++){const tt=i/SR2,env=Math.min(1,tt/.005)*Math.exp(-tt/.012);x[a+i]+=amp*(k%4==0?1:.67)*env*Math.sin(2*Math.PI*f*tt)}}return x}
for(const ins of['violao','piano','pad'])for(const amp of[0,.5,1.5]){st.ins=ins;const x=cliques(gera(ins,()=>96,12,.12),96,amp,.12);st.demo=false;st.tr=0;st.lagMul=1;st.grid={bpm:96,met:true};st.buf=x;st.F=T.frames(x);T.analyse();
 const r=nota();console.log(ins.padEnd(7),'clique x'+amp,r.ok+'/12',r.s.slice(0,80))}
`));
