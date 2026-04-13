// Finance Coffee Chat — cost-optimization 개인화 모듈
// 상태는 URL 쿼리 파라미터에만 존재. localStorage/sessionStorage/쿠키 사용 안 함.

(function (global) {
  'use strict';

  // ───────────────────────── 1. 필드 정의 & URL 파싱 ─────────────────────────

  var FIELD_VALUES = {
    s: ['s1', 's2', 's3', 's4', 's5', 's6'],
    income: ['0-30', '30-50', '50-70', '70-100', '100+'],
    home: ['own', 'jeonse', 'rent'],
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

  // ───────────────────────── 내보내기 (테스트용) ─────────────────────────

  var api = {
    FIELD_VALUES: FIELD_VALUES,
    REQUIRED_FIELDS: REQUIRED_FIELDS,
    OPTIONAL_FIELDS: OPTIONAL_FIELDS,
    parseFilterState: parseFilterState,
    serializeFilterState: serializeFilterState,
    hasRequiredFields: hasRequiredFields
  };

  global.CostPersonalizer = api;
})(window);
