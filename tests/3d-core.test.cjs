const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../docs/assets/slich-3d-core.js');
const close=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} ≠ ${expected}`);
function contains(p,vertices){let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const a=vertices[i],b=vertices[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}

test('Original directional measurements retain their values',()=>{
 for(const [id,major,minor] of [['shaft',20.012,20.001],['bushing',20.012,20.001],['disk',40.012,40.001]]){
  close(G.diameter(id,0),major);close(G.diameter(id,90),minor);close(G.diameter(id,180),major);
 }
});

test('High spots, depressions and taper values agree with the geometry',()=>{
 close(G.radialDelta('flange',6,0),.018);close(G.radialDelta('flange',9,Math.PI),-.012);
 close(G.radialDelta('flange',-11,0),0);
 close(G.radialDelta('pulley',0,0),.024);close(G.radialDelta('pulley',12,Math.PI),-.020);
 close(G.plateDelta(-18,0),.035);close(G.plateDelta(24,5),-.020);
 close(G.diameter('nozzle',0),20.020);close(G.diameter('bracket',0),90.08);
 close(G.diameter('plate',0),12.035);
});

test('Every part has a complete finite, unamplified inspection table',()=>{
 assert.equal(Object.keys(G.models).length,9);
 for(const id of Object.keys(G.models)){
  const rows=G.measurements(id,45),unique=new Set(rows.map(r=>r.id));assert.equal(unique.size,rows.length);
  assert.ok(rows.length>=4,id);assert.ok(G.model(id).specs.length>=4);
  for(const r of rows){assert.ok(Number.isFinite(r.value));assert.ok(r.position.ru&&r.position.en);close(r.delta,r.value-r.nominal);assert.ok(r.limits[0]<=r.limits[1]);}
  const a=G.state(id,45,1,0,0,1),b=G.state(id,45,250,1,1,1.3);
  assert.deepEqual(a.measurements,b.measurements);assert.deepEqual(a.geometry_mm,b.geometry_mm);assert.equal(a.synthetic,true);
 }
});

test('Every shape projects into a phone viewport at a shared pair scale',()=>{
 for(const m of Object.values(G.models))for(const factor of [1,250]){
  const pair=['nominal','example'].map(v=>G.mesh(m.id,v,factor));
  const radius=Math.max(...pair.map(f=>G.bound(f,m.center)));
  for(const [yaw,pitch] of [[-.65,.7],[0,0],[0,Math.PI/2],[Math.PI/2,0],[2,-.9]])for(const fs of pair){
   assert.ok(fs.length>0);
   for(const f of fs){assert.ok(Math.hypot(...f.normal)>0);for(const p of f.v)assert.ok(p.every(Number.isFinite));}
   for(const width of [128,179,640])for(const f of G.project(fs,yaw,pitch,width,300,1,radius,m.center))for(const p of f.points){assert.ok(p[0]>=-1e-7&&p[0]<=width+1e-7,`${m.id} x`);assert.ok(p[1]>=0&&p[1]<=300,`${m.id} y`);}
  }
 }
});

test('Flange bolt holes are open and annular faces have no sector gaps',()=>{
 const m=G.model('flange'),fs=G.mesh('flange','nominal',1),r=m.bolt.circle/2;
 for(const y of [-16,-6]){
  const caps=fs.filter(f=>f.v.every(p=>Math.abs(p[1]-y)<1e-8)).map(f=>f.v.map(p=>[p[0],p[2]]));
  for(let k=0;k<6;k++)assert.equal(caps.some(v=>contains([r*Math.cos(k*Math.PI/3),r*Math.sin(k*Math.PI/3)],v)),false,'Bolt hole filled');
  for(let k=0;k<71;k++){
   const a=(k+.2345)*Math.PI*2/71,x=42*Math.cos(a),z=42*Math.sin(a);
   assert.ok(caps.some(v=>contains([x,z],v)),`Gap at ${y}, angle ${a}`);
  }
 }
});

test('Mounting-plate holes are open and rectangular corners are covered',()=>{
 const fs=G.mesh('plate','nominal',1),caps=fs.filter(f=>f.v.every(p=>Math.abs(p[1]-6)<1e-8)).map(f=>f.v.map(p=>[p[0],p[2]]));
 for(const x of [-40,40])for(const z of [-22,22])assert.equal(caps.some(v=>contains([x,z],v)),false);
 for(const x of [-59.9,-.2,.2,59.9])for(const z of [-39.9,-.2,.2,39.9])assert.ok(caps.some(v=>contains([x,z],v)),`Missing corner: ${x},${z}`);
});

test('Synthetic limits identify both an in-range value and an excursion',()=>{
 assert.equal(G.measurements('shaft',0)[0].within,true);assert.equal(G.measurements('disk',0)[0].within,false);
 assert.equal(G.measurements('bracket',0)[0].within,false);assert.equal(G.measurements('plate',0)[0].within,false);
});

test('Invalid inputs fail predictably',()=>{
 assert.throws(()=>G.mesh('unknown'));assert.throws(()=>G.mesh('shaft','example',5));assert.throws(()=>G.mesh('shaft','bad'));
 assert.throws(()=>G.diameter('shaft',NaN));assert.throws(()=>G.project([],0,0,0,20));
});
