// Finance Coffee Chat — 지수투자(index-investing) 개인화 모듈
// 상태는 URL 쿼리 파라미터에만 존재. localStorage/sessionStorage/쿠키 사용 안 함.

(function (global) {
  'use strict';

  // ───────────────────────── 1. 필드 정의 & URL 파싱 ─────────────────────────

  var FIELD_VALUES = {
    is: ['is1', 'is2', 'is3', 'is4', 'is5', 'is6'],
    age: ['20s', '30s', '40s', '50s', '60+'],
    dc: ['yes', 'no'],
    fireProgress: ['0-30', '30-60', '60-85', '85+'],
    riskTol: ['conservative', 'balanced', 'aggressive']
  };

  var REQUIRED_FIELDS = ['is', 'age', 'dc'];
  var OPTIONAL_FIELDS = ['fireProgress', 'riskTol'];

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
      if (options.excludeSensitive && (field === 'fireProgress')) {
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

  // 세그먼트(is) × 자산클래스 가중치 (index-investing.html 매트릭스 테이블 기반)
  // 3=핵심, 2=보조, 1=소량, 0=비권장
  // 자산클래스: nasdaq100(나스닥100), sp500(S&P500), dividend(미국배당다우존스),
  //           bond(채권/안전자산), gold(금), value(한국밸류업), drawdown(급락대응)
  var SEGMENT_ASSETCLASS_WEIGHTS = {
    is1: { nasdaq100: 3, sp500: 3, dividend: 1, bond: 1, gold: 1, value: 1, drawdown: 2 }, // 초기축적
    is2: { nasdaq100: 3, sp500: 3, dividend: 2, bond: 1, gold: 1, value: 2, drawdown: 3 }, // 공격성장
    is3: { nasdaq100: 2, sp500: 3, dividend: 2, bond: 2, gold: 2, value: 1, drawdown: 2 }, // 가족균형
    is4: { nasdaq100: 2, sp500: 3, dividend: 3, bond: 2, gold: 2, value: 1, drawdown: 2 }, // FIRE근접
    is5: { nasdaq100: 1, sp500: 2, dividend: 3, bond: 3, gold: 2, value: 1, drawdown: 1 }, // 보존/인출
    is6: { nasdaq100: 3, sp500: 3, dividend: 2, bond: 2, gold: 2, value: 2, drawdown: 2 }  // DC중심
  };

  function getAssetClassFromRef(areaRef) {
    // "nasdaq100" or "00-nasdaq100" → "nasdaq100"
    var match = (areaRef || '').match(/([a-z][a-z0-9]+)$/i);
    return match ? match[1] : null;
  }

  function getSegmentAssetClassWeight(segmentKey, areaRef) {
    if (!segmentKey || !SEGMENT_ASSETCLASS_WEIGHTS[segmentKey]) return 0;
    var cls = getAssetClassFromRef(areaRef);
    if (!cls) return 0;
    return SEGMENT_ASSETCLASS_WEIGHTS[segmentKey][cls] || 0;
  }

  function ruleMatches(rule, state) {
    var conditions = rule.conditions || {};
    var fields = Object.keys(conditions);
    if (fields.length === 0) return true;
    return fields.every(function (field) {
      var allowedValues = conditions[field];
      if (!Array.isArray(allowedValues) || allowedValues.length === 0) return true;
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
    var segmentWeight = getSegmentAssetClassWeight(state.is, rule.areaRef);
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
    SEGMENT_ASSETCLASS_WEIGHTS: SEGMENT_ASSETCLASS_WEIGHTS,
    ruleMatches: ruleMatches,
    scoreRule: scoreRule,
    classifyRules: classifyRules
  };

  global.IndexPersonalizer = api;
})(window);
