/**
 * 경력 계산 유틸리티
 * 저장: { years, months, inputDate }
 * 표시: 저장값 + (오늘 - inputDate)로 자동 증가
 */

export function calcCurrentCareer(years, months, inputDate) {
  const input = inputDate ? new Date(inputDate) : new Date()
  const now = new Date()
  const diffMs = now - input
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))

  let totalMonths = years * 12 + months + diffMonths
  if (totalMonths < 0) totalMonths = 0

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
  }
}

export function formatCareer(years, months) {
  if (years === 0 && months === 0) return '신입'
  if (years === 0) return `${months}개월`
  if (months === 0) return `${years}년`
  return `${years}년 ${months}개월`
}

export function totalCareerYears(years, months) {
  return years + months / 12
}

/**
 * 직무유형별 경력등급 판정
 * params: 파라미터 설정에서 가져온 careerLevels 배열
 */
export function getCareerLevel(jobType, totalYears, careerLevels) {
  const levels = careerLevels[jobType]
  if (!levels) return null
  for (const level of levels) {
    if (totalYears >= level.minYears && (level.maxYears === null || totalYears < level.maxYears)) {
      return level
    }
  }
  return levels[levels.length - 1]
}

/**
 * 경력등급 연봉밴드 [하한, 상한)
 * 기준연봉 = 해당 등급의 최저 연봉(하한), 상한 = 다음 등급의 기준연봉(미만)
 * 최상위 등급은 다음 등급이 없으므로 ceiling = null
 * @returns {{ level, floor: number, ceiling: number|null }|null}
 */
export function getCareerRange(jobType, totalYears, careerLevels) {
  const levels = careerLevels[jobType]
  if (!levels || levels.length === 0) return null
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]
    if (totalYears >= level.minYears && (level.maxYears === null || totalYears < level.maxYears)) {
      return { level, floor: level.salary, ceiling: levels[i + 1]?.salary ?? null }
    }
  }
  const last = levels[levels.length - 1]
  return { level: last, floor: last.salary, ceiling: null }
}
