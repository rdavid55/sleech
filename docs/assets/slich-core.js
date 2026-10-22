/* Deterministic calculations and data checks shared by both languages. */
(function(root){
 'use strict';
 const HEADERS=['case_id','protocol_version','object_id','characteristic','section','site','operator','repeat','value','unit','instrument_id','method','temperature_C','expanded_uncertainty','coverage_factor','reference_id','timestamp','comment'];
 const required=HEADERS.filter(x=>!['comment','temperature_C','reference_id'].includes(x));
 function num(v){if(String(v).trim()==='')return NaN;return Number(String(v).trim().replace(',','.'));}
 function budget(service,months,cycles,connect,hours,shipping){
   if(!service||![months,cycles,hours,shipping].every(Number.isFinite)||hours<0||hours>40||!Number.isInteger(hours)||shipping<0||shipping>500000)return null;
   if(service.id==='regular'&&(!Number.isInteger(months)||months<1||months>12||!Number.isInteger(cycles)||cycles<0||cycles>12))return null;
   const support=service.id==='regular'?months*15000:service.price, cycle=service.id==='regular'?cycles*75000:0, connection=service.id==='regular'&&connect?25000:0;
   return {support,cycle,connection,extra:hours*1800,shipping,total:support+cycle+connection+hours*1800+shipping};
 }
 function effect(disputes,cost,reduction,cycles){
   if(![disputes,cost,reduction,cycles].every(Number.isFinite)||!Number.isInteger(disputes)||!Number.isInteger(cycles)||disputes<0||disputes>200||cost<0||cost>1000000||reduction<0||reduction>100||cycles<0||cycles>12)return null;
   const baseline=disputes*cost,savings=baseline*reduction/100,recurring=180000+cycles*75000,first=recurring+25000;
   return {baseline,savings,recurring,first,firstNet:savings-first,recurringNet:savings-recurring,threshold:baseline?100*first/baseline:null};
 }
 function compare(x,u,k,ref,ur,kr,gates){
   if(![x,u,k,ref,ur,kr].every(Number.isFinite)||u<=0||ur<=0||k<=0||kr<=0)return {ok:false,reason:'numbers'};
   if(!Array.isArray(gates)||gates.length!==4||!gates.every(v=>v===true))return {ok:false,reason:'gates'};
   if(Math.abs(k-kr)>1e-9)return {ok:false,reason:'coverage'};
   const en=(x-ref)/Math.hypot(u,ur);return {ok:true,en,compatible:Math.abs(en)<=1};
 }
 function parseCSV(input){
   const text=String(input).replace(/^\uFEFF/,'');if(text.length>5*1024*1024)throw new Error('size');
   const first=text.split(/\r?\n/,1)[0];let quoted=false,semi=0,comma=0;
   for(let i=0;i<first.length;i++){if(first[i]==='"')quoted=!quoted;else if(!quoted&&first[i]===';')semi++;else if(!quoted&&first[i]===',')comma++;}
   const sep=semi>=comma?';':',';let rows=[],row=[],field='',inQuote=false,afterQuote=false;
   for(let i=0;i<text.length;i++){
     const c=text[i];if(inQuote){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{inQuote=false;afterQuote=true;}}else field+=c;continue;}
     if(c==='"'){if(field.length||afterQuote)throw new Error('quotes');inQuote=true;continue;}
     if(c===sep){row.push(field);field='';afterQuote=false;}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';afterQuote=false;if(rows.length>5001)throw new Error('rows');}else{if(afterQuote&&c.trim())throw new Error('quotes');if(!afterQuote)field+=c;}
   }
   if(inQuote)throw new Error('quotes');row.push(field);if(row.some(x=>x.trim()))rows.push(row);
   if(rows.length<2)throw new Error('empty');if(rows.length>5001)throw new Error('rows');
   const headers=rows.shift().map(x=>x.trim());if(new Set(headers).size!==headers.length)throw new Error('headers');
   const missing=HEADERS.filter(h=>!headers.includes(h));if(missing.length)throw new Error('headers:'+missing.join(','));
   return {headers,rows:rows.map((r,i)=>({line:i+2,width:r.length,data:Object.fromEntries(headers.map((h,j)=>[h,r[j]??'']))}))};
 }
 function validateCSV(parsed,passport){
   const errors=[],seen=new Set(),rows=[];
   for(const item of parsed.rows){const d=item.data,p=item.line;const err=(code,field)=>errors.push({line:p,code,field});
     if(item.width!==parsed.headers.length)err('width','');
     for(const h of required)if(!String(d[h]).trim())err('missing',h);
     for(const [h,key] of [['case_id','case-id'],['protocol_version','protocol-version'],['object_id','object-id'],['characteristic','characteristic'],['unit','unit']])if(passport[key]&&String(d[h]).trim()!==String(passport[key]).trim())err('mismatch',h);
     for(const h of ['value','expanded_uncertainty','coverage_factor']){const v=num(d[h]);if(!Number.isFinite(v)||(h!=='value'&&v<=0))err('number',h);}
     if(d.temperature_C&& !Number.isFinite(num(d.temperature_C)))err('number','temperature_C');
     if(!/^\d+$/.test(d.repeat.trim())||Number(d.repeat)<1)err('number','repeat');
     if(d.timestamp){const ts=d.timestamp.trim(),m=ts.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/);let valid=!!m&&Number.isFinite(Date.parse(ts));if(m){const [y,mo,day,h,mi,se]=m.slice(1,7).map(Number);const dt=new Date(0);dt.setUTCFullYear(y,mo-1,day);valid=valid&&dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===day&&h<24&&mi<60&&se<60;}if(!valid)err('timestamp','timestamp');}
     const key=['case_id','protocol_version','object_id','characteristic','section','site','operator','repeat'].map(x=>x==='repeat'?String(Number(d[x])):d[x].trim()).join('\u0000');if(seen.has(key))err('duplicate','repeat');seen.add(key);rows.push(d);
   }
   for(const h of ['case_id','protocol_version','object_id','characteristic','unit','method'])if(new Set(rows.map(r=>r[h].trim())).size>1)errors.push({line:0,code:'mixed',field:h});
   const groups=[];const map=new Map();
   for(const r of rows){const k=[r.site.trim(),r.section.trim()].join('\u0000');if(!map.has(k))map.set(k,[]);map.get(k).push(r);}
   for(const [k,rs] of map){const vals=rs.map(r=>num(r.value));if(vals.some(x=>!Number.isFinite(x)))continue;const mean=vals.reduce((a,b)=>a+b,0)/vals.length;const sd=vals.length>1?Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/(vals.length-1)):null;const [site,section]=k.split('\u0000');groups.push({site,section,count:vals.length,mean,min:Math.min(...vals),max:Math.max(...vals),sd});}
   return {ok:errors.length===0,errors,rows,groups};
 }
 function csvCell(v){let s=String(v??'');if(/^[\s]*[=+@-]/.test(s)&&!Number.isFinite(Number(s)))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
 function csv(rows){return '\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');}
 root.SlichCore={HEADERS,num,budget,effect,compare,parseCSV,validateCSV,csv};
 if(typeof module!=='undefined')module.exports=root.SlichCore;
})(typeof window!=='undefined'?window:globalThis);
