const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../docs/assets/intake-core.js');
const ready={role:'customer',stage:'conflict',category:'geometry',evidence:'two',description:'Результаты измерений сторон различаются.'};
test('service selection handles valid, missing and specialist cases without treating a measurement as conformity',()=>{
 assert.equal(core.recommend(ready).service,'audit');
 assert.equal(core.recommend({...ready,stage:'prevent',evidence:'none'}).service,'protocol');
 assert.equal(core.recommend({...ready,evidence:'one'}).route,'clarification');
 assert.equal(core.recommend({...ready,category:'chemical'}).route,'clarification');
 assert.equal(core.recommend({...ready,role:'unknown'}).route,'clarification');
 assert.equal(core.recommend({...ready,role:'admin'}).route,'incomplete');
 assert.equal(core.recommend({}).route,'incomplete');
});
test('text suggestions are conservative and never override explicit answers',()=>{
 for(const s of ['Расхождений нет','Не было расхождений','Без расхождений','Возможно расхождение','Расхождение или согласование до поставки?'])assert.equal(core.suggest(s).stage,null,s);
 assert.equal(core.suggest('Нужно согласовать контроль заранее до поставки').stage,'prevent');
 assert.equal(core.suggest('Расхождение результатов при приёмке').stage,'conflict');
 assert.equal(core.suggest('Расхождение результатов').confirmationRequired,true);
});
test('normalisation rejects role injection and unknown requirement fields',()=>{
 const v=core.normalize({...ready,requirements:['method','admin','method'],description:'a'.repeat(5000),price:1});
 assert.deepEqual(v.requirements,['method']);assert.equal(v.description.length,4000);assert.equal(v.price,undefined);
});
