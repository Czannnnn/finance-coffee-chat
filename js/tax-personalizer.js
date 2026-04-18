// Finance Coffee Chat — tax-optimization 개인화 모듈
// 상태는 URL 쿼리 파라미터에만. localStorage/sessionStorage/쿠키 사용 안 함.

(function (global) {
  'use strict';

  var FIELD_VALUES = {
    ts: ['ts1', 'ts2', 'ts3', 'ts4', 'ts5', 'ts6'],
    salary: ['0-55', '55-70', '70-100', '100-150', '150+'],
    hasDC: ['yes', 'no'],
    tenure: ['<5', '5-15', '15-25', '25+'],
    dep: ['0', '1', '2', '3']
  };

  var REQUIRED_FIELDS = ['ts', 'salary', 'hasDC'];
  var OPTIONAL_FIELDS = ['tenure', 'dep'];

  function parseFilterState(queryString) {
    var params = new URLSearchParams(queryString || '');
    var state = {};
    Object.keys(FIELD_VALUES).forEach(function (field) {
      var value = params.get(field);
      if (value && FIELD_VALUES[field].indexOf(value) !== -1) {
        state[field] = value;
      }
    });
    return state;
  }

  function serializeFilterState(state, options) {
    options = options || {};
    var params = new URLSearchParams();
    Object.keys(FIELD_VALUES).forEach(function (field) {
      if (options.excludeSensitive && (field === 'salary' || field === 'dep')) {
        return;
      }
      if (state[field]) {
        params.set(field, state[field]);
      }
    });
    var str = params.toString();
    return str ? '?' + str : '';
  }

  function hasRequiredFields(state) {
    return REQUIRED_FIELDS.every(function (field) {
      return Boolean(state[field]);
    });
  }

  // 세그먼트(ts) × 영역 가중치
  // 영역: accounts(절세계좌), year-end(연말정산), retirement(퇴직연금), isa-bonus(ISA전환), furusato(고향사랑), loss-harvest(손실상계)
  var SEGMENT_AREA_WEIGHTS = {
    ts1: { accounts: 2, 'year-end': 3, retirement: 1, 'isa-bonus': 1, furusato: 2, 'loss-harvest': 1 }, // 저소득
    ts2: { accounts: 3, 'year-end': 3, retirement: 2, 'isa-bonus': 2, furusato: 3, 'loss-harvest': 2 }, // 중소득
    ts3: { accounts: 3, 'year-end': 3, retirement: 2, 'isa-bonus': 3, furusato: 3, 'loss-harvest': 3 }, // 고소득
    ts4: { accounts: 3, 'year-end': 3, retirement: 3, 'isa-bonus': 3, furusato: 2, 'loss-harvest': 2 }, // 퇴직 근접
    ts5: { accounts: 2, 'year-end': 2, retirement: 1, 'isa-bonus': 2, furusato: 2, 'loss-harvest': 3 }, // 개인사업자
    ts6: { accounts: 3, 'year-end': 3, retirement: 3, 'isa-bonus': 3, furusato: 3, 'loss-harvest': 2 }  // 맞벌이
  };

  function getAreaKeyFromRef(areaRef) {
    // "accounts-pension" → "accounts", "year-end-furusato" → "year-end"
    var s = String(areaRef || '');
    if (s.indexOf('year-end') === 0) return 'year-end';
    if (s.indexOf('isa-bonus') === 0) return 'isa-bonus';
    if (s.indexOf('loss-harvest') === 0) return 'loss-harvest';
    var match = s.match(/^([a-z-]+?)(-|$)/);
    return match ? match[1] : null;
  }

  function getSegmentAreaWeight(segmentKey, areaRef) {
    if (!segmentKey || !SEGMENT_AREA_WEIGHTS[segmentKey]) return 0;
    var key = getAreaKeyFromRef(areaRef);
    if (!key) return 0;
    return SEGMENT_AREA_WEIGHTS[segmentKey][key] || 0;
  }

  function ruleMatches(rule, state) {
    var conditions = rule.conditions || {};
    var fields = Object.keys(conditions);
    if (fields.length === 0) return true;
    return fields.every(function (field) {
      var allowedValues = conditions[field];
      if (!Array.isArray(allowedValues) || allowedValues.length === 0) return true;
      if (!state[field]) return false;
      return allowedValues.indexOf(state[field]) !== -1;
    });
  }

  function countMismatchedFields(rule, state) {
    var conditions = rule.conditions || {};
    var mismatched = 0;
    Object.keys(conditions).forEach(function (field) {
      if (!state[field]) return;
      var allowedValues = conditions[field];
      if (Array.isArray(allowedValues) && allowedValues.indexOf(state[field]) === -1) {
        mismatched++;
      }
    });
    return mismatched;
  }

  function scoreRule(rule, state) {
    var base = (rule.priority || 1) * 10;
    var optionalMatchBonus = 0;
    OPTIONAL_FIELDS.forEach(function (field) {
      var conditions = rule.conditions || {};
      if (state[field] && conditions[field] && conditions[field].indexOf(state[field]) !== -1) {
        optionalMatchBonus += 3;
      }
    });
    var segmentWeight = getSegmentAreaWeight(state.ts, rule.areaRef);
    return base + optionalMatchBonus + segmentWeight;
  }

  function classifyRules(rules, state) {
    var matched = [];
    var notApplicable = [];
    rules.forEach(function (rule) {
      if (ruleMatches(rule, state)) {
        matched.push({ rule: rule, score: scoreRule(rule, state) });
        return;
      }
      var mismatches = countMismatchedFields(rule, state);
      if (mismatches === 1) {
        notApplicable.push(rule);
      }
    });
    matched.sort(function (a, b) { return b.score - a.score; });
    return {
      top3: matched.slice(0, 3).map(function (x) { return x.rule; }),
      extended: matched.slice(3, 8).map(function (x) { return x.rule; }),
      notApplicable: notApplicable
    };
  }

  var api = {
    FIELD_VALUES: FIELD_VALUES,
    REQUIRED_FIELDS: REQUIRED_FIELDS,
    OPTIONAL_FIELDS: OPTIONAL_FIELDS,
    parseFilterState: parseFilterState,
    serializeFilterState: serializeFilterState,
    hasRequiredFields: hasRequiredFields,
    SEGMENT_AREA_WEIGHTS: SEGMENT_AREA_WEIGHTS,
    ruleMatches: ruleMatches,
    scoreRule: scoreRule,
    classifyRules: classifyRules
  };

  global.TaxPersonalizer = api;
})(window);
