const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const C = require('../docs/assets/slich-core.js');
const catalogue = require('../docs/service-data.json');
const gates = [true, true, true, true];

test('annual economics agrees with independently calculated examples', () => {
  const a = C.effect(20, 120000, 30, 3);
  assert.equal(a.savings, 720000);
  assert.equal(a.first, 430000);
  assert.equal(a.firstNet, 290000);
  assert.equal(a.recurringNet, 315000);
  assert.equal(C.effect(6, 120000, 30, 3).firstNet, -214000);
  assert.equal(C.effect(0, 120000, 30, 3).threshold, null);
  assert.equal(C.effect(2.5, 120000, 30, 3), null);
});

test('one-off quotations ignore hidden recurring-service inputs', () => {
  const project = catalogue.services.find(s => s.id === 'project');
  assert.equal(C.budget(project, NaN, NaN, true, 0, 0).total, 175000);
  const regular = catalogue.services.find(s => s.id === 'regular');
  assert.equal(C.budget(regular, 12, 3, true, 0, 0).total, 430000);
  assert.equal(C.budget(regular, NaN, 3, true, 0, 0), null);
});

test('comparison blocks invalid prerequisites and non-finite arithmetic', () => {
  assert.equal(C.compare(5, 3, 2, 0, 4, 2, gates).en, 1);
  assert.equal(C.compare(5, 3, 2, 0, 4, 2, gates).compatible, true);
  assert.equal(C.compare(-6, 3, 2, 0, 4, 2, gates).compatible, false);
  assert.equal(C.compare(5, 3, 2, 0, 4, 3, gates).reason, 'coverage');
  assert.equal(C.compare(5, 3, 2, 0, 4, 2, [true, true, true, false]).ok, false);
  assert.equal(C.compare(1e308, 1.7e308, 2, -1e308, 1.7e308, 2, gates).ok, false);
  assert.equal(C.compare(1e308, 1e-300, 2, 0, 1e-300, 2, gates).ok, false);
});

test('numeric parsing accepts decimal comma and rejects hexadecimal or empty input', () => {
  assert.equal(C.num('-0,001'), -.001);
  assert.equal(C.num('1e-3'), .001);
  for (const input of ['', ' ', '0x20', '0b10', 'Infinity', '1,2,3', null]) assert.ok(Number.isNaN(C.num(input)));
});

test('downloadable template has exactly one cell per header, including its comment', () => {
  const p = C.parseCSV(fs.readFileSync(require.resolve('../docs/materials/SLICH_Measurements_Template.csv'), 'utf8'));
  assert.equal(p.rows[0].width, C.HEADERS.length);
  assert.ok(p.rows[0].data.comment.includes('учебный шаблон'));
});

test('CSV export preserves signed decimal-comma measurements and escapes formula cells', () => {
  const row = C.HEADERS.map(h => h === 'value' ? '-0,001' : h === 'comment' ? '=HYPERLINK("https://example.invalid")' : 'x');
  const restored = C.parseCSV(C.csv([C.HEADERS, row])).rows[0].data;
  assert.equal(restored.value, '-0,001');
  assert.ok(restored.comment.startsWith("'="));
});

test('CSV validation rejects duplicate observations, invalid dates and mixed units', () => {
  const make = overrides => ({case_id:'T',protocol_version:'v1',object_id:'P',characteristic:'diameter',section:'S1',site:'A',operator:'O',repeat:'1',value:'20,001',unit:'mm',instrument_id:'I',method:'M',temperature_C:'20',expanded_uncertainty:'.004',coverage_factor:'2',reference_id:'R',timestamp:'2026-10-27T12:00:00Z',comment:'',...overrides});
  const parse = rows => C.parseCSV(C.csv([C.HEADERS,...rows.map(r=>C.HEADERS.map(h=>r[h]))]));
  assert.equal(C.validateCSV(parse([make({}),make({repeat:'2',value:'20,003'})]),{}).ok,true);
  assert.ok(C.validateCSV(parse([make({}),make({})]),{}).errors.some(e=>e.code==='duplicate'));
  assert.ok(C.validateCSV(parse([make({timestamp:'2026-02-30T12:00:00Z'})]),{}).errors.some(e=>e.code==='timestamp'));
  assert.ok(C.validateCSV(parse([make({}),make({repeat:'2',unit:'cm'})]),{}).errors.some(e=>e.code==='mixed'));
});

test('case import requires a complete passport and does not borrow old fields', () => {
  const passport={'case-id':'A','object-id':'B',characteristic:'diameter',unit:'mm','protocol-version':'v1','case-owner':''};
  const r={schema:'slich-case-v2',passport,working:null};
  assert.equal(C.readCase(r).passport['case-owner'],'');
  assert.throws(()=>C.readCase({...r,passport:{'case-id':'other'}}));
  assert.throws(()=>C.readCase({...r,passport:{...passport,unit:12}}));
  assert.throws(()=>C.readCase({...r,working:{}}));
  assert.equal(passport['object-id'],'B');
});
