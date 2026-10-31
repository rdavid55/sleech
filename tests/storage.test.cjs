const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function storage(){const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
function setup(){const localStorage=storage(),sessionStorage=storage(),window={dispatchEvent(){}};vm.runInNewContext(fs.readFileSync(require.resolve('../docs/assets/sleech-data.js'),'utf8'),{localStorage,sessionStorage,window,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}}});return {api:window.SleechData,localStorage,sessionStorage};}
test('privacy mode changes never replace a newer saved draft with an old session copy',()=>{
 const {api}=setup();
 api.drafts.setItem('slich-case-v2','first');api.choose(true);
 api.drafts.setItem('slich-case-v2','latest');api.choose(true);
 assert.equal(api.drafts.getItem('slich-case-v2'),'latest');
 api.choose(false);assert.equal(api.drafts.getItem('slich-case-v2'),'latest');
 api.drafts.setItem('slich-case-v2','edited in session');api.choose(true);
 assert.equal(api.drafts.getItem('slich-case-v2'),'edited in session');
});
test('clear removes drafts and all owned page snapshots, preserving preferences and unrelated data',()=>{
 const {api,sessionStorage,localStorage}=setup();api.choose(true);
 api.drafts.setItem('slich-case-v2','case');api.drafts.setItem('slich-brief-v1','brief');api.drafts.setItem('slich-intake-v2','intake');
 sessionStorage.setItem('slich-page-v2-workspace','case copy');sessionStorage.setItem('slich-page-v2-measurements','measurements');sessionStorage.setItem('unrelated','keep');
 assert.equal(api.clearSaved(),true);
 assert.equal(api.drafts.getItem('slich-case-v2'),null);assert.equal(api.drafts.getItem('slich-brief-v1'),null);assert.equal(api.drafts.getItem('slich-intake-v2'),null);
 assert.equal(sessionStorage.getItem('slich-page-v2-workspace'),null);assert.equal(sessionStorage.getItem('slich-page-v2-measurements'),null);
 assert.equal(sessionStorage.getItem('unrelated'),'keep');assert.ok(localStorage.getItem('sleech-privacy-v1'));
});
test('temporary copies are cleared even when persistent storage is unavailable',()=>{
 const {api,localStorage}=setup();api.drafts.setItem('slich-case-v2','temporary');
 localStorage.removeItem=()=>{throw new Error('blocked')};
 assert.equal(api.clearSaved(),false);assert.equal(api.drafts.getItem('slich-case-v2'),null);
});
