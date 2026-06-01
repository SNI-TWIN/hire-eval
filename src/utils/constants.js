// ── 직무유형 ──────────────────────────────────
export const JOB_TYPES = ['현장주간', '현장교대', '사무주간']

export const JT_COLOR = {
  '현장주간': '#0d9488',
  '현장교대': '#7c3aed',
  '사무주간': '#0284c7',
}
export const JT_TAG_STYLE = {
  '현장주간': { background: '#e6faf7', color: '#0b7a70' },
  '현장교대': { background: '#ede9fe', color: '#5b21b6' },
  '사무주간': { background: '#dbeafe', color: '#1e40af' },
}

// ── 면접 등급 ─────────────────────────────────
export const GRADE_STYLE = {
  S: { background: '#ede9fe', color: '#5b21b6' },
  A: { background: '#e6faf7', color: '#0b7a70' },
  B: { background: '#dbeafe', color: '#1e40af' },
  C: { background: '#fef9c3', color: '#854d0e' },
  D: { background: '#fef2f2', color: '#9b1c1c' },
}
export const GRADE_NAMES = {
  S: '최우수 (S)', A: '우수 (A)', B: '양호 (B)', C: '보통 (C)', D: '기초 (D)',
}

// ── 평가 항목 레이블 ──────────────────────────
export const CATEGORY_NAMES = {
  jobSkill:       '직무 전문성',
  sincerity:      '성실성',
  adaptability:   '적응력',
  problemSolving: '문제 해결',
}
export const ITEM_NAMES = {
  certification:      '자격증',
  experience:         '실무 경력',
  equipment:          '장비 숙련도',
  education:          '학력',
  careerConsistency:  '이력 일관성',
  punctuality:        '시간 약속',
  preparation:        '준비성',
  communication:      '커뮤니케이션',
  flexibility:        '환경 변화 유연성',
  culture:            '조직 문화 수용성',
  logicalReasoning:   '논리적 원인 추론',
  situationJudgment:  '상황 판단 및 우선순위',
}

// 항목별 부연 설명 (선택적으로 표시)
export const ITEM_DESCRIPTIONS = {
  preparation:       '회사(건물)에 대한 사전조사 및 업종 이해도',
  logicalReasoning:  "현상만 보지 않고 '왜' 발생했는지 근본 원인을 찾아가는 사고 방식",
  situationJudgment: '위급 상황에서 무엇을 먼저 해야 하는지(차단/대피/보고) 결정하는 능력',
}

// ── 기본 파라미터 ─────────────────────────────
export const DEFAULT_PARAMS = {
  // 직무유형별 경력등급 + 기준연봉 (단위: 만원)
  careerLevels: {
    '현장주간': [
      { label: '신입', minYears: 0,  maxYears: 1,    salary: 3200 },
      { label: '초급', minYears: 1,  maxYears: 4,    salary: 3300 },
      { label: '중급', minYears: 4,  maxYears: 8,    salary: 3400 },
      { label: '고급', minYears: 8,  maxYears: 12,   salary: 3650 },
      { label: '특급', minYears: 12, maxYears: null,  salary: 3900 },
    ],
    '현장교대': [
      { label: '신입', minYears: 0,  maxYears: 1,    salary: 3624 },
      { label: '초급', minYears: 1,  maxYears: 4,    salary: 3650 },
      { label: '중급', minYears: 4,  maxYears: 8,    salary: 3800 },
      { label: '고급', minYears: 8,  maxYears: null,  salary: 4030 },
    ],
    '사무주간': [
      { label: '초급', minYears: 0,  maxYears: 4,    salary: 3200 },
      { label: '중급', minYears: 4,  maxYears: 8,    salary: 3700 },
      { label: '고급', minYears: 8,  maxYears: 12,   salary: 4400 },
      { label: '특급', minYears: 12, maxYears: null,  salary: 5300 },
    ],
  },
  // 면접 배점 기준
  scoring: {
    certification: { '기사/기능장': 10, '산업기사': 8, '기능사/수첩/교육': 6 },
    experience:    { '6년 이상': 10, '3~6년': 8, '1~3년': 6 },
    equipment: {
      '장애 발생 시 원인 파악부터 긴급 조치까지 단독 수행 가능': 20,
      '선임자의 지시에 따라 주요 장비를 무리 없이 조작 가능': 16,
      '장비 명칭과 기본 원리만 알고 있는 수준': 12,
    },
    education:     { '대학원/대졸': 10, '전문대졸': 8, '고졸': 6 },
    careerConsistency: { '3년 이상': 10, '2~3년 미만': 5, '1~2년 미만': 0 },
    punctuality:   { '10분 전': 2, '5분 전~정각': 1, '지각': -5 },
    preparation:   { '상': 8, '중': 6, '하': 0 },
    communication: { '상': 10, '중': 5, '하': 0 },
    flexibility:   { '상': 5, '중': 3, '하': 0 },
    culture:       { '상': 5, '중': 3, '하': 0 },
    logicalReasoning:  { '상': 5, '중': 3, '하': 0 },
    situationJudgment: { '상': 5, '중': 3, '하': 0 },
  },
  // 면접 등급 기준
  gradeThresholds: { S: 90, A: 80, B: 65, C: 55 },
  // 등급별 연봉 배율
  gradeRatio: { S: 1.10, A: 1.05, B: 1.00, C: 0.97 },
}

// 카테고리별 항목 구성
export const CATEGORY_ITEMS = {
  jobSkill:      ['certification', 'experience', 'equipment', 'education'],
  sincerity:     ['careerConsistency', 'punctuality', 'preparation'],
  adaptability:  ['communication', 'flexibility', 'culture'],
  problemSolving:['logicalReasoning', 'situationJudgment'],
}
