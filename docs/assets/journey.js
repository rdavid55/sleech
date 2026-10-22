/* Customer brief preparation. All entered values stay on this device. */
(function(root){
 'use strict';
 const fields=['object','characteristic','unit','issue','method','points','conditions','files','format'];
 const clean=v=>String(v??'').trim().slice(0,1000);
 function normalize(value){const out={};for(const k of fields)out[k]=clean(value?.[k]);return out;}
 function validate(value,step){const v=normalize(value),errors=[];if(step===0){for(const k of ['object','characteristic','unit','issue'])if(!v[k])errors.push(k);}if(step===1){for(const k of ['method','points','conditions'])if(!v[k])errors.push(k);}if(step===2&&!['cycle','project','regular','unsure'].includes(v.format))errors.push('format');return errors;}
 function buildBrief(value,lang='ru'){
  const v=normalize(value),en=lang==='en';
  const labels=en?['Object','Characteristic','Unit','Disagreement','Method','Measurement points','Conditions and uncertainty','Available files','Preferred format']:['Объект','Характеристика','Единица','Расхождение','Метод','Точки измерения','Условия и неопределённость','Подготовленные файлы','Предпочтительный формат'];
  const names=en?{cycle:'One cycle',project:'One-off project',regular:'Recurring support',unsure:'Discuss the scope'}:{cycle:'Один цикл',project:'Разовый проект',regular:'Регулярное сопровождение',unsure:'Обсудить объём'};
  return [en?'SLEECH CUSTOMER BRIEF':'СЛИЧ ОПИСАНИЕ ЗАДАЧИ','',...fields.map((k,i)=>labels[i]+': '+(k==='format'?(names[v[k]]||v[k]):v[k]|| (en?'Not specified':'Не указано'))),'',en?'Draft prepared locally. No request has been sent. Conditions and a specialist review must be agreed before measurements.':'Черновик подготовлен на устройстве. Заявка не отправлена. Условия сравнения и участие специалиста согласуются до измерений.'].join('\n');
 }
 const api={normalize,validate,buildBrief,fields};
 if(typeof module!=='undefined')module.exports=api;
 root.SlichJourney=api;
 if(typeof document==='undefined')return;
 const form=document.getElementById('journey-form');if(!form)return;
 const en=document.documentElement.lang==='en',t=(ru,eng)=>en?eng:ru,$=id=>document.getElementById(id),key='slich-brief-v1',drafts=window.SleechData?.drafts||localStorage;let current=0;
 const read=()=>normalize(Object.fromEntries(fields.map(k=>[k,$('jr-'+k).value])));
 const save=()=>{try{drafts.setItem(key,JSON.stringify({schema:1,fields:read(),step:current}));$('journey-save').textContent=window.SleechData?.persistent?t('Черновик сохранён на этом устройстве.','Draft saved on this device.'):t('Черновик сохранён на время сеанса вкладки. Форма ничего не отправляет.','Draft saved for this tab session. Nothing has been submitted.');}catch{$('journey-save').textContent=t('Память недоступна. Скачайте описание задачи.','Storage is unavailable. Download your brief.');}};
 try{const old=JSON.parse(drafts.getItem(key)||'null');if(old?.schema===1&&old.fields&&typeof old.fields==='object'){const v=normalize(old.fields);for(const k of fields)$('jr-'+k).value=v[k];if(Number.isInteger(old.step)&&old.step>=0&&old.step<=3)current=old.step;}}catch{}
 const show=()=>{document.querySelectorAll('[data-journey-step]').forEach((s,i)=>s.hidden=i!==current);document.querySelectorAll('[data-step-marker]').forEach((s,i)=>{if(i===current)s.setAttribute('aria-current','step');else s.removeAttribute('aria-current');});$('journey-progress').value=current+1;$('journey-position').textContent=t('Шаг ','Step ')+(current+1)+t(' из 4',' of 4');$('journey-back').hidden=current===0;$('journey-next').hidden=current===3;$('journey-download').hidden=current!==3;$('journey-print').hidden=current!==3;$('journey-summary').textContent=buildBrief(read(),en?'en':'ru');$('journey-error').textContent='';};
 window.addEventListener('sleech:privacy',save);
 form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',()=>{save();if(current===3)show();});
 $('journey-next').addEventListener('click',()=>{const errors=validate(read(),current);fields.forEach(k=>$('jr-'+k).removeAttribute('aria-invalid'));if(errors.length){for(const k of errors)$('jr-'+k).setAttribute('aria-invalid','true');$('journey-error').textContent=t('Заполните отмеченные поля. Если данных ещё нет, укажите «требует согласования».','Complete the marked fields. If information is unavailable, enter “to be agreed”.');$('jr-'+errors[0]).focus();return;}current=Math.min(3,current+1);show();save();$('journey-step-title-'+current).focus();});
 $('journey-back').addEventListener('click',()=>{current=Math.max(0,current-1);show();save();$('journey-step-title-'+current).focus();});
 $('journey-download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([buildBrief(read(),en?'en':'ru')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='SLEECH_Brief_'+(en?'EN':'RU')+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $('journey-print').addEventListener('click',()=>window.print());
 $('journey-reset').addEventListener('click',()=>{form.reset();current=0;try{drafts.removeItem(key);}catch{}show();$('journey-save').textContent=t('Черновик очищен на этом устройстве.','Draft cleared on this device.');$('jr-object').focus();});
 show();
})(typeof window!=='undefined'?window:globalThis);
