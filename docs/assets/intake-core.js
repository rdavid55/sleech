/* Shared by the browser and API. Descriptions suggest; explicit answers decide. */
(function (root) {
  'use strict';
  const choices = {
    role: ['customer', 'supplier', 'laboratory', 'unknown'],
    stage: ['conflict', 'prevent', 'unknown'],
    category: ['geometry', 'physical', 'chemical', 'other', 'unknown'],
    evidence: ['two', 'one', 'none', 'unknown']
  };
  const requirements = ['method', 'uncertainty', 'traceability', 'protocol', 'confidentiality'];
  const fields = ['description', 'object', 'characteristic', 'documents', 'deadline'];
  function normalize(value) {
    const v = value && typeof value === 'object' ? value : {}, out = {};
    for (const [key, allowed] of Object.entries(choices)) out[key] = allowed.includes(v[key]) ? v[key] : '';
    for (const key of fields) out[key] = typeof v[key] === 'string' ? v[key].trim().slice(0, 4000) : '';
    out.requirements = requirements.filter(x => Array.isArray(v.requirements) && v.requirements.includes(x));
    return out;
  }
  function recommend(value) {
    const v = normalize(value), missing = Object.keys(choices).filter(k => !v[k]);
    if (missing.length) return {route: 'incomplete', missing, service: null};
    if (Object.keys(choices).some(k => v[k] === 'unknown')) return {route: 'clarification', service: null, reason: 'unknown'};
    if (v.category !== 'geometry') return {route: 'clarification', service: null, reason: 'specialist'};
    if (v.stage === 'prevent') return {route: 'protocol', service: 'protocol', reason: 'before_delivery'};
    if (v.evidence !== 'two') return {route: 'clarification', service: null, reason: 'missing_evidence'};
    return {route: 'audit', service: 'audit', reason: 'two_results'};
  }
  function suggest(text) {
    const s = String(text || '').toLowerCase();
    const negated = /не\s+(?:было\s+)?расхожд|расхождени[йя]\s+нет|без\s+расхожд/.test(s);
    const conflict = !negated && /расхожд|разны[ейх].{0,25}(?:результат|измерен)|спор.{0,25}(?:контрол|при[её]мк)/.test(s);
    const prevent = /до\s+(?:первой\s+)?поставк|заранее|предотврат|согласова.{0,25}(?:карт|контрол)/.test(s);
    const ambiguous = /\?|или\s|может\s+быть|возможно|не\s+уверен|не\s+зна/.test(s);
    return {stage: ambiguous || conflict === prevent ? null : conflict ? 'conflict' : 'prevent', confirmationRequired: true};
  }
  const api = {choices, requirements, fields, normalize, recommend, suggest};
  if (typeof module !== 'undefined') module.exports = api;
  root.SlichIntake = api;
})(typeof window !== 'undefined' ? window : globalThis);
