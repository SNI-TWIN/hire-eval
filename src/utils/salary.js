/**
 * 연봉 추천 로직
 * 경력등급 연봉밴드 [하한, 상한) 안에서 면접등급으로 위치를 정함.
 * - 기준연봉 = 해당 경력등급의 최저 연봉(하한)
 * - 상한 = 다음 경력등급의 기준연봉(미만). 추천은 항상 이 범위 안에 있음
 * - 면접등급이 높을수록 밴드 상단, 낮을수록 하단
 * - 기존 연봉은 참고용: 추천보다 높으면 딱 한 등급만 위로 반영(밴드는 못 넘음)
 */

export const GRADE_NAMES = { S: '최우수 (S)', A: '우수 (A)', B: '양호 (B)', C: '보통 (C)', D: '기초 (D)' }
export const GRADE_STYLE = {
  S: { background: '#ede9fe', color: '#5b21b6' },
  A: { background: '#e6faf7', color: '#0b7a70' },
  B: { background: '#dbeafe', color: '#1e40af' },
  C: { background: '#fef9c3', color: '#854d0e' },
  D: { background: '#fef2f2', color: '#9b1c1c' },
}

// 면접 점수 → 등급 (파라미터 기반)
export function calcGrade(total, thresholds) {
  const t = thresholds ?? { S: 90, A: 80, B: 65, C: 55 }
  if (total >= t.S) return 'S'
  if (total >= t.A) return 'A'
  if (total >= t.B) return 'B'
  if (total >= t.C) return 'C'
  return 'D'
}

// 등급 순서 (낮음 → 높음). 기존 연봉 참고 시 한 등급 상향에 사용
const GRADE_ORDER = ['C', 'B', 'A', 'S']
// 최상위 경력등급은 다음 등급이 없으므로, 하한 대비 가상 상한 폭(+10%)
const TOP_BAND_MARGIN = 0.10
// 등급별 밴드 내 위치 기본값 (0 = 하한, 1 = 상한)
const DEFAULT_GRADE_POS = { S: 0.80, A: 0.60, B: 0.40, C: 0.20 }
// 추천액 반올림 단위(만원). 100으로 하면 좁은 밴드에서 등급이 같은 값으로 뭉개짐
const ROUND_UNIT = 10

/**
 * 최종 추천 연봉 계산
 * @param {number} floor       - 해당 경력등급 기준연봉 = 밴드 하한 (만원)
 * @param {number|null} ceiling - 다음 경력등급 기준연봉 = 밴드 상한 (만원). 최상위면 null
 * @param {string} grade       - 면접 등급 S/A/B/C/D
 * @param {number} prevSalary  - 기존 연봉 (만원, 0이면 무시)
 * @param {object} gradePos    - 등급별 밴드 내 위치(0~1)
 * @returns {number} 추천 연봉 (만원, ROUND_UNIT 단위 반올림). D는 0(채용불가)
 */
export function calcRecommendedSalary(floor, ceiling, grade, prevSalary = 0, gradePos) {
  if (grade === 'D' || !floor) return 0

  const pos = gradePos ?? DEFAULT_GRADE_POS
  // 밴드 상한: 다음 등급 기준연봉(없으면 하한 + 가상 폭)
  const top  = ceiling ?? Math.round(floor * (1 + TOP_BAND_MARGIN))
  const band = Math.max(0, top - floor)

  // 면접등급에 따른 밴드 내 위치
  const baseAmt = floor + band * (pos[grade] ?? 0)

  // 기존 연봉이 추천보다 높으면 딱 한 등급만 위로 반영
  let g = grade
  if (prevSalary > 0 && prevSalary > baseAmt) {
    const idx = GRADE_ORDER.indexOf(grade)
    if (idx >= 0 && idx < GRADE_ORDER.length - 1) g = GRADE_ORDER[idx + 1]
  }

  let rec = Math.round((floor + band * (pos[g] ?? 0)) / ROUND_UNIT) * ROUND_UNIT

  // 밴드 [하한, 상한) 보장
  if (rec < floor) rec = floor
  while (ceiling != null && rec >= ceiling) rec -= ROUND_UNIT
  if (rec < floor) rec = floor
  return rec
}
