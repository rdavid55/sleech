// Run the actual controller with a small DOM fixture; no browser dependencies.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../docs/assets/slich-core.js');
const DATA=require('../docs/service-data.json');
const controller=fs.readFileSync(require.resolve('../docs/assets/service-v2.js'),'utf8');
function attributes(text){return Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));}
class Element{
 constructor(tag,attrs={}){Object.assign(this,{tag,attrs,id:attrs.id,value:attrs.value||'',type:attrs.type||'',checked:false,disabled:false,hidden:false,innerHTML:'',textContent:'',dataset:{},children:[],handlers:{},classList:{toggle(){},remove(){},add(){}}});for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
 addEventListener(name,f){(this.handlers[name]??=[]).push(f);}
 async fire(name){for(const f of this.handlers[name]||[])await f({target:this,preventDefault(){}});}
 querySelectorAll(selector){return this.children.filter(e=>selector.startsWith('input')?e.tag==='input':false);}
 replaceChildren(...items){this.children=items;this.innerHTML='';this.textContent='';}
 append(...items){this.children.push(...items);}
 prepend(...items){this.children.unshift(...items);}
 setAttribute(k,v){this.attrs[k]=v;}
 removeAttribute(k){delete this.attrs[k];}
 focus(){}
 click(){return this.fire('click');}
}
async function setup(page,lang='ru'){
 const html=fs.readFileSync(require.resolve('../docs/'+(lang==='en'?'en/':'')+page+'.html'),'utf8');
 const elements=[...html.matchAll(/<([a-z][a-z\d-]*)\b([^>]*)>/gi)].map(m=>new Element(m[1],attributes(m[2])));
 const ids=Object.fromEntries(elements.filter(e=>e.id).map(e=>[e.id,e]));
 for(const m of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)){const id=attributes(m[1]).id;ids[id].children=[...m[2].matchAll(/\bid="([^"]+)"/g)].map(x=>ids[x[1]]);}
 const document={documentElement:{lang},body:{dataset:{page}},getElementById:id=>ids[id]||null,addEventListener(){},createElement:tag=>new Element(tag),querySelectorAll(selector){
  if(selector==='form')return elements.filter(e=>e.tag==='form');
  if(selector==='[data-sync]')return [];
  if(selector==='[data-tab]')return elements.filter(e=>e.dataset.tab);
  if(selector==='.tab-panel')return elements.filter(e=>(e.attrs.class||'').split(' ').includes('tab-panel'));
  if(selector.startsWith('input[id]'))return elements.filter(e=>e.id&&(['input','select','textarea'].includes(e.tag))&&e.type!=='file');
  return [];
 }};
 const downloads=[];const store=new Map();const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const window={SlichCore:C,SLEECH_BASE:'/',SleechData:{session:storage,drafts:storage,persistent:false},addEventListener(){},print(){}};
 const context={window,document,location:{search:'',hash:''},navigator:{clipboard:{writeText:async()=>{}}},sessionStorage:storage,localStorage:storage,fetch:async()=>({ok:true,json:async()=>DATA}),URLSearchParams,Blob,URL:{createObjectURL:b=>{downloads.push(b);return 'blob:test'},revokeObjectURL(){}},setTimeout:()=>0};
 await vm.runInNewContext(controller,context);
 return {ids,downloads,store};
}
function validRecord(){const row={case_id:'TEST',protocol_version:'v1',object_id:'PART',characteristic:'deviation',section:'S1',site:'A',operator:'O',repeat:'1',value:'-0,001',unit:'mm',instrument_id:'I',method:'M',temperature_C:'20',expanded_uncertainty:'.004',coverage_factor:'2',reference_id:'R',timestamp:'2026-10-27T12:00:00Z',comment:'Synthetic',extra_column:'Keep me'};const headers=[...C.HEADERS,'extra_column'];return {schema:'slich-case-v2',passport:{'case-id':'TEST','object-id':'PART',characteristic:'deviation',unit:'mm','protocol-version':'v1','case-owner':'QA'},working:C.parseCSV(C.csv([headers,headers.map(h=>row[h])]))};}
async function upload(input,text){input.files=[{size:text.length,text:async()=>text}];await input.fire('change');}

test('invalid economic input removes the previous positive conclusion',async()=>{
 const {ids}=await setup('calculator');assert.match(ids['effect-conclusion'].textContent,/Положительный/);
 ids['dispute-cost'].value='';await ids['effect-form'].fire('input');
 assert.equal(ids['effect-net'].textContent,'—');assert.doesNotMatch(ids['effect-conclusion'].textContent,/Положительный/);assert.equal(ids['effect-export'].disabled,true);
});
test('failed CSV and incomplete JSON preserve the current case and block checked exports',async()=>{
 const {ids}=await setup('workspace');await upload(ids['case-import'],JSON.stringify(validRecord()));
 assert.equal(ids['case-id'].value,'TEST');assert.equal(ids['case-csv'].disabled,false);
 await upload(ids['csv-upload'],'wrong;headers\n1;2');
 assert.equal(ids['case-id'].value,'TEST');assert.equal(ids['case-csv'].disabled,true);assert.equal(ids['case-print'].disabled,true);assert.match(ids['import-message'].textContent,/не изменён/);
 await ids['import-continue'].fire('click');assert.equal(ids['case-csv'].disabled,false);
 await upload(ids['case-import'],JSON.stringify({schema:'slich-case-v2',passport:{'case-id':'OTHER'},working:null}));
 assert.equal(ids['case-id'].value,'TEST');assert.equal(ids['object-id'].value,'PART');assert.equal(ids['case-csv'].disabled,true);
});
test('checked export retains additional columns and signed comma-decimal values',async()=>{
 const {ids,downloads}=await setup('workspace');await upload(ids['case-import'],JSON.stringify(validRecord()));
 await ids['case-csv'].fire('click');const exported=C.parseCSV(await downloads.at(-1).text());
 assert.equal(exported.rows[0].data.extra_column,'Keep me');assert.equal(exported.rows[0].data.value,'-0,001');
 assert.match(ids['report-content'].innerHTML,/Ответственный специалист/);assert.match(ids['report-content'].innerHTML,/Единица/);assert.doesNotMatch(ids['report-content'].innerHTML,/<span>case-owner/);
});
test('a file read failure leaves the case intact with actionable feedback',async()=>{
 const {ids}=await setup('workspace');await upload(ids['case-import'],JSON.stringify(validRecord()));
 ids['csv-upload'].files=[{size:12,text:async()=>{throw Error('read failed')}}];await ids['csv-upload'].fire('change');
 assert.equal(ids['case-id'].value,'TEST');assert.equal(ids['case-csv'].disabled,true);assert.match(ids['import-message'].textContent,/не загружен/);
});
test('the last selected file wins when two reads finish out of order',async()=>{
 const {ids}=await setup('workspace');let resolve;
 ids['case-import'].files=[{size:100,text:()=>new Promise(r=>resolve=r)}];const first=ids['case-import'].fire('change');
 const newer=validRecord();newer.passport['case-id']='NEWER';newer.working=null;
 await upload(ids['case-import'],JSON.stringify(newer));resolve(JSON.stringify(validRecord()));await first;
 assert.equal(ids['case-id'].value,'NEWER');
});
test('empty task descriptions are blocked instead of producing a ready brief',async()=>{
 const {ids,downloads}=await setup('request');await ids['brief-export'].fire('click');
 assert.equal(downloads.length,0);assert.match(ids['brief-status'].textContent,/Укажите/);
});
test('failed draft restore cancels a pending import without leaving the workspace stuck',async()=>{
 const {ids}=await setup('workspace');await upload(ids['case-import'],JSON.stringify(validRecord()));
 let resolve;
 ids['case-import'].files=[{size:100,text:()=>new Promise(r=>resolve=r)}];const pending=ids['case-import'].fire('change');
 await ids['case-load'].fire('click');
 assert.equal(ids['import-continue'].hidden,false);assert.equal(ids['case-csv'].disabled,true);
 const late=validRecord();late.passport['case-id']='LATE';resolve(JSON.stringify(late));await pending;
 assert.equal(ids['case-id'].value,'TEST');
 await ids['import-continue'].fire('click');assert.equal(ids['case-csv'].disabled,false);
});
