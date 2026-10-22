(() => {
  'use strict';
  const G=window.Slich3D,canvas=document.getElementById('part-canvas');
  if(!G||!canvas)return;
  const $=id=>document.getElementById(id),ru=document.documentElement.lang==='ru',t=(a,b)=>ru?a:b,lang=ru?'ru':'en';
  const ctx=canvas.getContext('2d'),models=Object.values(G.models),query=new URLSearchParams(location.search);
  let id=G.models[query.get('model')]?query.get('model'):'flange';
  const queryAngle=Number(query.get('angle'));
  let angle=Number.isFinite(queryAngle)?G.clamp(queryAngle,0,180):0,factor=query.get('amplify')==='1'?1:250;
  let yaw=-.65,pitch=.7,zoom=1,view='iso',pending=false,activeDefect=null,meshPair=[],radius=1;
  const views={iso:[-.65,.7],front:[0,0],back:[Math.PI,0],top:[0,Math.PI/2],side:[Math.PI/2,0]};
  const pointers=new Map();let gesture=null;
  const cache=new Map();
  const num=(n,d=3)=>n.toLocaleString(ru?'ru-RU':'en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});
  const sign=n=>n>1e-9?'+':n<-1e-9?'−':'';
  const unit=u=>u==='°'?'°':t('мм','mm');
  const dim=(n,u='mm',digits=3)=>num(n,digits)+(u==='°'?'°':' '+unit(u));
  const delta=(n,u='mm')=>sign(n)+num(Math.abs(n)*(u==='mm'?1000:1),u==='mm'?1:3)+(u==='mm'?' '+t('мкм','μm'):'°');
  function el(tag,className,text) {const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
  function prepareMeshes() {
    const key=id+':'+factor;
    if(!cache.has(key))cache.set(key,['nominal','example'].map(v=>G.mesh(id,v,factor,48)));
    meshPair=cache.get(key);const m=G.model(id);radius=Math.max(...meshPair.map(f=>G.bound(f,m.center)));
  }
  function drawFaces(context,faces,x=0) {
    for(const f of faces){context.beginPath();f.points.forEach((p,i)=>i?context.lineTo(x+p[0],p[1]):context.moveTo(x+p[0],p[1]));context.closePath();context.fillStyle='rgb('+G.color(f.normal,false,f.delta,$('heatmap').checked).join(',')+')';context.fill();
      // Same-colour subpixel overlap prevents bright tessellation seams.
      context.strokeStyle=context.fillStyle;context.lineJoin='round';context.lineWidth=.55;context.stroke();}
  }
  function render() {
    pending=false;if(!ctx)return;
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!(w>0&&h>0))return;
    const dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(2000000/(w*h)));
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const half=w/2,m=G.model(id),roll=view==='iso'||view==='free'?-.16:0;
    meshPair.forEach((faces,j)=>{
      ctx.save();ctx.beginPath();ctx.rect(j*half+2,0,half-4,h);ctx.clip();
      const shadow=ctx.createRadialGradient(j*half+half/2,h*.87,0,j*half+half/2,h*.87,half*.35);
      shadow.addColorStop(0,'rgba(98,100,135,.14)');shadow.addColorStop(1,'rgba(98,100,135,0)');ctx.fillStyle=shadow;
      ctx.save();ctx.translate(j*half+half/2,h*.87);ctx.scale(1,.13);ctx.beginPath();ctx.arc(0,0,half*.35,0,Math.PI*2);ctx.fill();ctx.restore();
      drawFaces(ctx,G.project(faces,yaw,pitch,half,h,zoom,radius,m.center,roll),j*half);ctx.restore();
    });
    canvas.dataset.yaw=yaw.toFixed(5);canvas.dataset.pitch=pitch.toFixed(5);canvas.dataset.zoom=zoom.toFixed(4);
    canvas.dataset.model=id;canvas.dataset.amplification=String(factor);canvas.dataset.synchronized='true';
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(render);}}
  function syncViewButtons(){document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));}
  function syncLinks() {
    const m=G.model(id),reading=G.diameter(id,angle),base=window.SLEECH_BASE||'/',u=m.primary.unit||'mm';
    $('lesson-compare').href=base+(ru?'':'en/')+'measurements.html?'+new URLSearchParams({example:'synthetic-3d',model:id,x:reading.toFixed(6),ref:String(m.primary.nominal),u:u==='°'?'.02':'.004',ur:u==='°'?'.01':'.002',k:'2',kr:'2',unit:u});
    $('language-switch').href=base+(ru?'en/':'')+'3d.html?'+new URLSearchParams({model:id,angle:String(angle),amplify:String(factor)});
  }
  function updateMeasurements() {
    const m=G.model(id),rows=G.measurements(id,angle),primary=rows[0];
    $('inspection-title').textContent=m.primary.label[lang];
    $('diameter-readout').value=dim(primary.value,primary.unit);
    $('deviation-readout').textContent=t('От номинала: ','From nominal: ')+delta(primary.delta,primary.unit);
    $('measurement-position').textContent=primary.position[lang];
    $('direction-control').hidden=!!m.shape;
    $('control-hint').textContent=m.shape?t('Контроль относительно указанных баз. Числа сохраняют исходный масштаб.','Inspection relative to the stated datums. Numbers retain their original scale.'):t('Выберите направление измерения. Поворот камеры меняет только вид.','Choose a measurement direction. Camera rotation changes the view only.');
    document.querySelectorAll('[data-angle]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.angle)===angle)));
    const body=document.createDocumentFragment();
    rows.forEach(row=>{
      const tr=el('tr');tr.dataset.characteristic=row.id;
      const label=el('td');label.append(el('strong','',row.label[lang]),el('small','',row.position[lang]));tr.append(label);
      [dim(row.nominal,row.unit),dim(row.limits[0],row.unit)+' … '+dim(row.limits[1],row.unit),dim(row.value,row.unit),delta(row.delta,row.unit)].forEach(s=>tr.append(el('td','',s)));
      const status=el('td');status.append(el('span','interval-status'+(row.within?'':' outside'),row.within?t('В интервале','Within interval'):t('Вне интервала','Outside interval')));tr.append(status);body.append(tr);
    });
    $('measurement-rows').replaceChildren(body);syncLinks();
  }
  function showDefects() {
    const m=G.model(id),out=document.createDocumentFragment();
    $('defects-hint').textContent=t('Нажмите на отклонение, чтобы выбрать ракурс.','Choose a deviation to view its surface.');
    for(const d of m.defects) {
      const b=el('button','defect-card'+(d.value<0?' negative':''));b.type='button';b.dataset.defect=d.id;
      b.setAttribute('aria-pressed',String(activeDefect===d.id));
      const glyph=el('span','defect-sign',d.value<0?'−':'+');glyph.setAttribute('aria-hidden','true');
      const content=el('div');content.append(el('strong','',d.name[lang]),el('p','',d.description[lang]));
      b.append(glyph,content,el('span','defect-value',delta(d.value,d.unit||'mm')));
      b.addEventListener('click',()=>{
        activeDefect=d.id;view='free';zoom=1;
        if(d.type==='radial'){yaw=d.theta-Math.PI/2;pitch=.35;}
        else if(m.shape==='plate'){yaw=d.id==='bump'?-.45:.65;pitch=1.05;}
        else if(m.shape==='bracket'){yaw=-Math.PI/2;pitch=.2;}
        else if(d.id==='eccentricity'){yaw=0;pitch=Math.PI/2;view='top';}
        else if(d.id==='ovality'){yaw=0;pitch=Math.PI/2;view='top';}
        else {yaw=-.65;pitch=.55;}
        showDefects();syncViewButtons();schedule();
        $('viewer-status').textContent=m.name[lang]+'. '+d.name[lang]+'. '+d.description[lang];
        // On phones, bring the model back into view after choosing a surface.
        canvas.scrollIntoView({block:'center',behavior:'auto'});
      });out.append(b);
    }
    $('defect-list').replaceChildren(out);
  }
  function updatePart(reset=true) {
    const m=G.model(id);$('part-model').value=id;
    if(reset){[yaw,pitch]=views.iso;zoom=1;view='iso';activeDefect=null;}
    factor=$('amplify').checked?250:1;
    $('part-title').textContent=m.name[lang];$('part-kind').textContent=m.kind[lang];$('part-dimensions').textContent=m.size+' '+unit('mm');
    $('part-material').textContent=m.material[lang];$('datum-note').textContent=m.datum[lang];
    const specs=document.createDocumentFragment();for(const s of m.specs){const d=el('div');d.append(el('dt','',s.label[lang]),el('dd','',ru?s.value.replaceAll('mm','мм'):s.value));specs.append(d);}$('dimension-list').replaceChildren(specs);
    document.querySelectorAll('.part-choice').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.model===id)));
    $('display-scale').textContent=factor===250?t('Отклонения формы ×250. Все числовые размеры и углы — в исходном масштабе.','Shape deviations ×250. All numeric dimensions and angles retain their original scale.'):t('Форма 1×. Микрометровые отклонения могут быть неразличимы на экране.','Geometry at 1×. Micrometre deviations may be too small to see on screen.');
    prepareMeshes();updateMeasurements();showDefects();syncViewButtons();schedule();
    $('viewer-status').textContent=m.name[lang]+'. '+m.kind[lang];
  }
  function renderGallery() {
    const gallery=document.createDocumentFragment(),options=document.createDocumentFragment();
    models.forEach(m=>{
      const option=el('option','',m.name[lang]);option.value=m.id;options.append(option);
      const b=el('button','part-choice');b.type='button';b.dataset.model=m.id;b.setAttribute('aria-pressed',String(id===m.id));
      const thumb=el('canvas');thumb.width=220;thumb.height=128;thumb.setAttribute('aria-hidden','true');
      b.append(thumb,el('strong','',m.name[lang]),el('small','',m.size));b.addEventListener('click',()=>{if(id===m.id)return;id=m.id;updatePart();});gallery.append(b);
      // Render thumbnails once; no animation loop or external 3D library.
      const c=thumb.getContext('2d');if(c){const fs=G.mesh(m.id,'nominal',1,24),rad=G.bound(fs,m.center);drawFaces(c,G.project(fs,-.65,.7,220,128,1.15,rad,m.center));}
    });$('part-gallery').replaceChildren(gallery);$('part-model').replaceChildren(options);
  }
  function selectView(name) {view=name;[yaw,pitch]=views[name];zoom=1;syncViewButtons();schedule();}
  function beginGesture() {
    const a=[...pointers.values()];
    gesture=a.length>=2?{type:'pinch',distance:Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y),zoom}:{type:'drag',x:a[0]?.x,y:a[0]?.y,yaw,pitch};
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);beginGesture();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)||!gesture)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size>=2&&gesture.type==='pinch'){
      const a=[...pointers.values()],distance=Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y);
      if(gesture.distance>0)zoom=G.clamp(gesture.zoom*distance/gesture.distance,.65,1.65);
    }else if(gesture.type==='drag') {
      const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
      yaw=gesture.yaw+dx*.009;pitch=G.clamp(gesture.pitch-dy*.009,-Math.PI/2,Math.PI/2);
    }
    view='free';syncViewButtons();schedule();
  });
  function release(e){pointers.delete(e.pointerId);if(pointers.size)beginGesture();else gesture=null;}
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>canvas.addEventListener(name,release));
  canvas.addEventListener('dblclick',()=>selectView('iso'));
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','=','-','Escape'].includes(e.key))return;
    e.preventDefault();if(e.key==='Home'||e.key==='Escape'){selectView('iso');return;}
    if(e.key==='ArrowLeft')yaw-=.12;else if(e.key==='ArrowRight')yaw+=.12;else if(e.key==='ArrowUp')pitch=G.clamp(pitch+.12,-Math.PI/2,Math.PI/2);else if(e.key==='ArrowDown')pitch=G.clamp(pitch-.12,-Math.PI/2,Math.PI/2);else zoom=G.clamp(zoom+(e.key==='-'?-.1:.1),.65,1.65);
    view='free';syncViewButtons();schedule();
  });
  $('part-model').addEventListener('change',()=>{id=$('part-model').value;updatePart();});
  $('amplify').checked=factor===250;$('amplify').addEventListener('change',()=>updatePart(false));
  $('heatmap').addEventListener('change',schedule);
  $('reset-view').addEventListener('click',()=>selectView('iso'));
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view)));
  document.querySelectorAll('[data-angle]').forEach(b=>b.addEventListener('click',()=>{angle=Number(b.dataset.angle);updateMeasurements();}));
  function download(content,type,extension) {
    const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
    a.href=url;a.download='SLEECH_3D_'+id+'_synthetic.'+extension;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  $('lesson-export').addEventListener('click',()=>download(JSON.stringify(G.state(id,angle,factor,yaw,pitch,zoom),null,2),'application/json;charset=utf-8','json'));
  $('lesson-csv').addEventListener('click',()=>{
    const quote=v=>'"'+String(v).replaceAll('"','""')+'"';
    const rows=[['synthetic','model','characteristic','nominal','lower_limit','upper_limit','example','deviation','unit','position'],...G.measurements(id,angle).map(r=>['true',id,r.label[lang],r.nominal,r.limits[0],r.limits[1],Number(r.value.toFixed(6)),Number(r.delta.toFixed(6)),r.unit,r.position[lang]])];
    download('\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8','csv');
  });
  renderGallery();updatePart();
  if(ctx){if('ResizeObserver' in window)new ResizeObserver(schedule).observe(canvas);else window.addEventListener('resize',schedule);$('viewer-fallback').hidden=true;}
  else{canvas.hidden=true;$('viewer-fallback').hidden=false;}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pointers.clear();gesture=null;}else schedule();});
})();
