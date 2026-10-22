/* Synthetic geometry and inspection data. No measured production data. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Slich3D = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const tau = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const text = (ru, en) => ({ ru, en });
  const spec = (ru, en, value) => ({ label: text(ru, en), value });
  const defect = (id, ru, en, noteRu, noteEn, value, extra = {}) => ({ id, name: text(ru, en), description: text(noteRu, noteEn), value, ...extra });
  const models = {
    shaft: {
      id: 'shaft', name: text('Ступенчатый вал', 'Stepped shaft'), kind: text('Три посадочные ступени', 'Three bearing seats'),
      material: text('Сталь 45', 'Steel 45'), size: 'Ø20 × 100', length: 100, nominal: 20, bore: 0,
      outer: [[-50,12],[-25,12],[-25,20],[25,20],[25,16],[50,16]], inner: [],
      primary: { label: text('Средняя ступень · ширина', 'Middle seat · width'), y: 0, nominal: 20, limits: [19.985,20.015] },
      ellipse: { inner: false, y0: -25, y1: 25, nominal: 20, major: 20.012, minor: 20.001 },
      specs: [spec('Общая длина', 'Overall length', '100 ±0.10 mm'),spec('Левая ступень', 'Left seat', 'Ø12 ±0.02 × 25 mm'),spec('Средняя ступень', 'Middle seat', 'Ø20 ±0.015 × 50 mm'),spec('Правая ступень', 'Right seat', 'Ø16 ±0.02 × 25 mm')],
      datum: text('Ось Y — вдоль вала; начало в середине. База A — левый торец, база B — ось средней ступени.', 'Y follows the shaft; origin at its midpoint. Datum A: left end. Datum B: middle-seat axis.'),
      defects: [defect('ovality','Овальность','Ovality','Сечение средней ступени: 20.012 × 20.001 mm. Разность ширин — 11 μm.','Middle section: 20.012 × 20.001 mm. Width difference: 11 μm.',.011)]
    },
    bushing: {
      id: 'bushing', name: text('Точная втулка', 'Precision bushing'), kind: text('Малая деталь · сквозное отверстие', 'Small part · through bore'),
      material: text('Бронза БрО10', 'Bronze BrO10'), size: 'Ø30 × 25', length:25, nominal:20, bore:20,
      outer:[[-12.5,30],[12.5,30]], inner:[[-12.5,20],[12.5,20]],
      primary:{label:text('Отверстие · ширина','Bore · width'),y:0,inner:true,nominal:20,limits:[20,20.021]},
      ellipse:{inner:true,y0:-12.5,y1:12.5,nominal:20,major:20.012,minor:20.001},
      specs:[spec('Наружный диаметр','Outer diameter','Ø30 ±0.02 mm'),spec('Отверстие','Bore','Ø20 +0.021 / 0 mm'),spec('Длина','Length','25 ±0.05 mm'),spec('Номинальная стенка','Nominal wall','5 mm')],
      datum:text('База A — нижний торец; база B — ось наружной поверхности. Контролируется отверстие в среднем сечении.','Datum A: bottom face. Datum B: outside axis. Inspect the bore at mid-length.'),
      defects:[defect('ovality','Овальность отверстия','Bore ovality','Одинаковое отверстие даёт разные показания при повороте направления измерения.','The same bore gives different readings as the measurement direction changes.',.011)]
    },
    disk:{
      id:'disk',name:text('Диск с отверстием','Bored disk'),kind:text('Тонкая деталь · наружный контур','Thin part · outer contour'),material:text('Алюминий Д16','Aluminium D16'),size:'Ø40 × 8',length:8,nominal:40,bore:14,
      outer:[[-4,40],[4,40]],inner:[[-4,14],[4,14]],primary:{label:text('Наружный контур · ширина','Outer contour · width'),y:0,nominal:40,limits:[39.99,40.01]},
      ellipse:{inner:false,y0:-4,y1:4,nominal:40,major:40.012,minor:40.001},
      specs:[spec('Наружный диаметр','Outer diameter','Ø40 ±0.01 mm'),spec('Отверстие','Bore','Ø14 +0.018 / 0 mm'),spec('Толщина','Thickness','8 ±0.03 mm'),spec('Номинальная перемычка','Nominal radial wall','13 mm')],
      datum:text('База A — нижняя плоскость диска; база B — ось отверстия. Контроль наружного сечения на половине толщины.','Datum A: bottom plane. Datum B: bore axis. Inspect the outer section at half-thickness.'),
      defects:[defect('ovality','Овальность контура','Contour ovality','Большая ширина 40.012 mm выходит за верхнюю границу учебного интервала 40.010 mm.','The 40.012 mm major width exceeds the illustrative upper limit of 40.010 mm.',.011)]
    },
    flange:{
      id:'flange',name:text('Фланцевая ступица','Flanged hub'),kind:text('Шесть отверстий · три ступени','Six holes · three steps'),material:text('Сталь 40Х','Steel 40Kh'),size:'Ø88 × 32',length:32,nominal:44,bore:24,
      outer:[[-16,88],[-6,88],[-6,52],[0,52],[0,44],[16,44]],inner:[[-16,24],[16,24]],bolt:{count:6,circle:68,diameter:8,y0:-16,y1:-6},
      primary:{label:text('Ступица · ширина','Hub · width'),y:6,nominal:44,limits:[43.98,44.02]},
      specs:[spec('Габарит','Envelope','Ø88 × 32 mm'),spec('Фланец','Flange','Ø88 ±0.05 × 10 ±0.05 mm'),spec('Промежуточная ступень','Middle step','Ø52 ±0.03 × 6 mm'),spec('Ступица','Hub','Ø44 ±0.02 × 16 mm'),spec('Центральное отверстие','Central bore','Ø24 +0.025 / 0 mm'),spec('Крепёжные отверстия','Bolt holes','6 × Ø8 ±0.05 mm'),spec('Делительная окружность','Bolt circle','Ø68 ±0.05 mm · 60°')],
      datum:text('База A — задний торец фланца (Y = −16); база B — ось отверстия Ø24. Крепёжные отверстия проходят только через фланец.','Datum A: rear flange face (Y = −16). Datum B: Ø24 bore axis. The bolt holes pass through the flange only.'),
      defects:[defect('bump','Выступ на ступице','Hub high spot','Локальный выступ: радиальное смещение +18 μm, Y = 6 mm, φ = 0°.','Local high spot: radial displacement +18 μm, Y = 6 mm, φ = 0°.',.018,{type:'radial',y:6,theta:0,sy:5,st:.32}),defect('dent','Впадина на ступице','Hub depression','Локальная впадина: радиальное смещение −12 μm, Y = 9 mm, φ = 180°.','Local depression: radial displacement −12 μm, Y = 9 mm, φ = 180°.',-.012,{type:'radial',y:9,theta:Math.PI,sy:3.5,st:.3})]
    },
    pulley:{
      id:'pulley',name:text('Двухручьевой шкив','Two-groove pulley'),kind:text('Канавки · наклонные грани','Grooves · sloping flanks'),material:text('Алюминий АМг6','Aluminium AMg6'),size:'Ø54 × 30',length:30,nominal:54,bore:16,
      outer:[[-15,54],[-11,54],[-8,43],[-4,54],[4,54],[8,43],[11,54],[15,54]],inner:[[-15,16],[15,16]],
      primary:{label:text('Центральный обод · ширина','Centre rim · width'),y:0,nominal:54,limits:[53.98,54.02]},
      specs:[spec('Диаметр ободов','Rim diameter','Ø54 ±0.02 mm'),spec('Общая ширина','Overall width','30 ±0.05 mm'),spec('Отверстие','Bore','Ø16 +0.018 / 0 mm'),spec('Диаметр дна ручьёв','Groove-root diameter','Ø43 ±0.05 mm'),spec('Левый ручей по Y','Left groove, Y','−11 / −8 / −4 mm'),spec('Правый ручей по Y','Right groove, Y','4 / 8 / 11 mm'),spec('Глубина ручья','Groove depth','5.5 mm')],
      datum:text('База A — левый торец, база B — ось отверстия. Канавки имеют треугольный профиль с вершинами при Y = ±8 mm.','Datum A: left end. Datum B: bore axis. Triangular groove roots lie at Y = ±8 mm.'),
      defects:[defect('bump','Наплыв на ободе','Rim high spot','Радиальный наплыв +24 μm в центре, φ = 0°.','Radial high spot +24 μm at the centre rim, φ = 0°.',.024,{type:'radial',y:0,theta:0,sy:2.1,st:.35}),defect('dent','Впадина у ручья','Groove-edge depression','Радиальная впадина −20 μm у правого ручья, Y = 12 mm, φ = 180°.','Radial depression −20 μm beside the right groove, Y = 12 mm, φ = 180°.',-.020,{type:'radial',y:12,theta:Math.PI,sy:1.7,st:.32})]
    },
    nozzle:{
      id:'nozzle',name:text('Конический переходник','Tapered adapter'),kind:text('Конус · переменная стенка','Taper · varying wall'),material:text('Сталь 12Х18Н10Т','Steel 12Kh18N10T'),size:'Ø38 × 70',length:70,nominal:20,bore:10,
      outer:[[-35,38],[-20,38],[25,20],[35,20]],inner:[[-35,26],[-20,26],[25,10],[35,10]],
      primary:{label:text('Выходной поясок · ширина','Outlet collar · width'),y:30,nominal:20,limits:[19.985,20.015]},
      specs:[spec('Общая длина','Overall length','70 ±0.10 mm'),spec('Входной поясок','Inlet collar','Ø38 ±0.03 × 15 mm'),spec('Выходной поясок','Outlet collar','Ø20 ±0.015 × 10 mm'),spec('Конический участок','Taper length','45 mm · Ø38 → Ø20'),spec('Внутренний профиль','Bore profile','Ø26 → Ø10 mm'),spec('Половина угла конуса','Taper half-angle','11.3099°'),spec('Торцевые стенки','End wall thickness','6 / 5 mm')],
      datum:text('База A — входной торец (Y = −35); база B — общая ось. Конический участок от Y = −20 до +25 mm.','Datum A: inlet face (Y = −35). Datum B: shared axis. The taper extends from Y = −20 to +25 mm.'),
      defects:[defect('taper','Изменение профиля','Taper profile error','Радиальное отклонение линейно возрастает от 0 до +10 μm вдоль конуса; выходной диаметр становится 20.020 mm.','Radial error rises linearly from 0 to +10 μm along the taper; outlet diameter becomes 20.020 mm.',.010,{type:'taper'}),defect('dent','Впадина на конусе','Taper depression','Локальная впадина −16 μm, Y = −8 mm, φ = 180°.','Local depression −16 μm, Y = −8 mm, φ = 180°.',-.016,{type:'radial',y:-8,theta:Math.PI,sy:5,st:.34})]
    },
    housing:{
      id:'housing',name:text('Корпус подшипника','Bearing housing'),kind:text('Ступенчатая расточка · буртик','Stepped bore · shoulder'),material:text('Чугун СЧ20','Grey iron SCh20'),size:'Ø76 × 50',length:50,nominal:35,bore:35,
      outer:[[-25,76],[-16,76],[-16,62],[15,62],[15,50],[25,50]],inner:[[-25,42],[-12,42],[-12,35],[25,35]],
      primary:{label:text('Посадочное отверстие · ширина','Bearing bore · width'),y:0,inner:true,nominal:35,limits:[35,35.025]},
      ellipse:{inner:true,y0:-12,y1:25,nominal:35,major:35.010,minor:35.002},eccentricity:.025,
      specs:[spec('Общая длина','Overall length','50 ±0.10 mm'),spec('Опорный буртик','Mounting shoulder','Ø76 ±0.05 × 9 mm'),spec('Корпус','Body','Ø62 ±0.03 × 31 mm'),spec('Задний поясок','Rear collar','Ø50 ±0.03 × 10 mm'),spec('Входная расточка','Counterbore','Ø42 +0.03 / 0 × 13 mm'),spec('Посадочная расточка','Bearing bore','Ø35 +0.025 / 0 × 37 mm'),spec('Смещение оси · предел','Axis offset · limit','≤ 0.020 mm')],
      datum:text('База A — торец буртика; база B — ось наружного корпуса. Ось отверстия смещена вдоль X на 25 μm; это не радиальное биение.','Datum A: shoulder face. Datum B: outer-body axis. The bore axis is offset along X by 25 μm; this is not a runout value.'),
      defects:[defect('eccentricity','Смещение отверстия','Bore axis offset','Ось расточки сдвинута на +25 μm вдоль X относительно наружной оси.','The bore axis is offset +25 μm along X relative to the outer axis.',.025),defect('ovality','Овальность расточки','Bore ovality','Ширины посадочной расточки: 35.010 и 35.002 mm.','Bearing-bore widths: 35.010 and 35.002 mm.',.008)]
    },
    plate:{
      id:'plate',name:text('Монтажная плита','Mounting plate'),kind:text('Большая деталь · четыре отверстия','Large part · four holes'),material:text('Алюминий Д16','Aluminium D16'),size:'120 × 80 × 12',length:120,nominal:12,bore:8,shape:'plate',
      primary:{label:text('Толщина в точке P1','Thickness at P1'),nominal:12,limits:[11.97,12.03]},
      specs:[spec('Габарит X × Z × Y','Envelope X × Z × Y','120 × 80 × 12 mm'),spec('Толщина','Thickness','12 ±0.03 mm'),spec('Крепёжные отверстия','Mounting holes','4 × Ø8 ±0.05 mm'),spec('Координаты осей X / Z','Hole-axis coordinates X / Z','(±40; ±22) mm'),spec('Межосевые расстояния','Hole spacing','80 × 44 mm'),spec('Предельное отклонение верха','Upper-surface limit','−0.020 … +0.020 mm')],
      datum:text('База A — нижняя плоскость Y = −6; центр плиты — начало координат. P1 = (−18; 6; 0), P2 = (24; 6; 5) mm.','Datum A: lower plane Y = −6; origin at plate centre. P1 = (−18; 6; 0), P2 = (24; 6; 5) mm.'),
      defects:[defect('bump','Выпуклость плиты','Plate high spot','P1: поверхность выше номинальной плоскости на 35 μm; толщина 12.035 mm.','P1 is 35 μm above the nominal plane; thickness is 12.035 mm.',.035,{x:-18,z:0}),defect('dent','Впадина плиты','Plate depression','P2: поверхность ниже номинальной плоскости на 20 μm; толщина 11.980 mm.','P2 is 20 μm below the nominal plane; thickness is 11.980 mm.',-.020,{x:24,z:5})]
    },
    bracket:{
      id:'bracket',name:text('Угловой кронштейн','Angle bracket'),kind:text('Две плоскости · четыре отверстия','Two planes · four holes'),material:text('Сталь 09Г2С','Steel 09G2S'),size:'70 × 60 × 60',length:70,nominal:90,bore:8,shape:'bracket',center:[0,26,0],
      primary:{label:text('Угол между плоскостями','Angle between planes'),nominal:90,limits:[89.95,90.05],unit:'°'},
      specs:[spec('Ширина по X','Width along X','70 ±0.10 mm'),spec('Глубина основания Z','Base depth Z','60 ±0.10 mm'),spec('Общая высота Y','Overall height Y','60 ±0.10 mm'),spec('Толщина стенок','Wall thickness','8 ±0.05 mm'),spec('Отверстия в основании','Base holes','2 × Ø8 mm · X = ±22, Z = 8'),spec('Отверстия в стойке','Upright holes','2 × Ø8 mm · X = ±22, Y = 34'),spec('Угол A / B','Angle A / B','90° ±0.05°')],
      datum:text('База A — нижняя плоскость основания Y = −4. Стойка: Z = −30 … −22, Y = −4 … 56 mm. Наклон задан вокруг X у Y = 4.','Datum A: underside Y = −4. Upright: Z = −30 … −22, Y = −4 … 56 mm. Tilt is about X at Y = 4.'),
      defects:[defect('squareness','Неперпендикулярность','Squareness error','Угол стойки 90.08°: отклонение +0.08°. В режиме 250× показано как 20°.','Upright angle is 90.08°: +0.08° error. At 250× this is displayed as 20°.',.08,{unit:'°'})]
    }
  };
  function model(id) { if (!models[id]) throw Error('Unknown part'); return models[id]; }
  function radiusAt(profile, y) {
    for (let i = 1; i < profile.length; i++) {
      const a = profile[i-1], b = profile[i];
      if (b[0] > a[0] && y >= a[0] - 1e-8 && y <= b[0] + 1e-8) return (a[1] + (b[1]-a[1]) * (y-a[0])/(b[0]-a[0])) / 2;
    }
    return profile.length ? profile[0][1]/2 : 0;
  }
  function radialDelta(id, y, a, inner = false, baseRadius) {
    const m = model(id); let delta = 0;
    const e = m.ellipse;
    if (e && e.inner === inner && y >= e.y0 && y <= e.y1 && (baseRadius===undefined||Math.abs(baseRadius-e.nominal/2)<1e-8)) {
      const ra = e.major/2, rb = e.minor/2;
      delta += ra*rb/Math.hypot(rb*Math.cos(a),ra*Math.sin(a)) - e.nominal/2;
    }
    if (!inner) for (const d of m.defects) {
      if (d.type === 'radial' && (id!=='flange'||y>=0&&y<=16)) {
        const da = Math.atan2(Math.sin(a-d.theta),Math.cos(a-d.theta));
        const distance = ((y-d.y)/d.sy)**2 + (da/d.st)**2;
        // Compact support makes the quoted peak and unaffected dimensions exact.
        if (distance < 9) delta += d.value * ((Math.exp(-distance/2)-Math.exp(-4.5))/(1-Math.exp(-4.5)));
      }
      if (d.type === 'taper') delta += d.value * clamp((y+20)/45,0,1);
    }
    return delta;
  }
  function plateDelta(x,z) {
    let value=0;
    for (const d of models.plate.defects) {
      const q = ((x-d.x)/17)**2 + ((z-d.z)/17)**2;
      if (q < 1) value += d.value*(1-q)**3;
    }
    return value;
  }
  function sectionWidth(id,y,inner=false,angle=0) {
    const m=model(id),a=angle*Math.PI/180,e=m.ellipse,r=radiusAt(inner?m.inner:m.outer,y);
    if(e&&e.inner===inner&&y>=e.y0&&y<=e.y1&&Math.abs(r-e.nominal/2)<1e-8) return Math.hypot(e.major*Math.cos(a),e.minor*Math.sin(a));
    let lo=Infinity,hi=-Infinity;
    for(let i=0;i<1440;i++) {
      const t=i*tau/1440,q=(r+radialDelta(id,y,t,inner,r))*Math.cos(t-a);
      lo=Math.min(lo,q);hi=Math.max(hi,q);
    }
    return hi-lo;
  }
  function diameter(id,angle=0) {
    const m=model(id),p=m.primary;if(!Number.isFinite(angle))throw Error('Invalid angle');
    if(m.shape==='plate')return p.nominal+plateDelta(-18,0);
    if(m.shape==='bracket')return p.nominal+m.defects[0].value;
    return sectionWidth(id,p.y,!!p.inner,angle);
  }
  function measurements(id,angle=0) {
    const m=model(id),p=m.primary;
    const rows=[{id:'primary',label:p.label,nominal:p.nominal,value:diameter(id,angle),limits:p.limits,unit:p.unit||'mm',position:m.shape?text('По базам A / B','Relative to A / B'):text('Y = '+p.y+' mm; φ = '+angle+'°','Y = '+p.y+' mm; φ = '+angle+'°')}];
    const add=(key,ru,en,nominal,tolerance,value=nominal,position=text('Размер по номинальной геометрии','Dimension from nominal geometry'),unit='mm')=>rows.push({id:key,label:text(ru,en),nominal,value,limits:Array.isArray(tolerance)?tolerance:[nominal-tolerance,nominal+tolerance],unit,position});
    const outer=(key,ru,en,y,nominal,tolerance)=>add(key,ru,en,nominal,tolerance,sectionWidth(id,y,false,0),text('Y = '+y+' mm; φ = 0°','Y = '+y+' mm; φ = 0°'));
    const bore=(key,ru,en,y,nominal,upper)=>add(key,ru,en,nominal,[nominal,nominal+upper],sectionWidth(id,y,true,0),text('Y = '+y+' mm; φ = 0°','Y = '+y+' mm; φ = 0°'));
    if(!m.shape)add('length','Общая длина','Overall length',m.length,id==='shaft'||id==='nozzle'||id==='housing'?.10:.05);
    if(id==='shaft'){
      outer('left','Левая ступень','Left seat',-37.5,12,.02);outer('right','Правая ступень','Right seat',37.5,16,.02);
      add('left-length','Длина левой ступени','Left seat length',25,.05);add('middle-length','Длина средней ступени','Middle seat length',50,.05);add('right-length','Длина правой ступени','Right seat length',25,.05);
    }
    if(id==='bushing')outer('outside','Наружный диаметр','Outer diameter',0,30,.02);
    if(id==='disk')bore('bore','Диаметр отверстия','Bore diameter',0,14,.018);
    if(id==='flange'){
      outer('flange','Диаметр фланца','Flange diameter',-11,88,.05);outer('middle','Промежуточная ступень','Middle step',-3,52,.03);
      bore('bore','Центральное отверстие','Central bore',0,24,.025);add('flange-thickness','Толщина фланца','Flange thickness',10,.05);add('middle-length','Длина средней ступени','Middle step length',6,.05);add('hub-length','Длина ступицы','Hub length',16,.05);
      add('bolt-holes','Шесть крепёжных отверстий','Six bolt holes',8,.05);add('bolt-circle','Делительная окружность','Bolt circle',68,.05);add('hole-angle','Шаг отверстий','Hole angular spacing',60,.1,60,undefined,'°');
    }
    if(id==='pulley'){
      bore('bore','Центральное отверстие','Central bore',0,16,.018);outer('left-root','Дно левого ручья','Left groove root',-8,43,.05);outer('right-root','Дно правого ручья','Right groove root',8,43,.05);
      add('groove-centres','Расстояние между ручьями','Groove root spacing',16,.05);
    }
    if(id==='nozzle'){
      outer('inlet','Входной поясок','Inlet collar',-28,38,.03);bore('inlet-bore','Входное отверстие','Inlet bore',-28,26,.03);bore('outlet-bore','Выходное отверстие','Outlet bore',30,10,.018);
      add('taper-length','Длина конуса','Taper length',45,.1);add('inlet-length','Длина входного пояска','Inlet collar length',15,.05);add('outlet-length','Длина выходного пояска','Outlet collar length',10,.05);
      const nominal=Math.atan(9/45)*180/Math.PI,actual=Math.atan((9-.010)/45)*180/Math.PI;
      add('half-angle','Половина угла · вне впадины','Half-angle · away from depression',nominal,.01,actual,text('Меридиан φ = 0°','Meridian φ = 0°'),'°');
    }
    if(id==='housing'){
      outer('flange','Опорный буртик','Mounting shoulder',-20,76,.05);outer('body','Наружный корпус','Outer body',0,62,.03);outer('rear','Задний поясок','Rear collar',20,50,.03);
      bore('counterbore','Входная расточка','Counterbore',-20,42,.03);add('counterbore-depth','Глубина входной расточки','Counterbore depth',13,.05);add('bearing-length','Длина посадочной расточки','Bearing bore length',37,.05);
    }
    if(id==='plate'){
      add('x','Длина по X','Length along X',120,.1);add('z','Ширина по Z','Width along Z',80,.1);add('p2','Толщина в точке P2','Thickness at P2',12,.03,12+plateDelta(24,5),text('P2: X = 24; Z = 5 mm','P2: X = 24; Z = 5 mm'));
      add('holes','Четыре отверстия','Four mounting holes',8,.05);add('spacing-x','Межосевое по X','Hole spacing along X',80,.05);add('spacing-z','Межосевое по Z','Hole spacing along Z',44,.05);
    }
    if(id==='bracket'){
      add('width','Ширина по X','Width along X',70,.1);add('depth','Глубина по Z','Depth along Z',60,.1);add('height','Высота по Y','Height along Y',60,.1,8+52*Math.cos(.08*Math.PI/180));add('wall','Толщина стенки','Wall thickness',8,.05);
      add('holes','Четыре отверстия','Four mounting holes',8,.05);add('hole-spacing','Межосевое по X','Hole spacing along X',44,.05);
    }
    if(m.ellipse)rows.push({id:'ovality',label:text('Разность ширин 0° / 90°','Width difference 0° / 90°'),nominal:0,value:m.ellipse.major-m.ellipse.minor,limits:[0,.010],unit:'mm',position:text('Одно контрольное сечение','Same control section')});
    for(const d of m.defects){
      if(d.id==='ovality')continue;
      const limits=d.id==='squareness'?[-.05,.05]:d.id==='eccentricity'?[0,.020]:d.type==='taper'?[-.008,.008]:[-.020,.020];
      rows.push({id:d.id,label:d.name,nominal:0,value:d.value,limits,unit:d.unit||'mm',position:d.description});
    }
    return rows.map(r=>({...r,delta:r.value-r.nominal,within:r.value>=r.limits[0]-1e-9&&r.value<=r.limits[1]+1e-9}));
  }
  function visualAxes(id,variant,factor) {
    const m=model(id);if(![1,250].includes(factor))throw Error('Unsupported magnification');
    const e=m.ellipse; return !e||variant==='nominal'?[m.nominal,m.nominal]:[e.nominal+(e.major-e.nominal)*factor,e.nominal+(e.minor-e.nominal)*factor];
  }
  function mesh(id,variant='nominal',factor=1,n=48) {
    const m=model(id);
    if(!['nominal','example'].includes(variant)||![1,250].includes(factor)||!Number.isInteger(n)||n<12||n>128)throw Error('Invalid mesh');
    const amp=variant==='example'?factor:0,faces=[];
    function face(v,expected,delta=0) {
      const a=v[0], b=v[1], c=v[2];
      const u=b.map((x,i)=>x-a[i]),w=c.map((x,i)=>x-a[i]);
      let normal=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];
      if(Math.hypot(...normal)<1e-10)return;
      if(normal.reduce((s,x,i)=>s+x*expected[i],0)<0){v=v.slice().reverse();normal=normal.map(x=>-x);}
      faces.push({v,normal,delta:variant==='example'?delta:0,target:false});
    }
    const rpoint=(y,r,a,inner=false)=>{
      const d=radialDelta(id,y,a,inner,r),shift=inner?(m.eccentricity||0):0;
      return {p:[(r+amp*d)*Math.cos(a)+amp*shift,y,(r+amp*d)*Math.sin(a)],d:d+shift*Math.cos(a)};
    };
    function ringFace(y,ro,ri,sign,outerInner=false,innerInner=true) {
      const bolt=m.bolt;
      if(bolt&&bolt.circle/2-bolt.diameter/2>ri&&bolt.circle/2+bolt.diameter/2<ro&&(y===bolt.y0||y===bolt.y1)) {
        perforatedRing(y,ro,ri,sign);return;
      }
      for(let i=0;i<n;i++) {
        const a=i*tau/n,b=(i+1)*tau/n;
        const o1=rpoint(y,ro,a,outerInner),o2=rpoint(y,ro,b,outerInner),h1=rpoint(y,ri,a,innerInner),h2=rpoint(y,ri,b,innerInner);
        face([o1.p,o2.p,h2.p,h1.p],[0,sign,0],(o1.d+o2.d+h1.d+h2.d)/4);
      }
    }
    function tube(profile,inner=false) {
      for(let k=1;k<profile.length;k++) {
        const a=profile[k-1],b=profile[k];
        if(a[0]===b[0]) {ringFace(a[0],Math.max(a[1],b[1])/2,Math.min(a[1],b[1])/2,(a[1]>b[1]?1:-1)*(inner?-1:1),inner,inner);continue;}
        const steps=amp&&m.defects.some(d=>d.type==='radial')?Math.max(2,Math.ceil((b[0]-a[0])/2)):2;
        for(let j=0;j<steps;j++) {
          const t=j/steps,u=(j+1)/steps,y0=a[0]+(b[0]-a[0])*t,y1=a[0]+(b[0]-a[0])*u,r0=(a[1]+(b[1]-a[1])*t)/2,r1=(a[1]+(b[1]-a[1])*u)/2;
          for(let i=0;i<n;i++) {
            const q=i*tau/n,s=(i+1)*tau/n,pa=rpoint(y0,r0,q,inner),pb=rpoint(y0,r0,s,inner),pc=rpoint(y1,r1,s,inner),pd=rpoint(y1,r1,q,inner),sgn=inner?-1:1;
            face([pa.p,pb.p,pc.p,pd.p],[sgn*Math.cos((q+s)/2),sgn*(r0-r1)/(y1-y0),sgn*Math.sin((q+s)/2)],(pa.d+pb.d+pc.d+pd.d)/4);
          }
        }
      }
    }
    function boltAngles() {
      const b=m.bolt,cx=b.circle/2,half=Math.PI/b.count,angles=[];
      for(let i=0;i<n;i++)angles.push(i*tau/n);
      // Include every polygon corner, so the perforated faces meet the
      // cylinder walls exactly instead of cutting across sector corners.
      const radii=new Set([...m.outer,...m.inner].map(p=>p[1]/2));
      for(const r of radii)for(let j=0;j<=n/b.count;j++){
        const a=-half+j*tau/n;
        angles.push((Math.atan2(r*Math.sin(a),r*Math.cos(a)-cx)+tau)%tau);
      }
      return [...new Set(angles.map(a=>Number(a.toFixed(10))))].sort((a,b)=>a-b);
    }
    function perforatedRing(y,ro,ri,sign) {
      const b=m.bolt,cx=b.circle/2,hr=b.diameter/2,half=Math.PI/b.count,angles=boltAngles(),boundary=[];
      for(let j=0;j<=n/b.count;j++){const a=-half+j*tau/n;boundary.push([ro*Math.cos(a),ro*Math.sin(a)]);}
      for(let j=n/b.count;j>=0;j--){const a=-half+j*tau/n;boundary.push([ri*Math.cos(a),ri*Math.sin(a)]);}
      for(let hole=0;hole<b.count;hole++) {
        const rot=hole*tau/b.count,cr=Math.cos(rot),sr=Math.sin(rot),points=[],radial=2;
        for(const t of [...angles,angles[0]+tau]) {
          const dx=Math.cos(t),dz=Math.sin(t);let edge=Infinity;
          for(let j=0;j<boundary.length;j++){
            const a=boundary[j],c=boundary[(j+1)%boundary.length],ex=c[0]-a[0],ez=c[1]-a[1],ax=a[0]-cx,az=a[1],cross=dx*ez-dz*ex;
            if(Math.abs(cross)<1e-10)continue;
            const distance=(ax*ez-az*ex)/cross,u=(ax*dz-az*dx)/cross;
            if(distance>1e-7&&u>=-1e-7&&u<=1+1e-7)edge=Math.min(edge,distance);
          }
          points.push(Array.from({length:radial+1},(_,j)=>{const r=hr+(edge-hr)*j/radial,x=cx+r*dx,z=r*dz;return[x*cr-z*sr,y,x*sr+z*cr];}));
        }
        for(let i=0;i<angles.length;i++)for(let j=0;j<radial;j++)face([points[i][j],points[i+1][j],points[i+1][j+1],points[i][j+1]],[0,sign,0]);
      }
    }
    function boltWalls() {
      const b=m.bolt;if(!b)return;const angles=boltAngles();
      for(let k=0;k<b.count;k++) {
        const rot=k*tau/b.count,x=b.circle/2*Math.cos(rot),z=b.circle/2*Math.sin(rot),r=b.diameter/2;
        for(let i=0;i<angles.length;i++){
          const a=angles[i]+rot,c=(angles[(i+1)%angles.length]+(i===angles.length-1?tau:0))+rot;
          face([[x+r*Math.cos(a),b.y0,z+r*Math.sin(a)],[x+r*Math.cos(c),b.y0,z+r*Math.sin(c)],[x+r*Math.cos(c),b.y1,z+r*Math.sin(c)],[x+r*Math.cos(a),b.y1,z+r*Math.sin(a)]],[-Math.cos((a+c)/2),0,-Math.sin((a+c)/2)]);
        }
      }
    }
    // Tile perforated rectangular faces into cells. Each cell is an exact
    // rectangle-to-circle annulus, so through holes have actual open geometry.
    function slab({xmin,xmax,zmin,zmax,y0,y1,holes,map=p=>p,deform=false}) {
      const zs=[...new Set(holes.map(h=>h.z))].sort((a,b)=>a-b);
      const cx=[...new Set(holes.map(h=>h.x))].sort((a,b)=>a-b);
      const bx=[xmin,...cx.slice(1).map((x,i)=>(x+cx[i])/2),xmax],bz=[zmin,...zs.slice(1).map((z,i)=>(z+zs[i])/2),zmax];
      const top=(x,z)=>y1+(deform?amp*plateDelta(x,z):0);
      for(const hole of holes) {
        const ix=cx.indexOf(hole.x),iz=zs.indexOf(hole.z),bounds=[bx[ix],bx[ix+1],bz[iz],bz[iz+1]],rings=deform?9:2,grid=[];
        const cornerAngles=[[bounds[0],bounds[2]],[bounds[1],bounds[2]],[bounds[1],bounds[3]],[bounds[0],bounds[3]]].map(([x,z])=>(Math.atan2(z-hole.z,x-hole.x)+tau)%tau);
        const angles=[...new Set([...Array.from({length:n},(_,i)=>i*tau/n),...cornerAngles].map(a=>Number(a.toFixed(10))))].sort((a,b)=>a-b),samples=angles.length;
        for(const a of [...angles,angles[0]+tau]) {
          const dx=Math.cos(a),dz=Math.sin(a);
          const tx=dx>1e-8?(bounds[1]-hole.x)/dx:dx<-1e-8?(bounds[0]-hole.x)/dx:Infinity;
          const tz=dz>1e-8?(bounds[3]-hole.z)/dz:dz<-1e-8?(bounds[2]-hole.z)/dz:Infinity,edge=Math.min(tx,tz);
          grid.push(Array.from({length:rings+1},(_,j)=>{const r=hole.r+(edge-hole.r)*j/rings;return[hole.x+r*dx,hole.z+r*dz];}));
        }
        for(let i=0;i<samples;i++)for(let j=0;j<rings;j++) {
          const ps=[grid[i][j],grid[i+1][j],grid[i+1][j+1],grid[i][j+1]],d=deform?ps.reduce((s,p)=>s+plateDelta(...p),0)/4:0;
          face(ps.map(([x,z])=>map([x,top(x,z),z])),map([0,1,0]).map((x,k)=>x-map([0,0,0])[k]),d);
          face(ps.map(([x,z])=>map([x,y0,z])),map([0,-1,0]).map((x,k)=>x-map([0,0,0])[k]));
        }
        for(let i=0;i<samples;i++) {
          const a=angles[i],b=angles[(i+1)%samples]+(i===samples-1?tau:0),x=hole.x,z=hole.z,r=hole.r;
          const dir=[-Math.cos((a+b)/2),0,-Math.sin((a+b)/2)],normal=map(dir).map((x,k)=>x-map([0,0,0])[k]);
          face([[x+r*Math.cos(a),y0,z+r*Math.sin(a)],[x+r*Math.cos(b),y0,z+r*Math.sin(b)],[x+r*Math.cos(b),top(x+r*Math.cos(b),z+r*Math.sin(b)),z+r*Math.sin(b)],[x+r*Math.cos(a),top(x+r*Math.cos(a),z+r*Math.sin(a)),z+r*Math.sin(a)]].map(map),normal);
        }
      }
      const corners=[[xmin,zmin],[xmax,zmin],[xmax,zmax],[xmin,zmax]];
      for(let i=0;i<4;i++) {
        const a=corners[i],b=corners[(i+1)%4],dir=[b[1]-a[1],0,a[0]-b[0]],normal=map(dir).map((x,k)=>x-map([0,0,0])[k]);
        face([map([a[0],y0,a[1]]),map([b[0],y0,b[1]]),map([b[0],top(...b),b[1]]),map([a[0],top(...a),a[1]])],normal);
      }
    }
    if(m.shape==='plate') {
      slab({xmin:-60,xmax:60,zmin:-40,zmax:40,y0:-6,y1:6,holes:[{x:-40,z:-22,r:4},{x:40,z:-22,r:4},{x:-40,z:22,r:4},{x:40,z:22,r:4}],deform:true});
    } else if(m.shape==='bracket') {
      slab({xmin:-35,xmax:35,zmin:-22,zmax:30,y0:-4,y1:4,holes:[{x:-22,z:8,r:4},{x:22,z:8,r:4}]});
      const tilt=amp*.08*Math.PI/180;
      // Rotate the upright's upper portion about its junction; keep its foot
      // joined to the base so amplification cannot open a gap.
      const map=p=>{const [x,depth,height]=p;let y=height,z=depth-26;if(y>4){const h=y-4;y=4+h*Math.cos(tilt);z+=h*Math.sin(tilt);}return[x,y,z];};
      slab({xmin:-35,xmax:35,zmin:-4,zmax:56,y0:-4,y1:4,holes:[{x:-22,z:34,r:4},{x:22,z:34,r:4}],map});
    } else {
      tube(m.outer);if(m.inner.length)tube(m.inner,true);
      ringFace(m.outer[0][0],m.outer[0][1]/2,m.inner.length?m.inner[0][1]/2:0,-1);
      ringFace(m.outer.at(-1)[0],m.outer.at(-1)[1]/2,m.inner.length?m.inner.at(-1)[1]/2:0,1);boltWalls();
    }
    return faces;
  }
  function transform(p,yaw,pitch,roll=-.16) {
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),cz=Math.cos(roll),sz=Math.sin(roll),x=cy*p[0]+sy*p[2],z=-sy*p[0]+cy*p[2],y=cx*p[1]-sx*z;
    return[cz*x-sz*y,sz*x+cz*y,sx*p[1]+cx*z];
  }
  function bound(faces,center=[0,0,0]) {
    let radius=1;for(const f of faces)for(const p of f.v)radius=Math.max(radius,Math.hypot(...p.map((x,i)=>x-center[i])));return radius;
  }
  function project(faces,yaw,pitch,w,h,zoom=1,radius,center=[0,0,0],roll=-.16) {
    if(!(w>0&&h>0&&Number.isFinite(zoom)))throw Error('Invalid viewport');
    const scale=Math.min(w*.44,h*.43)/(radius||bound(faces,center))*clamp(zoom,.65,1.65),out=[];
    for(const f of faces){const normal=transform(f.normal,yaw,pitch,roll);if(normal[2]<-1e-7)continue;
      const v=f.v.map(p=>transform(p.map((x,i)=>x-center[i]),yaw,pitch,roll));out.push({normal,delta:f.delta,target:f.target,z:v.reduce((s,p)=>s+p[2],0)/v.length,points:v.map(p=>[w/2+p[0]*scale,h/2-p[1]*scale])});
    }return out.sort((a,b)=>a.z-b.z);
  }
  function color(normal,target=false,delta=0,heat=false) {
    const len=Math.hypot(...normal)||1,n=normal.map(x=>x/len),light=Math.max(0,n[0]*-.4+n[1]*.55+n[2]*.72),shine=Math.pow(Math.max(0,n[2]),22)*30;
    let base=[174,186,204];
    if(heat&&Math.abs(delta)>.0003){const strength=clamp(Math.abs(delta)/.018,0,1);const tint=delta>0?[245,166,88]:[71,191,217];base=base.map((x,i)=>x+(tint[i]-x)*strength);}
    return base.map(x=>Math.round(clamp(x*(.42+.58*light)+shine,0,255)));
  }
  function state(id,angle,factor,yaw,pitch,zoom) {
    const m=model(id);
    return {schema:'slich.3d.lesson.v2',synthetic:true,release:'SLICH-2026-10-22-3D',model:id,name:m.name,material:m.material,
      geometry_mm:{outer_profile_y_diameter:m.outer||null,inner_profile_y_diameter:m.inner||null,bolt_holes:m.bolt||null,plate:m.shape==='plate'?{width_x:120,depth_z:80,thickness_y:12,holes_x_z:[[-40,-22],[40,-22],[-40,22],[40,22]],hole_diameter:8}:null,bracket:m.shape==='bracket'?{width_x:70,depth_z:60,height_y:60,wall:8,base_holes_x_z:[[-22,8],[22,8]],upright_holes_x_y:[[-22,34],[22,34]],hole_diameter:8}:null,specifications:m.specs,datum:m.datum},
      measurements:measurements(id,angle),defects:m.defects,measurement_direction_deg:angle,
      display:{amplification:factor,yaw_rad:yaw,pitch_rad:pitch,zoom},
      limits:'Synthetic teaching geometry and illustrative intervals. Numeric values are not amplified. No production measurements, uncertainty assessment or acceptance decision.'};
  }
  return {models,model,diameter,sectionWidth,measurements,visualAxes,radialDelta,plateDelta,mesh,transform,project,bound,color,state,clamp};
});
