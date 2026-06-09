import { useState, useMemo } from 'react'

// 엑셀식 정렬+필터 상태 관리 훅
// column 정의: { key, label, get:(item)=>정렬·필터 기준값, text?:(item)=>표시·체크리스트 문자열, align? }

// 숫자가 섞인 값은 숫자 우선, 그 외는 한글 로케일 정렬 (체크리스트 정렬용)
export function smartCompare(a, b) {
  const sa = String(a ?? ''), sb = String(b ?? '')
  const na = parseFloat(sa.replace(/[^0-9.-]/g, '')), nb = parseFloat(sb.replace(/[^0-9.-]/g, ''))
  const aNum = !isNaN(na) && /\d/.test(sa), bNum = !isNaN(nb) && /\d/.test(sb)
  if (aNum && bNum && na !== nb) return na - nb
  return sa.localeCompare(sb, 'ko')
}

export function useGrid(items, columns) {
  const [sort, setSort]       = useState({ key: null, dir: 1 })
  const [filters, setFilters] = useState({})   // { [key]: Set<string> } — 키가 없으면 전체 허용

  const colMap = useMemo(() => Object.fromEntries(columns.map(c => [c.key, c])), [columns])
  const textOf = (col, it) => (col.text ? col.text(it) : String(col.get(it) ?? ''))

  const distinct = (key) => {
    const col = colMap[key]
    return [...new Set(items.map(it => textOf(col, it)))].sort(smartCompare)
  }

  let view = items.filter(it =>
    columns.every(col => {
      const f = filters[col.key]
      if (!f) return true                 // 필터 없음 = 전체
      return f.has(textOf(col, it))
    })
  )
  if (sort.key && colMap[sort.key]) {
    const col = colMap[sort.key]
    view = [...view].sort((a, b) => {
      const av = col.get(a), bv = col.get(b)
      const r = (typeof av === 'number' && typeof bv === 'number')
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''), 'ko')
      return r * sort.dir
    })
  }

  const setColFilter = (key, set) => setFilters(prev => {
    const next = { ...prev }
    if (!set) delete next[key]; else next[key] = set
    return next
  })

  return { view, sort, setSort, filters, setColFilter, distinct }
}
