/* ════════════════════════════════════════
   Firebase 설정
   ★ 아래 6개 값을 Firebase 콘솔에서 복사해서 붙여넣으세요
     경로: 프로젝트 설정 → 내 앱 → SDK 설정 및 구성
════════════════════════════════════════ */
var firebaseConfig = {
  apiKey: "AIzaSyB-AepHe15rCINx62JSU_aW26WAedgS29k",
  authDomain: "hire-eval.firebaseapp.com",
  projectId: "hire-eval",
  storageBucket: "hire-eval.firebasestorage.app",
  messagingSenderId: "548323918646",
  appId: "1:548323918646:web:6a046d6e6880a05540e997"
};
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

/* ════════════════════════════════════════
   상수 / 기본값
════════════════════════════════════════ */
var DEFAULT_PARAMS = {
  '현장주간': {
    weights: { edu: 15, exp: 30, skill: 25, rel: 20, cont: 10 },
    bands: [
      { min: 0, max: 30, lo: 2000, hi: 2400, grade: 'D', label: '0 ~ 30점' },
      { min: 31, max: 50, lo: 2400, hi: 2800, grade: 'C', label: '31 ~ 50점' },
      { min: 51, max: 65, lo: 2800, hi: 3200, grade: 'B', label: '51 ~ 65점' },
      { min: 66, max: 80, lo: 3200, hi: 3700, grade: 'A', label: '66 ~ 80점' },
      { min: 81, max: 100, lo: 3700, hi: 4400, grade: 'S', label: '81 ~ 100점' }
    ]
  },
  '현장교대': {
    weights: { edu: 15, exp: 30, skill: 25, rel: 20, cont: 10 },
    bands: [
      { min: 0, max: 30, lo: 2200, hi: 2700, grade: 'D', label: '0 ~ 30점' },
      { min: 31, max: 50, lo: 2700, hi: 3200, grade: 'C', label: '31 ~ 50점' },
      { min: 51, max: 65, lo: 3200, hi: 3700, grade: 'B', label: '51 ~ 65점' },
      { min: 66, max: 80, lo: 3700, hi: 4300, grade: 'A', label: '66 ~ 80점' },
      { min: 81, max: 100, lo: 4300, hi: 5200, grade: 'S', label: '81 ~ 100점' }
    ]
  },
  '기획주간': {
    weights: { edu: 15, exp: 30, skill: 25, rel: 20, cont: 10 },
    bands: [
      { min: 0, max: 30, lo: 2400, hi: 2900, grade: 'D', label: '0 ~ 30점' },
      { min: 31, max: 50, lo: 2900, hi: 3400, grade: 'C', label: '31 ~ 50점' },
      { min: 51, max: 65, lo: 3400, hi: 4000, grade: 'B', label: '51 ~ 65점' },
      { min: 66, max: 80, lo: 4000, hi: 4700, grade: 'A', label: '66 ~ 80점' },
      { min: 81, max: 100, lo: 4700, hi: 5600, grade: 'S', label: '81 ~ 100점' }
    ]
  }
};

var GRADE_STYLE = {
  S: 'background:#ede9fe;color:#5b21b6',
  A: 'background:#e6faf7;color:#0b7a70',
  B: 'background:#dbeafe;color:#1e40af',
  C: 'background:#fef9c3;color:#854d0e',
  D: 'background:#fef2f2;color:#9b1c1c'
};
var GRADE_NAMES = { S: '최우수 (S)', A: '우수 (A)', B: '양호 (B)', C: '보통 (C)', D: '기초 (D)' };
var FACTOR_NAMES = {
  exp: '총 경력 연수', skill: '업무 전문성',
  rel: '과거 이력 관련성', edu: '학력', cont: '경력 지속성'
};
var JT_COLORS = { '현장주간': '#0d9488', '현장교대': '#7c3aed', '기획주간': '#0284c7' };
var JT_TAG_STYLE = {
  '현장주간': 'background:#e6faf7;color:#0b7a70',
  '현장교대': 'background:#ede9fe;color:#5b21b6',
  '기획주간': 'background:#dbeafe;color:#1e40af'
};
var EDU_LABELS = { 1: '고졸 이하', 2: '전문대 졸', 3: '대학교 졸', 4: '대학원 이상' };
var SKILL_LABELS = { 1: '기초', 2: '중급', 3: '전문가' };
var REL_LABELS = { 1: '무관', 2: '부분 관련', 3: '직접 관련' };
var CONT_LABELS = { 1: '잦은 이직', 2: '보통', 3: '장기 근속' };

/* ════════════════════════════════════════
   상태
════════════════════════════════════════ */
var params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
var cloudParams = JSON.parse(JSON.stringify(DEFAULT_PARAMS)); // 클라우드 원본 보관
var testMode = false;
var selectedJobType = null;
var scores = { edu: null, exp: null, skill: null, rel: null, cont: null };
var expYearsVal = 0;
var expMonthsVal = 0;
var currentResult = null;
var evalHistory = [];
var selectedForCompare = [];

/* ════════════════════════════════════════
   초기화
════════════════════════════════════════ */
function init() {
  // 1) Firebase에서 클라우드 파라미터 로드
  db.collection('settings').doc('params').get()
    .then(function (doc) {
      if (doc.exists) {
        var saved = doc.data();
        ['현장주간', '현장교대', '기획주간'].forEach(function (type) {
          if (saved[type]) {
            if (saved[type].weights) {
              cloudParams[type].weights = saved[type].weights;
              params[type].weights = JSON.parse(JSON.stringify(saved[type].weights));
            }
            if (saved[type].bands) {
              cloudParams[type].bands = saved[type].bands;
              params[type].bands = JSON.parse(JSON.stringify(saved[type].bands));
            }
          }
        });
      }
      renderAllParamPanels();
      updateWeightLabels();
      applyParamMode();
    })
    .catch(function (err) {
      console.error('클라우드 파라미터 로드 실패:', err);
      renderAllParamPanels();
      updateWeightLabels();
      applyParamMode();
    });

  updateHistoryBadge();

  // 2) Firebase 실시간 리스너 — 채용 이력
  db.collection('hire_history')
    .orderBy('id', 'desc')
    .onSnapshot(function (snapshot) {
      evalHistory = snapshot.docs.map(function (doc) { return doc.data(); });
      renderHistoryTable();
      updateHistoryBadge();
      updateCompareButton();
    }, function (err) {
      console.error('Firebase 연결 오류:', err);
    });
}

/* ════════════════════════════════════════
   네비게이션
════════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
  document.getElementById('page-' + id).classList.add('active');
  document.getElementById('nav-' + id).classList.add('active');
}

/* ════════════════════════════════════════
   평가 입력 — 직무유형
════════════════════════════════════════ */
function selectJobType(type, el) {
  selectedJobType = type;
  document.querySelectorAll('.jobtype-card').forEach(function (c) { c.classList.remove('selected'); });
  el.classList.add('selected');
  updateWeightLabels();
}

/* ════════════════════════════════════════
   평가 입력 — 라디오
════════════════════════════════════════ */
function selectRadio(key, val, el) {
  document.querySelectorAll('[name=' + key + ']').forEach(function (r) {
    r.closest('.radio-option').classList.remove('selected');
  });
  el.classList.add('selected');
  scores[key] = val;
}

/* ════════════════════════════════════════
   평가 입력 — 경력 태그
════════════════════════════════════════ */
function updateExpTag() {
  expYearsVal = parseInt(document.getElementById('exp-years').value) || 0;
  expMonthsVal = parseInt(document.getElementById('exp-months').value) || 0;
  var total = expYearsVal + expMonthsVal / 12;
  var wrap = document.getElementById('exp-tag-wrap');
  if (expYearsVal === 0 && expMonthsVal === 0) { wrap.innerHTML = ''; scores.exp = null; return; }
  var cls, txt;
  if (total < 3) { cls = 'low'; txt = '신입~초급 (0~2년)'; }
  else if (total < 6) { cls = 'mid'; txt = '중급 (3~5년)'; }
  else if (total < 10) { cls = 'high'; txt = '고급 (6~9년)'; }
  else { cls = 'top'; txt = '베테랑 (10년 이상)'; }
  wrap.innerHTML = '<span class="exp-tag ' + cls + '">' + txt + '</span>';
  if (total <= 0) scores.exp = 0;
  else if (total < 3) scores.exp = Math.round((total / 3) * 25);
  else if (total < 6) scores.exp = 25 + Math.round(((total - 3) / 3) * 25);
  else if (total < 10) scores.exp = 50 + Math.round(((total - 6) / 4) * 25);
  else scores.exp = 100;
}

/* ════════════════════════════════════════
   계산
════════════════════════════════════════ */
function calculate() {
  updateExpTag();
  var name = document.getElementById('input-name').value.trim();
  var part = document.getElementById('input-part').value.trim();
  var msg = document.getElementById('validation-msg');
  var errors = [];
  if (!selectedJobType) errors.push('직무유형을 선택해 주세요.');
  if (scores.edu === null) errors.push('학력을 선택해 주세요.');
  if (scores.exp === null) errors.push('경력 연수를 입력해 주세요.');
  if (scores.skill === null) errors.push('업무 전문성을 선택해 주세요.');
  if (scores.rel === null) errors.push('과거 이력 관련성을 선택해 주세요.');
  if (scores.cont === null) errors.push('경력 지속성을 선택해 주세요.');
  if (errors.length > 0) {
    msg.style.display = 'block';
    msg.innerHTML = '⚠ ' + errors.join('  ·  ');
    msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  msg.style.display = 'none';

  var w = params[selectedJobType].weights;
  var raw = {
    edu: [0, 25, 50, 75, 100][scores.edu],
    exp: scores.exp,
    skill: [0, 33, 67, 100][scores.skill],
    rel: [0, 33, 67, 100][scores.rel],
    cont: [0, 33, 67, 100][scores.cont]
  };
  var total = 0;
  for (var k in raw) total += raw[k] * w[k] / 100;
  total = Math.round(total);

  var bands = params[selectedJobType].bands;
  var band = bands[0];
  for (var i = 0; i < bands.length; i++) {
    if (total >= bands[i].min && total <= bands[i].max) { band = bands[i]; break; }
  }
  var recSalary = Math.round((band.lo + band.hi) / 2 / 100) * 100;
  var expStr = expYearsVal + '년' + (expMonthsVal > 0 ? ' ' + expMonthsVal + '개월' : '');

  currentResult = {
    id: Date.now(),
    name: name || '(이름 미입력)',
    part: part || '(파트 미입력)',
    jobType: selectedJobType,
    scores: { edu: scores.edu, exp: expStr, skill: scores.skill, rel: scores.rel, cont: scores.cont },
    raw: raw,
    weights: JSON.parse(JSON.stringify(w)),
    total: total,
    grade: band.grade,
    band: { lo: band.lo, hi: band.hi, label: band.label },
    recSalary: recSalary,
    date: new Date().toLocaleDateString('ko-KR')
  };

  showPage('result');
  setTimeout(function () { renderResult(currentResult); }, 80);
}

/* ════════════════════════════════════════
   결과 렌더링
════════════════════════════════════════ */
function renderResult(r) {
  var infoHTML = '';
  if (r.name !== '(이름 미입력)') infoHTML += '<div class="res-info-item">이름: <strong>' + r.name + '</strong></div>';
  if (r.part !== '(파트 미입력)') infoHTML += '<div class="res-info-item">파트: <strong>' + r.part + '</strong></div>';
  infoHTML += '<div class="res-info-item">직무유형: <span class="res-info-tag" style="' + JT_TAG_STYLE[r.jobType] + '">' + r.jobType + '</span></div>';
  infoHTML += '<div class="res-info-item" style="margin-left:auto;color:#94a3b8;">평가일: ' + r.date + '</div>';
  document.getElementById('res-info-bar').innerHTML = infoHTML;

  var circ = 2 * Math.PI * 68;
  var arc = document.getElementById('score-arc');
  arc.style.strokeDashoffset = circ - (r.total / 100) * circ;
  arc.style.stroke = JT_COLORS[r.jobType] || '#0d9488';
  document.getElementById('res-score').textContent = r.total;

  var gEl = document.getElementById('res-grade');
  gEl.textContent = GRADE_NAMES[r.grade];
  gEl.style.cssText = GRADE_STYLE[r.grade] + ';padding:6px 20px;border-radius:20px;font-size:15px;font-weight:600;';

  document.getElementById('res-salary-band').textContent =
    r.band.lo.toLocaleString() + '만원  ~  ' + r.band.hi.toLocaleString() + '만원';
  document.getElementById('res-salary-rec').textContent = r.recSalary.toLocaleString() + '만원';

  var bands = params[r.jobType].bands;
  var allMin = bands[0].lo;
  var allMax = bands[bands.length - 1].hi;
  var barsHTML = '';
  bands.forEach(function (b) {
    var isActive = b.grade === r.grade;
    var loP = ((b.lo - allMin) / (allMax - allMin) * 100).toFixed(1);
    var wPct = ((b.hi - b.lo) / (allMax - allMin) * 100).toFixed(1);
    var color = isActive ? (JT_COLORS[r.jobType] || '#0d9488') : '#e2e8f0';
    barsHTML +=
      '<div class="band-row">' +
      '<div class="band-label" style="font-weight:' + (isActive ? '600' : '400') + ';color:' + (isActive ? '#1a202c' : '#94a3b8') + '">' + b.label + '</div>' +
      '<div class="band-bar-wrap"><div class="band-bar" style="width:' + wPct + '%;margin-left:' + loP + '%;background:' + color + ';"></div></div>' +
      '<div class="band-val" style="font-weight:' + (isActive ? '600' : '400') + ';color:' + (isActive ? '#1a202c' : '#94a3b8') + '">' + b.lo.toLocaleString() + '~' + b.hi.toLocaleString() + '</div>' +
      '</div>';
  });
  document.getElementById('band-bars-wrap').innerHTML = barsHTML;

  var wt = r.weights;
  var breakHTML = '';
  ['exp', 'skill', 'rel', 'edu', 'cont'].forEach(function (k) {
    var s = Math.round(r.raw[k]);
    var contrib = Math.round(r.raw[k] * wt[k] / 100);
    var bc = s >= 75 ? '#0d9488' : s >= 50 ? '#3b82f6' : s >= 33 ? '#f59e0b' : '#ef4444';
    breakHTML +=
      '<div class="factor-row">' +
      '<div class="factor-name">' + FACTOR_NAMES[k] + ' <span style="font-size:11px;color:#94a3b8;">(' + wt[k] + '%)</span></div>' +
      '<div class="factor-bar-wrap"><div class="factor-bar" style="width:' + s + '%;background:' + bc + ';"></div></div>' +
      '<div class="factor-score">' + s + '점</div>' +
      '<div class="factor-contrib" style="color:#94a3b8;">+' + contrib + '</div>' +
      '</div>';
  });
  document.getElementById('factor-breakdown').innerHTML = breakHTML;

  var summaries = {
    S: '전체적으로 탁월한 역량을 보유한 지원자입니다. 즉시 투입이 가능하며 장기 계약 또는 정규직 전환 검토를 권장합니다.',
    A: '우수한 역량을 갖춘 지원자로 대부분의 업무를 독립적으로 수행할 수 있습니다. 적극적인 채용을 권장합니다.',
    B: '양호한 수준의 역량을 보유하고 있습니다. 일부 교육 지원 시 충분한 성과를 기대할 수 있습니다.',
    C: '기본적인 역량은 갖추고 있으나 보완이 필요합니다. 채용 시 온보딩 계획을 별도로 수립하는 것을 권장합니다.',
    D: '역량 면에서 보완이 많이 필요합니다. 직무 적합성을 재검토하거나 수습 기간을 충분히 확보하시기 바랍니다.'
  };
  var topKey = Object.keys(r.raw).reduce(function (a, b) { return r.raw[a] > r.raw[b] ? a : b; });
  var botKey = Object.keys(r.raw).reduce(function (a, b) { return r.raw[a] < r.raw[b] ? a : b; });
  var nameTag = r.name !== '(이름 미입력)' ? '<strong>' + r.name + '</strong> 지원자의 ' : '지원자의 ';
  document.getElementById('eval-summary-text').innerHTML =
    nameTag + '<strong>' + r.jobType + '</strong> 직무 평가 결과입니다. ' + summaries[r.grade] +
    ' 강점 항목은 <strong>' + FACTOR_NAMES[topKey] + '</strong>이며, <strong>' + FACTOR_NAMES[botKey] + '</strong> 부분의 보완을 고려하시기 바랍니다.';
}

/* ════════════════════════════════════════
   이력 저장 — Firebase
════════════════════════════════════════ */
function saveToHistory() {
  if (!currentResult) return;
  var toast = document.getElementById('save-history-toast');
  var dup = evalHistory.some(function (h) { return h.id === currentResult.id; });
  if (dup) {
    toast.textContent = '이미 저장된 이력입니다.';
    toast.style.color = '#f59e0b';
    setTimeout(function () { toast.textContent = ''; }, 2500);
    return;
  }
  db.collection('hire_history')
    .doc(String(currentResult.id))
    .set(currentResult)
    .then(function () {
      toast.textContent = '✓ 이력에 저장되었습니다';
      toast.style.color = '#0b7a70';
      setTimeout(function () { toast.textContent = ''; }, 2500);
    })
    .catch(function (err) {
      toast.textContent = '저장 실패: ' + err.message;
      toast.style.color = '#e53e3e';
      setTimeout(function () { toast.textContent = ''; }, 3000);
    });
}

/* ════════════════════════════════════════
   이력 삭제 — Firebase
════════════════════════════════════════ */
function deleteHistoryItem(id) {
  if (!confirm('이 이력을 삭제하시겠습니까?')) return;
  db.collection('hire_history')
    .doc(String(id))
    .delete()
    .then(function () {
      selectedForCompare = selectedForCompare.filter(function (i) { return i !== id; });
      updateCompareButton();
    })
    .catch(function (err) {
      alert('삭제 실패: ' + err.message);
    });
}

/* ════════════════════════════════════════
   이력 전체 삭제 — Firebase
════════════════════════════════════════ */
function clearAllHistory() {
  if (evalHistory.length === 0) {
    alert('삭제할 이력이 없습니다.');
    return;
  }
  if (!confirm('모든 평가 이력(' + evalHistory.length + '건)을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;

  var batch = db.batch();
  evalHistory.forEach(function (h) {
    var docRef = db.collection('hire_history').doc(String(h.id));
    batch.delete(docRef);
  });
  batch.commit()
    .then(function () {
      selectedForCompare = [];
      updateCompareButton();
    })
    .catch(function (err) {
      alert('전체 삭제 실패: ' + err.message);
    });
}

/* ════════════════════════════════════════
   이력 테이블 렌더링
════════════════════════════════════════ */
function renderHistoryTable() {
  var wrap = document.getElementById('history-table-wrap');
  if (evalHistory.length === 0) {
    wrap.innerHTML = '<div class="history-empty">📋 저장된 평가 이력이 없습니다.<br>평가 완료 후 <strong>이력 저장</strong> 버튼을 눌러 저장하세요.</div>';
    return;
  }
  var html = '<table class="history-table"><thead><tr>' +
    '<th style="width:40px;text-align:center;"></th>' +
    '<th>이름</th><th>파트</th><th>직무유형</th>' +
    '<th>종합점수</th><th>등급</th><th>추천연봉</th><th>확정연봉</th><th>평가일</th><th></th>' +
    '</tr></thead><tbody>';
  evalHistory.forEach(function (h) {
    var isSel = selectedForCompare.indexOf(h.id) >= 0;
    var jtStyle = JT_TAG_STYLE[h.jobType] || '';
    var confirmedVal = h.confirmedSalary || '';
    html +=
      '<tr id="row-' + h.id + '" class="' + (isSel ? 'sel-row' : '') + '">' +
      '<td style="text-align:center;"><input type="checkbox" class="h-chk" id="chk-' + h.id + '" ' + (isSel ? 'checked' : '') + ' onchange="toggleCompareSelect(' + h.id + ')"></td>' +
      '<td style="font-weight:600;">' + h.name + '</td>' +
      '<td>' + h.part + '</td>' +
      '<td><span style="' + jtStyle + ';padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">' + h.jobType + '</span></td>' +
      '<td><span class="h-score" style="color:' + (JT_COLORS[h.jobType] || '#0d9488') + '">' + h.total + '점</span></td>' +
      '<td><span class="h-grade-badge" style="' + GRADE_STYLE[h.grade] + '">' + h.grade + '등급</span></td>' +
      '<td>' + h.recSalary.toLocaleString() + '만원</td>' +
      '<td><div class="confirmed-salary-wrap"><input type="number" class="confirmed-salary-input" id="cs-' + h.id + '" value="' + confirmedVal + '" placeholder="-" step="100" onchange="saveConfirmedSalary(' + h.id + ', this.value)"><span class="confirmed-salary-unit">만원</span></div></td>' +
      '<td style="color:#94a3b8;font-size:12px;">' + h.date + '</td>' +
      '<td><button class="h-del-btn" onclick="deleteHistoryItem(' + h.id + ')">삭제</button></td>' +
      '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function updateHistoryBadge() {
  var badge = document.getElementById('history-badge');
  if (evalHistory.length > 0) {
    badge.textContent = evalHistory.length;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

/* ════════════════════════════════════════
   확정 연봉 자동 저장 — Firebase
════════════════════════════════════════ */
var salaryAutoSaveTimer = null;
function saveConfirmedSalary(id, value) {
  clearTimeout(salaryAutoSaveTimer);
  salaryAutoSaveTimer = setTimeout(function () {
    var salaryVal = parseInt(value) || 0;
    var updateData = { confirmedSalary: salaryVal > 0 ? salaryVal : null };
    db.collection('hire_history')
      .doc(String(id))
      .update(updateData)
      .then(function () {
        var inputEl = document.getElementById('cs-' + id);
        if (inputEl) {
          inputEl.style.borderColor = '#0d9488';
          setTimeout(function () { inputEl.style.borderColor = ''; }, 1200);
        }
      })
      .catch(function (err) {
        console.error('확정 연봉 저장 실패:', err);
      });
  }, 500);
}

/* ════════════════════════════════════════
   비교 선택
════════════════════════════════════════ */
function toggleCompareSelect(id) {
  var idx = selectedForCompare.indexOf(id);
  if (idx >= 0) {
    selectedForCompare.splice(idx, 1);
    var row = document.getElementById('row-' + id);
    if (row) row.classList.remove('sel-row');
  } else {
    if (selectedForCompare.length >= 4) {
      alert('최대 4명까지 비교 가능합니다.');
      var chk = document.getElementById('chk-' + id);
      if (chk) chk.checked = false;
      return;
    }
    selectedForCompare.push(id);
    var row2 = document.getElementById('row-' + id);
    if (row2) row2.classList.add('sel-row');
  }
  updateCompareButton();
}

function updateCompareButton() {
  var btn = document.getElementById('btn-compare');
  var hint = document.getElementById('compare-hint');
  var n = selectedForCompare.length;
  if (n >= 2) {
    btn.disabled = false;
    hint.textContent = n + '명 선택됨 — 비교하기 버튼을 눌러주세요';
    hint.style.color = '#0b7a70';
  } else {
    btn.disabled = true;
    hint.textContent = '비교할 지원자를 2명 이상 선택하세요 (최대 4명)';
    hint.style.color = '#64748b';
  }
}

/* ════════════════════════════════════════
   비교 렌더링
════════════════════════════════════════ */
function goToCompare() {
  if (selectedForCompare.length < 2) return;
  var candidates = selectedForCompare
    .map(function (id) { return evalHistory.find(function (h) { return h.id === id; }); })
    .filter(Boolean);
  renderComparison(candidates);
  showPage('compare');
}

function renderComparison(candidates) {
  var n = candidates.length;
  var bestTotal = Math.max.apply(null, candidates.map(function (c) { return c.total; }));
  var maxRaw = {};
  ['edu', 'exp', 'skill', 'rel', 'cont'].forEach(function (k) {
    maxRaw[k] = Math.max.apply(null, candidates.map(function (c) { return Math.round(c.raw[k]); }));
  });
  var factorTextFn = {
    edu: function (c) { return EDU_LABELS[c.scores.edu] || '—'; },
    exp: function (c) { return c.scores.exp || '—'; },
    skill: function (c) { return SKILL_LABELS[c.scores.skill] || '—'; },
    rel: function (c) { return REL_LABELS[c.scores.rel] || '—'; },
    cont: function (c) { return CONT_LABELS[c.scores.cont] || '—'; }
  };
  function bc(c) { return c.total === bestTotal ? ' best-col' : ''; }

  var html = '<button class="btn-reset compare-back-btn" onclick="showPage(\'history\')">← 이력으로 돌아가기</button>';
  html += '<div class="compare-table-wrap"><table class="compare-table">';

  // 헤더
  html += '<thead><tr><th class="row-header"></th>';
  candidates.forEach(function (c) {
    var isBest = c.total === bestTotal;
    html += '<th class="cand-header' + bc(c) + '">';
    if (isBest) html += '<div class="cand-best-label">⭐ 최고점</div>';
    html += '<div class="cand-name">' + c.name + '</div>';
    html += '<div class="cand-part">' + c.part + '</div>';
    html += '<div style="margin-top:6px;"><span style="' + (JT_TAG_STYLE[c.jobType] || '') + ';padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">' + c.jobType + '</span></div>';
    html += '</th>';
  });
  html += '</tr></thead><tbody>';

  // 종합 평가 섹션
  html += '<tr class="sec-row"><td>종합 평가</td>' + repeatTd(n, '') + '</tr>';
  html += '<tr><th class="row-header">종합 점수</th>';
  candidates.forEach(function (c) {
    html += '<td class="' + (c.total === bestTotal ? 'best-col' : '') + '"><div class="score-big ' + (c.total === bestTotal ? 'best' : '') + '">' + c.total + '</div><div class="score-out">/ 100</div></td>';
  });
  html += '</tr><tr><th class="row-header">등급</th>';
  candidates.forEach(function (c) {
    html += '<td class="' + (c.total === bestTotal ? 'best-col' : '') + '"><span class="grade-badge" style="' + GRADE_STYLE[c.grade] + '">' + GRADE_NAMES[c.grade] + '</span></td>';
  });
  html += '</tr>';

  // 항목별 점수 섹션
  html += '<tr class="sec-row"><td>항목별 점수</td>' + repeatTd(n, '') + '</tr>';
  ['edu', 'exp', 'skill', 'rel', 'cont'].forEach(function (k) {
    html += '<tr><th class="row-header">' + FACTOR_NAMES[k] + '</th>';
    candidates.forEach(function (c) {
      var s = Math.round(c.raw[k]);
      var isTopFactor = s === maxRaw[k] && s > 0;
      var barColor = s >= 75 ? '#0d9488' : s >= 50 ? '#3b82f6' : s >= 33 ? '#f59e0b' : '#ef4444';
      html += '<td class="' + (c.total === bestTotal ? 'best-col' : '') + '">' +
        '<div style="font-size:13px;font-weight:' + (isTopFactor ? '700' : '400') + ';color:' + (isTopFactor ? barColor : '#374151') + ';">' + factorTextFn[k](c) + '</div>' +
        '<div style="font-size:11px;color:#94a3b8;margin-top:2px;">' + s + '점</div>' +
        '<div class="mini-bar-wrap"><div class="mini-bar" style="width:' + s + '%;background:' + barColor + ';"></div></div>' +
        '</td>';
    });
    html += '</tr>';
  });

  // 연봉 섹션
  html += '<tr class="sec-row"><td>연봉</td>' + repeatTd(n, '') + '</tr>';
  html += '<tr><th class="row-header">연봉 범위</th>';
  candidates.forEach(function (c) {
    html += '<td class="' + (c.total === bestTotal ? 'best-col' : '') + '" style="font-size:13px;">' + c.band.lo.toLocaleString() + ' ~ ' + c.band.hi.toLocaleString() + '만원</td>';
  });
  html += '</tr>';
  var maxRec = Math.max.apply(null, candidates.map(function (c) { return c.recSalary; }));
  html += '<tr><th class="row-header">추천 연봉</th>';
  candidates.forEach(function (c) {
    html += '<td class="' + (c.total === bestTotal ? 'best-col' : '') + '" style="font-size:18px;font-weight:700;color:' + (c.recSalary === maxRec ? '#0b7a70' : '#374151') + ';">' + c.recSalary.toLocaleString() + '만원</td>';
  });
  html += '</tr><tr><th class="row-header">평가일</th>';
  candidates.forEach(function (c) {
    html += '<td class="' + (c.total === bestTotal ? 'best-col' : '') + '" style="color:#94a3b8;font-size:12px;">' + c.date + '</td>';
  });
  html += '</tr></tbody></table></div>';
  html += '<div style="margin-top:12px;"><button class="btn-export" onclick="exportCSV()">📥 비교 결과 엑셀 다운로드</button></div>';
  document.getElementById('compare-content').innerHTML = html;
}

function repeatTd(n, content) {
  var s = '';
  for (var i = 0; i < n; i++) s += '<td>' + content + '</td>';
  return s;
}

/* ════════════════════════════════════════
   CSV 내보내기
════════════════════════════════════════ */
function exportCSV() {
  if (evalHistory.length === 0) { alert('저장된 이력이 없습니다.'); return; }
  var headers = ['이름', '파트', '직무유형', '종합점수', '등급', '추천연봉(만원)', '확정연봉(만원)', '연봉범위', '학력', '경력', '업무전문성', '이력관련성', '경력지속성', '평가일'];
  var rows = evalHistory.map(function (h) {
    return [
      h.name, h.part, h.jobType, h.total, h.grade, h.recSalary,
      h.confirmedSalary || '',
      h.band.lo + '~' + h.band.hi,
      EDU_LABELS[h.scores.edu] || '',
      h.scores.exp,
      SKILL_LABELS[h.scores.skill] || '',
      REL_LABELS[h.scores.rel] || '',
      CONT_LABELS[h.scores.cont] || '',
      h.date
    ];
  });
  var csv = [headers].concat(rows).map(function (r) {
    return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = '채용평가이력_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════
   폼 초기화
════════════════════════════════════════ */
function resetEval() {
  scores = { edu: null, exp: null, skill: null, rel: null, cont: null };
  selectedJobType = null;
  currentResult = null;
  document.querySelectorAll('.radio-option').forEach(function (el) { el.classList.remove('selected'); });
  document.querySelectorAll('.jobtype-card').forEach(function (el) { el.classList.remove('selected'); });
  document.getElementById('exp-years').value = '';
  document.getElementById('exp-months').value = '';
  document.getElementById('exp-tag-wrap').innerHTML = '';
  document.getElementById('input-name').value = '';
  document.getElementById('input-part').value = '';
  updateWeightLabels();
  showPage('eval');
}

/* ════════════════════════════════════════
   재계산 — 파라미터 변경 후 동일 입력으로 결과 갱신
════════════════════════════════════════ */
function recalculate() {
  if (!selectedJobType || scores.edu === null) {
    alert('재계산할 입력값이 없습니다. 먼저 평가 입력을 완료해 주세요.');
    return;
  }
  calculate();
}

/* ════════════════════════════════════════
   파라미터 — 탭 전환
════════════════════════════════════════ */
function switchParamTab(type, el) {
  document.querySelectorAll('.param-type-tab').forEach(function (t) { t.classList.remove('active'); });
  document.querySelectorAll('.param-panel').forEach(function (p) { p.classList.remove('active'); });
  el.classList.add('active');
  document.getElementById('param-panel-' + type).classList.add('active');
}

/* ════════════════════════════════════════
   파라미터 — 패널 렌더링
════════════════════════════════════════ */
function renderParamPanel(type) {
  var p = params[type];
  var w = p.weights;
  var totalW = 0;
  for (var k in w) totalW += w[k];
  var wOk = totalW === 100;
  var html = '<div class="param-inner-grid">';

  html += '<div class="card"><div class="card-title">항목별 가중치 <span class="badge badge-teal">합계 100%</span></div>';
  [['exp', '총 경력 연수'], ['skill', '업무 전문성'], ['rel', '과거 이력 관련성'], ['edu', '학력'], ['cont', '경력 지속성']].forEach(function (kv) {
    var k = kv[0], label = kv[1];
    html += '<div class="weight-row"><div class="weight-name">' + label + '</div>' +
      '<div class="weight-slider"><input type="range" min="0" max="100" step="5" value="' + w[k] + '" id="ws-' + type + '-' + k + '" oninput="onWeightChange(\'' + type + '\')"></div>' +
      '<div class="weight-val" id="wv-' + type + '-' + k + '">' + w[k] + '%</div></div>';
  });
  html += '<div class="weight-total ' + (wOk ? 'ok' : 'warn') + '" id="wt-' + type + '">';
  html += wOk ? '✓ 합계: <strong>100%</strong> — 정상' : '⚠ 합계: <strong>' + totalW + '%</strong> — 100%로 맞춰주세요';
  html += '</div></div>';

  html += '<div class="card"><div class="card-title">점수 구간별 연봉</div><table class="band-table"><thead><tr><th>점수 구간</th><th>등급</th><th>최소 (만원)</th><th>최대 (만원)</th></tr></thead><tbody>';
  p.bands.forEach(function (b, i) {
    html += '<tr><td>' + b.label + '</td>' +
      '<td><span class="grade-badge" style="' + GRADE_STYLE[b.grade] + '">' + b.grade + '등급</span></td>' +
      '<td><input class="band-input" type="number" value="' + b.lo + '" id="band-' + type + '-lo-' + i + '" step="100"> <span class="band-unit">만원</span></td>' +
      '<td><input class="band-input" type="number" value="' + b.hi + '" id="band-' + type + '-hi-' + i + '" step="100"> <span class="band-unit">만원</span></td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="param-guide"><div class="param-guide-title">💡 설정 안내</div><div class="param-guide-list">' +
    '<div>· 직무유형별로 가중치와 연봉 구간이 <strong>독립적으로 적용</strong>됩니다.</div>' +
    '<div>· 각 항목의 가중치는 0~100 사이로 설정하되, <strong>합계가 반드시 100%</strong>가 되어야 합니다.</div>' +
    '<div>· 가중치를 <strong>0으로 설정</strong>하면 해당 항목은 계산에서 제외됩니다.</div>' +
    '<div>· 설정 변경 후 반드시 하단 <strong>[설정 저장]</strong> 버튼을 눌러야 반영됩니다.</div>' +
    '</div></div>';
  html += '</div>';
  document.getElementById('param-panel-' + type).innerHTML = html;
}

function renderAllParamPanels() {
  ['현장주간', '현장교대', '기획주간'].forEach(function (t) { renderParamPanel(t); });
}

/* ════════════════════════════════════════
   파라미터 — 가중치 변경
════════════════════════════════════════ */
function onWeightChange(type) {
  var keys = ['exp', 'skill', 'rel', 'edu', 'cont'];
  var total = 0;
  keys.forEach(function (k) {
    var v = parseInt(document.getElementById('ws-' + type + '-' + k).value) || 0;
    params[type].weights[k] = v;
    document.getElementById('wv-' + type + '-' + k).textContent = v + '%';
    total += v;
  });
  var msg = document.getElementById('wt-' + type);
  if (total === 100) {
    msg.className = 'weight-total ok';
    msg.innerHTML = '✓ 합계: <strong>100%</strong> — 정상';
  } else {
    msg.className = 'weight-total warn';
    msg.innerHTML = '⚠ 합계: <strong>' + total + '%</strong> — 100%로 맞춰주세요';
  }
}

/* ════════════════════════════════════════
   파라미터 — 로컬 테스트 저장
════════════════════════════════════════ */
function collectParamsFromUI() {
  ['현장주간', '현장교대', '기획주간'].forEach(function (type) {
    ['exp', 'skill', 'rel', 'edu', 'cont'].forEach(function (k) {
      var el = document.getElementById('ws-' + type + '-' + k);
      if (el) params[type].weights[k] = parseInt(el.value) || 0;
    });
    params[type].bands.forEach(function (b, i) {
      var lo = parseInt(document.getElementById('band-' + type + '-lo-' + i).value);
      var hi = parseInt(document.getElementById('band-' + type + '-hi-' + i).value);
      if (!isNaN(lo)) b.lo = lo;
      if (!isNaN(hi)) b.hi = hi;
    });
  });
}

function saveParams() {
  if (!testMode) return;
  collectParamsFromUI();
  updateWeightLabels();
  showToast('✓ 테스트 값이 로컬에 적용되었습니다', '#0b7a70');
}

/* ════════════════════════════════════════
   파라미터 — 클라우드 저장
════════════════════════════════════════ */
function saveParamsToCloud() {
  if (!testMode) return;
  collectParamsFromUI();
  if (!confirm('현재 테스트 파라미터를 클라우드에 반영하시겠습니까?\n모든 사용자에게 적용됩니다.')) return;

  db.collection('settings').doc('params').set(JSON.parse(JSON.stringify(params)))
    .then(function () {
      cloudParams = JSON.parse(JSON.stringify(params));
      showToast('✓ 클라우드에 저장 완료! 모든 사용자에게 반영됩니다.', '#2563eb');
    })
    .catch(function (err) {
      showToast('❌ 클라우드 저장 실패: ' + err.message, '#e53e3e');
    });
}

/* ════════════════════════════════════════
   파라미터 — 클라우드 값으로 되돌리기
════════════════════════════════════════ */
function resetTestParams() {
  params = JSON.parse(JSON.stringify(cloudParams));
  renderAllParamPanels();
  updateWeightLabels();
  showToast('↩️ 클라우드 값으로 되돌렸습니다', '#64748b');
}

/* ════════════════════════════════════════
   테스트 모드 전환
════════════════════════════════════════ */
function toggleTestMode(isOn) {
  testMode = isOn;
  if (!isOn) {
    // 운영 모드로 복귀 — 클라우드 값 복원
    params = JSON.parse(JSON.stringify(cloudParams));
    renderAllParamPanels();
    updateWeightLabels();
  }
  applyParamMode();
}

function applyParamMode() {
  var bar = document.getElementById('param-mode-bar');
  var info = document.getElementById('param-mode-info');
  var pageParam = document.getElementById('page-param');
  var btnLocal = document.getElementById('btn-save-local');
  var btnCloud = document.getElementById('btn-save-cloud');
  var btnReset = document.getElementById('btn-reset-test');

  if (testMode) {
    bar.classList.add('test-active');
    info.innerHTML = '<span class="param-mode-icon">🧪</span>' +
      '<span class="param-mode-text"><strong>테스트 모드</strong> — 로컬에서 자유롭게 파라미터를 수정하고, 마음에 들면 클라우드에 반영하세요</span>';
    pageParam.classList.remove('param-readonly');
    btnLocal.style.display = '';
    btnCloud.style.display = '';
    btnReset.style.display = '';
  } else {
    bar.classList.remove('test-active');
    info.innerHTML = '<span class="param-mode-icon">☁️</span>' +
      '<span class="param-mode-text"><strong>운영 모드</strong> — 클라우드에 저장된 공용 파라미터를 사용 중 (읽기 전용)</span>';
    pageParam.classList.add('param-readonly');
    btnLocal.style.display = 'none';
    btnCloud.style.display = 'none';
    btnReset.style.display = 'none';
  }
}

/* ════════════════════════════════════════
   토스트 표시 헬퍼
════════════════════════════════════════ */
function showToast(text, color) {
  var toast = document.getElementById('save-toast');
  toast.textContent = text;
  toast.style.color = color || '#0b7a70';
  toast.style.display = 'inline';
  setTimeout(function () { toast.style.display = 'none'; }, 3000);
}

/* ════════════════════════════════════════
   가중치 라벨 업데이트
════════════════════════════════════════ */
function updateWeightLabels() {
  var type = selectedJobType || '현장주간';
  var w = params[type].weights;
  function setLabel(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val > 0 ? '· 가중치 ' + val + '%' : '· (미적용)';
  }
  setLabel('w-label-edu', w.edu);
  setLabel('w-label-exp', w.exp);
  setLabel('w-label-skill', w.skill);
  setLabel('w-label-rel', w.rel);
  setLabel('w-label-cont', w.cont);
}

/* ════════════════════════════════════════
   시작
════════════════════════════════════════ */
init();
