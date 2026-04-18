// Finance Coffee Chat — cost-optimization 개인화 모듈
// 상태는 URL 쿼리 파라미터에만 존재. localStorage/sessionStorage/쿠키 사용 안 함.

(function (global) {
  'use strict';

  // ───────────────────────── 1. 필드 정의 & URL 파싱 ─────────────────────────

  var FIELD_VALUES = {
    s: ['s1', 's2', 's3', 's4', 's5', 's6'],
    income: ['0-30', '30-50', '50-70', '70-100', '100+'],
    home: ['own', 'jeonse', 'rent', 'family'],
    dep: ['0', '1', '2', '3'],
    region: ['metro', 'nonmetro']
  };

  var REQUIRED_FIELDS = ['s', 'income', 'home'];
  var OPTIONAL_FIELDS = ['dep', 'region'];

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
      if (options.excludeSensitive && (field === 'income' || field === 'dep')) {
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

  // ───────────────────────── 2. 규칙 매칭 & 점수 정렬 ─────────────────────────

  // 세그먼트 × 영역 가중치 (cost-optimization.html 매트릭스 테이블 기반)
  // ★★★=3, ★★=2, ★=1
  var SEGMENT_AREA_WEIGHTS = {
    s1: { '01': 3, '02': 2, '03': 2, '04': 3, '05': 2, '06': 1, '07': 3, '08': 3 },
    s2: { '01': 3, '02': 3, '03': 2, '04': 2, '05': 3, '06': 2, '07': 3, '08': 2 },
    s3: { '01': 3, '02': 2, '03': 3, '04': 2, '05': 2, '06': 2, '07': 3, '08': 2 },
    s4: { '01': 3, '02': 3, '03': 3, '04': 2, '05': 2, '06': 2, '07': 3, '08': 2 },
    s5: { '01': 3, '02': 3, '03': 3, '04': 2, '05': 2, '06': 3, '07': 3, '08': 2 },
    s6: { '01': 3, '02': 3, '03': 3, '04': 3, '05': 3, '06': 2, '07': 1, '08': 1 }
  };

  function getAreaNumFromRef(areaRef) {
    // "01-year-end-tax" → "01"
    var match = (areaRef || '').match(/^(\d{2})/);
    return match ? match[1] : null;
  }

  function getSegmentAreaWeight(segmentKey, areaRef) {
    if (!segmentKey || !SEGMENT_AREA_WEIGHTS[segmentKey]) return 0;
    var areaNum = getAreaNumFromRef(areaRef);
    if (!areaNum) return 0;
    return SEGMENT_AREA_WEIGHTS[segmentKey][areaNum] || 0;
  }

  function ruleMatches(rule, state) {
    var conditions = rule.conditions || {};
    var fields = Object.keys(conditions);
    if (fields.length === 0) return true; // 조건 없음 = 모두 매칭
    return fields.every(function (field) {
      var allowedValues = conditions[field];
      if (!Array.isArray(allowedValues) || allowedValues.length === 0) return true;
      // 규칙이 특정 필드에 조건을 명시한 이상, 사용자가 해당 필드를 선택해야만 매칭 성립.
      // (ex. dep 조건만 있는 '자녀 세액공제' 규칙이 dep 미선택 청년 단독에게 매칭되던 버그 방지)
      if (!state[field]) {
        return false;
      }
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
    var segmentWeight = getSegmentAreaWeight(state.s, rule.areaRef);
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
      // mismatches >= 2 는 아예 제외
    });
    matched.sort(function (a, b) { return b.score - a.score; });
    return {
      top3: matched.slice(0, 3).map(function (x) { return x.rule; }),
      extended: matched.slice(3, 8).map(function (x) { return x.rule; }),
      notApplicable: notApplicable
    };
  }

  // ───────────────────────── 내보내기 (테스트용) ─────────────────────────

  var api = {
    FIELD_VALUES: FIELD_VALUES,
    REQUIRED_FIELDS: REQUIRED_FIELDS,
    OPTIONAL_FIELDS: OPTIONAL_FIELDS,
    parseFilterState: parseFilterState,
    serializeFilterState: serializeFilterState,
    hasRequiredFields: hasRequiredFields,
    // 규칙 매칭
    SEGMENT_AREA_WEIGHTS: SEGMENT_AREA_WEIGHTS,
    ruleMatches: ruleMatches,
    scoreRule: scoreRule,
    classifyRules: classifyRules
  };

  global.CostPersonalizer = api;
})(window);
