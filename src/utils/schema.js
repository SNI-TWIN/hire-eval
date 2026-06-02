/**
 * 면접 평가 구조 빌더
 * 파라미터(categories / items / scoring)를 화면에서 쓰기 좋은
 * "카테고리 → 항목 → 선택지" 트리로 묶어준다.
 */
export function buildEvalSchema(params) {
  const categories = params?.categories ?? []
  const items      = params?.items ?? []
  const scoring    = params?.scoring ?? {}
  return categories.map(c => ({
    key: c.key,
    name: c.name,
    items: items
      .filter(it => it.category === c.key)
      .map(it => ({
        key: it.key,
        name: it.name,
        desc: it.desc || '',
        category: it.category,
        options: scoring[it.key] ?? {},
      })),
  }))
}

// 원형 숫자 (카테고리 번호 표시용). 범위 밖이면 (n) 형태로 폴백
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
export function circledNum(i) {
  return CIRCLED[i] ?? `(${i + 1})`
}
