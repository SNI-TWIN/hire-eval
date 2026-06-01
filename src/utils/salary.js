/**
 * 연봉 추천 로직
 * 경력등급 기준표 + 면접등급 → 추천 연봉
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

/**
 * 최종 추천 연봉 계산
 * @param {number} baseSalary  - 경력등급 기준 연봉 (만원)
 * @param {string} grade       - 면접 등급 S/A/B/C/D
 * @param {number} prevSalary  - 기존 연봉 (만원, 0이면 무시)
 * @param {object} gradeRatio  - 파라미터 등급별 배율
 * @returns {number} 추천 연봉 (만원, 100 단위 반올림)
 */
export function calcRecommendedSalary(baseSalary, grade, prevSalary = 0, gradeRatio) {
  if (grade === 'D') return 0
  const ratio = (gradeRatio ?? { S: 1.10, A: 1.05, B: 1.00, C: 0.97 })[grade] ?? 1.0
  let rec = Math.round(baseSalary * ratio / 100) * 100
  if (prevSalary > 0 && prevSalary > rec) {
    const ceiling = Math.round(baseSalary * 1.15 / 100) * 100
    rec = Math.min(prevSalary, ceiling)
  }
  return rec
}
