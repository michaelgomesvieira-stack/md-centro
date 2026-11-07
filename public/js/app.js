const F=["Dentro do prazo (0-19)","Alerta (20-30)","Crítico (31–59)","Fora do prazo (60+)"],FC=["#16a34a","#facc15","#dc2626","#000"];
const fx=d=>d<=19?0:d<=30?1:d<=59?2:3;
const nw=new Date(),T=Date.UTC(nw.getFullYear(),nw.getMonth(),nw.getDate())/864e5;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const CFG={
 novo:{name:"Medidores novos",kpi:"TOTAL DE MEDIDORES NOVOS",dk:"model",key:"dashboard-medidores:dados",sheet:/MD.*DISP/i,strict:false,dateCol:"DATA REC. ELET",dimCol:"MODELO",dateHead:"Recebido em",dimHead:"Modelo",D:DN},
 retirado:{name:"Medidores retirados de campo",kpi:"TOTAL DE MEDIDORES RETIRADOS DE CAMPO",dk:"st",key:"dashboard-medidores:tria",sheet:/^\s*ME?D\W*TRIA/i,strict:true,sheetName:"MED-TRIA",dateCol:"DATA",dimCol:"STATUS",dateHead:"Data",dimHead:"Status",D:DR}
};
const K=["base","loc","dim","faixa","resp"],ST={};let X,mode;
const BOLT='<svg class="bolt" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 1.5 4 13.5h6.2L8.8 22.5 20 9.5h-6.4z" fill="#facc15" stroke="#0A0F5C" stroke-width="1.4" stroke-linejoin="round"/></svg>';
function prep(c,D){if(!D.dim)D.dim=D[c.dk];return D}
function build(x){const D=x.CUR;
 x.R=D.rows.map(r=>({d:T-r[0],date:r[0],resp:r[1],loc:r[2],base:r[3],dim:r[4],m:r[5],dep:r[6]||"",faixa:fx(T-r[0])}));
 x.L={faixa:F,base:D.base,loc:D.loc,dim:D.dim,resp:D.resp};
 const dc=D.resp.map(()=>({}));x.R.forEach(r=>{if(r.dep)dc[r.resp][r.dep]=(dc[r.resp][r.dep]||0)+1});
 x.RL=D.resp.map((n,i)=>{const ks=Object.keys(dc[i]).sort((a,b)=>dc[i][b]-dc[i][a]);return ks.length?ks[0]+" - "+n:n})}
function clearF(x){K.forEach(k=>x.S[k].clear());x.Q=x.MQ="";x.lim=100}
function stored(c){try{const v=JSON.parse(localStorage.getItem(c.key)),d=v&&v.data;
 if(d&&d.rows&&d.rows.length&&prep(c,d).dim)return[d,v.savedAt]}catch(e){}return null}
function fmt(iso){const d=new Date(iso);return isNaN(d)?"":d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
function note(x,t){x.msg=t;if(X===x)$("svs").textContent=t}
Object.keys(CFG).forEach(m=>{const c=CFG[m],s=stored(c);
 const x=ST[m]={CUR:s?s[0]:prep(c,c.D),S:{},Q:"",MQ:"",lim:100,dirty:false,msg:s?"Salvo em "+fmt(s[1]):""};
 K.forEach(k=>x.S[k]=new Set());build(x)});
function pass(r,ex){for(const k of K)if(k!==ex&&X.S[k].size&&!X.S[k].has(r[k]))return false;return true}
const rows=ex=>X.R.filter(r=>pass(r,ex));
function cnt(a,k){const c=new Array(X.L[k].length).fill(0);a.forEach(r=>c[r[k]]++);return c}
function toggle(k,v){const s=X.S[k];s.has(v)?s.delete(v):s.add(v);X.lim=100;draw()}
function slicer(k){const el=$("s-"+k);if(!el)return;
 const L=k==="resp"?X.RL:X.L[k],c=cnt(rows(k),k),q=k==="resp"?X.Q.toLowerCase():"";let h="";
 L.map((t,i)=>i).sort((a,b)=>k==="base"?String(L[b]).length-String(L[a]).length:0).forEach(i=>{const t=String(L[i]);if(q&&t.toLowerCase().indexOf(q)<0)return;
  h+=`<button type="button" class="chip${X.S[k].has(i)?" on":""}${c[i]?"":" z"}" data-k="${k}" data-v="${i}">${esc(t)} <b>${c[i]}</b></button>`});
 el.innerHTML=h||'<span class="empty">Nada encontrado</span>'}
function bars(id,k,a,top){const L=k==="resp"?X.RL:X.L[k],S=X.S[k];
 let o=cnt(a,k).map((v,i)=>[i,v]).filter(p=>p[1]>0||S.has(p[0]));
 if(k!=="faixa")o.sort((p,q)=>q[1]-p[1]);if(top)o=o.slice(0,top);
 const mx=Math.max(1,...o.map(p=>p[1]));let h="";
 o.forEach(p=>{const t=esc(L[p[0]]);
  h+=`<div class="br${S.has(p[0])?" on":""}" data-k="${k}" data-v="${p[0]}" title="${t}"><span>${t}</span><i><u style="width:${p[1]/mx*100}%${k==="faixa"?";background:"+FC[p[0]]:""}"></u></i><em>${p[1]}</em></div>`});
 $(id).innerHTML=h||'<div class="empty">Sem dados</div>'}
function fit(){const c=$("rc"),ch=$("s-resp"),g=document.querySelector(".grid");c.style.height="";ch.style.maxHeight="";
 if(mode!=="retirado"||innerWidth<=900)return;
 const h=g.getBoundingClientRect().bottom-c.getBoundingClientRect().top;if(h>200){c.style.height=h+"px";ch.style.maxHeight="none"}}
function draw(){const c=CFG[mode];K.forEach(slicer);const a=rows(null);
 $("kpis").innerHTML=`<div class="card k"><div class="kt"><small>${c.kpi}</small><div>${a.length}</div></div>${BOLT}</div>`;
 bars("c-loc","loc",a);bars("c-faixa","faixa",a);
 if(mode==="novo"){bars("c-dim","dim",a);bars("c-resp","resp",a,10)}else bars("c-resp2","resp",a,10);
 const t=a.filter(r=>!X.MQ||String(r.m).indexOf(X.MQ)>=0).sort((p,q)=>q.d-p.d);
 $("cnt").textContent="("+t.length+")";
 let h=`<table><tr><th>Medidor</th><th>${c.dimHead}</th><th>Base</th><th>Localidade</th><th>Depósito</th><th>Responsável</th><th>${c.dateHead}</th><th>Dias</th></tr>`;
 t.slice(0,X.lim).forEach(r=>{const dt=new Date(r.date*864e5).toISOString().slice(0,10).split("-").reverse().join("/");
  h+=`<tr><td>${esc(r.m)}</td><td>${esc(X.L.dim[r.dim])}</td><td>${esc(X.L.base[r.base])}</td><td>${esc(X.L.loc[r.loc])}</td><td>${esc(r.dep||"—")}</td><td>${esc(X.L.resp[r.resp])}</td><td>${dt}</td><td><span class="d" style="background:${FC[r.faixa]};color:${r.faixa==1?"#1f2937":"#fff"}">${r.d}</span></td></tr>`});
 h+="</table>";if(!t.length)h='<div class="empty">Nenhum medidor com esses filtros.</div>';
 if(t.length>X.lim)h+=`<button type="button" class="clr more" id="more">Mostrar mais (${t.length-X.lim} restantes)</button>`;
 $("tbl").innerHTML=h;fit()}
function setMode(m){if(!CFG[m])m="novo";mode=m;X=ST[m];const c=CFG[m];
 document.body.dataset.mode=m;$("ttl").textContent="⚡ Gestão de Medidores — PDT · BDC · PDS";document.title="Gestão de Medidores — "+c.name;
 Object.keys(CFG).forEach(k=>{const b=$("t-"+k);b.classList.toggle("on",k===m);b.setAttribute("aria-selected",k===m)});
 $("rq").value=X.Q;$("mq").value=X.MQ;$("sv").classList.toggle("dirty",X.dirty);$("svs").textContent=X.msg;draw()}
function go(m){try{if(location.hash!=="#"+m)location.hash=m}catch(e){}setMode(m)}
addEventListener("hashchange",()=>{const m=location.hash.slice(1);if(CFG[m]&&m!==mode)setMode(m)});
addEventListener("resize",fit);
document.addEventListener("click",e=>{
 const tb=e.target.closest("[data-tab]");if(tb)return go(tb.dataset.tab);
 const b=e.target.closest("[data-k]");if(b)return toggle(b.dataset.k,+b.dataset.v);
 if(e.target.id==="more"){X.lim+=200;draw()}});
$("clr").onclick=()=>{clearF(X);$("rq").value=$("mq").value="";draw()};
$("rq").oninput=e=>{X.Q=e.target.value;slicer("resp")};
$("mq").oninput=e=>{X.MQ=e.target.value.trim();X.lim=100;draw()};
let API=null,ADM=null,pend=null; // API: null=desconhecida, true=backend ok, false=sem backend; ADM=senha validada (só em memória)
async function api(method,body,qs){
 const r=await fetch("/api/data"+(qs||""),{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined,cache:"no-store"});
 let j=null;try{j=await r.json()}catch(e){}
 return{status:r.status,j}}
function askPw(then){pend=then;$("pwi").value="";$("pwe").textContent="";$("pw").hidden=false;$("pwi").focus()}
async function doSave(){const m=mode,x=X,at=new Date().toISOString();
 if(API!==false){
  $("sv").disabled=true;
  try{
   const d=x.CUR,r=await api("POST",{action:"save",password:ADM,mode:m,data:{resp:d.resp,loc:d.loc,base:d.base,dim:d.dim,rows:d.rows}});
   if(r.status===200){x.dirty=false;x.sa=r.j.savedAt;if(X===x)$("sv").classList.remove("dirty");
    try{localStorage.removeItem(CFG[m].key)}catch(e){}
    note(x,"Salvo e compartilhado com todos em "+fmt(r.j.savedAt));return}
   if(r.status===401){ADM=null;note(x,"Senha incorreta ou expirada.");askPw(doSave);return}
   if(r.status===404||r.status===405||r.status===501){API=false}
   else{note(x,(r.j&&r.j.error)||"Não foi possível salvar no servidor.");return}
  }catch(e){if(API===true){note(x,"Sem conexão com o servidor. Nada foi salvo.");return}API=false}
  finally{$("sv").disabled=false}
 }
 try{localStorage.setItem(CFG[m].key,JSON.stringify({data:x.CUR,savedAt:at}));
  x.dirty=false;if(X===x)$("sv").classList.remove("dirty");note(x,"Salvo apenas neste navegador em "+fmt(at))}catch(e){note(x,"Não foi possível salvar neste navegador.")}}
$("sv").onclick=()=>{if(API===false||ADM)doSave();else askPw(doSave)};
$("exp").onclick=()=>{
 const o=m=>{const d=ST[m].CUR;return JSON.stringify({resp:d.resp,loc:d.loc,base:d.base,dim:d.dim,rows:d.rows})};
 const txt="// Dados do painel (gerado em "+new Date().toLocaleString("pt-BR")+").\n// DN = medidores novos, DR = medidores retirados.\nconst DN="+o("novo")+";\nconst DR="+o("retirado")+";\n";
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/javascript"}));a.download="data.js";
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 note(X,"data.js gerado: substitua js/data.js no projeto e faça commit/push.")};
$("impb").onclick=()=>{
 const open=()=>$("imp").click();
 if(API===false||ADM)open();
 else askPw(()=>{note(X,"Acesso liberado. Se o seletor de arquivo não abrir, clique em Importar de novo.");open()})};
$("pwc").onclick=()=>{$("pw").hidden=true;pend=null};
$("pw").addEventListener("click",e=>{if(e.target.id==="pw"){$("pw").hidden=true;pend=null}});
addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("pw").hidden){$("pw").hidden=true;pend=null}});
$("pwf").onsubmit=async e=>{e.preventDefault();
 const p=$("pwi").value;if(!p)return;const b=$("pwb");b.disabled=true;
 try{
  const r=await api("POST",{action:"check",password:p});
  if(r.status===200){ADM=p;API=true;$("pw").hidden=true;const f=pend;pend=null;if(f)f()}
  else if(r.status===401){$("pwe").textContent="Senha incorreta.";$("pwi").select()}
  else if(r.status===404||r.status===405||r.status===501){API=false;$("pw").hidden=true;const f=pend;pend=null;if(f)f()}
  else $("pwe").textContent=(r.j&&r.j.error)||"Servidor indisponível."
 }catch(err){$("pwe").textContent="Sem conexão com o servidor."}
 finally{b.disabled=false}};
$("imp").onchange=ev=>{
 const f=ev.target.files[0];ev.target.value="";if(!f)return;
 const m=mode,c=CFG[m],x=ST[m];
 if(typeof XLSX==="undefined"){note(x,"Não foi possível carregar o leitor de planilhas. Verifique a conexão e tente novamente.");return}
 const rd=new FileReader();
 rd.onload=e=>{try{
  const wb=XLSX.read(e.target.result,{type:"array"});
  let nm=wb.SheetNames.find(s=>c.sheet.test(s));
  if(!nm){if(c.strict){note(x,"Não encontrei a aba "+c.sheetName+" nessa planilha.");return}nm=wb.SheetNames[0]}
  const js=XLSX.utils.sheet_to_json(wb.Sheets[nm],{defval:""}),need=[c.dateCol,"MEDIDORES","BASE","LOCALIDADES",c.dimCol,"RESPONSÁVEIS"],hd={};
  if(js.length)Object.keys(js[0]).forEach(k=>{hd[String(k).trim().toUpperCase()]=1});
  const miss=need.filter(k=>!hd[k]);
  if(!js.length||miss.length){note(x,'A aba "'+nm+'" não tem as colunas esperadas.'+(miss.length?" Faltando: "+miss.join(", ")+".":""));return}
  const raw=[],sets={resp:{},loc:{},base:{},dim:{}};
  js.forEach(o=>{const g={};for(const k in o)g[String(k).trim().toUpperCase()]=o[k];
   const dt=g[c.dateCol],mm=g["MEDIDORES"];let day;
   if(dt===""||dt==null||mm==="")return;
   if(dt instanceof Date)day=Math.floor(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())/864e5);
   else if(typeof dt==="number")day=Math.floor(dt)-25569;
   else{const p=String(dt).match(/(\d+)\/(\d+)\/(\d+)/);if(!p)return;day=Date.UTC(+p[3]<100?2000+ +p[3]:+p[3],p[2]-1,+p[1])/864e5}
   const v={resp:g["RESPONSÁVEIS"],loc:g["LOCALIDADES"],base:g["BASE"],dim:g[c.dimCol]};
   for(const k in v){v[k]=String(v[k]).trim()||"(não informado)";sets[k][v[k]]=1}
   raw.push([day,v,String(mm).trim(),String(g["DEPÓSITOS"]||g["DEPOSITOS"]||g["DEPÓSITO"]||g["DEPOSITO"]||"").trim()])});
  if(!raw.length){note(x,"Nenhuma linha válida encontrada na planilha.");return}
  const nd={rows:[]},ix={};
  ["resp","loc","base","dim"].forEach(k=>{nd[k]=Object.keys(sets[k]).sort();ix[k]={};nd[k].forEach((t,i)=>{ix[k][t]=i})});
  raw.forEach(r=>nd.rows.push([r[0],ix.resp[r[1].resp],ix.loc[r[1].loc],ix.base[r[1].base],ix.dim[r[1].dim],r[2],r[3]]));
  x.CUR=nd;build(x);clearF(x);x.dirty=true;
  if(X===x){$("rq").value=$("mq").value="";$("sv").classList.add("dirty")}
  note(x,raw.length+" medidores importados de "+f.name+" (aba "+nm+") · clique em 💾 Salvar para guardar");
  if(X===x)draw();
 }catch(err){note(x,"Não foi possível ler o arquivo. Confirme que é uma planilha .xlsx válida.")}};
 rd.readAsArrayBuffer(f)};
{let h="";try{h=location.hash.slice(1)}catch(e){}setMode(CFG[h]?h:"novo")}

async function sync(){
 for(const m of Object.keys(CFG)){const x=ST[m],c=CFG[m];
  try{
   const r=await api("GET",null,"?mode="+m);
   if(r.status!==200||!r.j||!("configured" in r.j)){API=false;return}
   if(API===null)API=true;
   const d=r.j.data;
   if(!d||!d.rows||!d.rows.length||x.dirty||r.j.savedAt===x.sa)continue;
   x.CUR=prep(c,d);x.sa=r.j.savedAt;build(x);clearF(x);
   note(x,"Dados compartilhados · atualizado em "+fmt(r.j.savedAt));
   if(X===x){$("rq").value=$("mq").value="";draw()}
  }catch(e){if(API===null)API=false;return}}}
sync();
setInterval(()=>{if(!document.hidden&&API===true)sync()},60000);
