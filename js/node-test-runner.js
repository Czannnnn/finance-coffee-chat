// Node-based test runner for cost-personalizer pure functions
// Run: node js/node-test-runner.js
// Exits 0 on all-pass, 1 on any failure.

var fs = require('fs');
var vm = require('vm');

// Shim browser globals
var fakeWindow = {};
var sandbox = {
  window: fakeWindow,
  URLSearchParams: URLSearchParams,
  console: console
};
vm.createContext(sandbox);
var code = fs.readFileSync(__dirname + '/cost-personalizer.js', 'utf8');
vm.runInContext(code, sandbox);

var P = fakeWindow.CostPersonalizer;
if (!P) {
  console.error('Failed to load CostPersonalizer');
  process.exit(1);
}

var passed = 0, failed = 0;
function assert(name, actual, expected) {
  var ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log('  PASS:', name);
  } else {
    failed++;
    console.error('  FAIL:', name);
    console.error('    expected:', JSON.stringify(expected));
    console.error('    got:     ', JSON.stringify(actual));
  }
}

console.log('[parseFilterState]');
assert('empty', P.parseFilterState(''), {});
assert('all fields', P.parseFilterState('?s=s4&income=50-70&home=rent&dep=1&region=metro'),
  { s: 's4', income: '50-70', home: 'rent', dep: '1', region: 'metro' });
assert('invalid values ignored', P.parseFilterState('?s=s9&income=banana&home=rent'), { home: 'rent' });
assert('partial fields', P.parseFilterState('?s=s1&home=rent'), { s: 's1', home: 'rent' });

console.log('[serializeFilterState]');
assert('full', P.serializeFilterState({ s: 's4', income: '50-70', home: 'rent', dep: '1', region: 'metro' }),
  '?s=s4&income=50-70&home=rent&dep=1&region=metro');
assert('mask sensitive',
  P.serializeFilterState({ s: 's4', income: '50-70', home: 'rent', dep: '1', region: 'metro' }, { excludeSensitive: true }),
  '?s=s4&home=rent&region=metro');
assert('empty', P.serializeFilterState({}), '');

console.log('[hasRequiredFields]');
assert('met', P.hasRequiredFields({ s: 's1', income: '0-30', home: 'rent' }), true);
assert('missing one', P.hasRequiredFields({ s: 's1', home: 'rent' }), false);
assert('empty', P.hasRequiredFields({}), false);

console.log('[ruleMatches]');
var sampleRule = { id: 'test-rule', conditions: { home: ['rent'], income: ['0-30', '30-50'] } };
assert('all conditions', P.ruleMatches(sampleRule, { home: 'rent', income: '30-50' }), true);
assert('one mismatch', P.ruleMatches(sampleRule, { home: 'own', income: '30-50' }), false);
assert('empty conditions', P.ruleMatches({ conditions: {} }, { s: 's1' }), true);
// 변경: optional 필드 조건이 명시된 규칙은, 해당 필드를 사용자가 선택해야만 매칭 (dep 조건만 있는 규칙이 미선택 유저에게 매칭되던 버그 수정)
assert('optional field required when conditioned', P.ruleMatches({ conditions: { region: ['metro'] } }, { s: 's1' }), false);
assert('optional field matches when selected', P.ruleMatches({ conditions: { region: ['metro'] } }, { s: 's1', region: 'metro' }), true);

console.log('[scoreRule]');
var ruleA = { priority: 3, areaRef: '01-year-end-tax', conditions: { home: ['rent'] } };
assert('priority 3 + s4/01 weight (3)', P.scoreRule(ruleA, { s: 's4', home: 'rent' }), 33);
var ruleB = { priority: 2, areaRef: '08-transport', conditions: { region: ['metro'] } };
assert('optional bonus', P.scoreRule(ruleB, { s: 's1', region: 'metro' }), 26);

console.log('[classifyRules]');
var rules = [
  { id: 'r1', priority: 3, areaRef: '01-year-end-tax', conditions: { home: ['rent'] } },
  { id: 'r2', priority: 3, areaRef: '07-public-support', conditions: { home: ['own'] } },
  { id: 'r3', priority: 2, areaRef: '04-telecom', conditions: {} }
];
var classified = P.classifyRules(rules, { s: 's4', income: '50-70', home: 'rent' });
assert('top3 count', classified.top3.length, 2);
assert('notApplicable count', classified.notApplicable.length, 1);
assert('top3 ordering', classified.top3[0].id, 'r1');

// Additional: verify against actual data/cost-recommendations.json
console.log('[integration with data/cost-recommendations.json]');
var realRules = JSON.parse(fs.readFileSync(__dirname + '/../data/cost-recommendations.json', 'utf8')).rules;
assert('real rule count', realRules.length, 18);

// S1 청년 단독, 저소득, 월세, 수도권 — 예상: youth-rent-support TOP1
var s1Result = P.classifyRules(realRules, { s: 's1', income: '0-30', home: 'rent', region: 'metro' });
console.log('  S1/0-30/rent/metro TOP 3:', s1Result.top3.map(function(r){return r.id;}));
var s1Top = s1Result.top3[0].id;
assert('s1/0-30/rent/metro includes youth-rent-support in top3',
  s1Result.top3.some(function(r){return r.id === 'youth-rent-support';}),
  true);

// S4 유자녀, 중간 소득, 자가 — 예상: child-tax-credit + homeowner-property-tax in top
var s4Result = P.classifyRules(realRules, { s: 's4', income: '50-70', home: 'own', dep: '1' });
console.log('  S4/50-70/own/dep=1 TOP 3:', s4Result.top3.map(function(r){return r.id;}));
assert('s4 own owner sees homeowner-property-tax',
  s4Result.top3.concat(s4Result.extended).some(function(r){return r.id === 'homeowner-property-tax';}),
  true);
assert('s4 with dep=1 sees child-tax-credit',
  s4Result.top3.concat(s4Result.extended).some(function(r){return r.id === 'child-tax-credit';}),
  true);

// S6 중장년 고소득 — 예상: midlife-pension-deduction 포함
var s6Result = P.classifyRules(realRules, { s: 's6', income: '70-100', home: 'own' });
console.log('  S6/70-100/own TOP 3:', s6Result.top3.map(function(r){return r.id;}));
assert('s6 high-income sees pension deduction',
  s6Result.top3.concat(s6Result.extended).some(function(r){return r.id === 'midlife-pension-deduction';}),
  true);

console.log('');
console.log('Results:', passed, 'passed,', failed, 'failed');
process.exit(failed === 0 ? 0 : 1);
