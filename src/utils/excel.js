import * as XLSX from 'xlsx'
import { CATEGORY_ITEMS, CATEGORY_NAMES, ITEM_NAMES } from './constants'
import { formatCareer, calcCurrentCareer } from './career'

/**
 * 면접 평가표 1건 → 엑셀 다운로드
 * ※ 실제 사용자 양식 파일을 공유받으면 셀 매핑으로 교체 예정
 *   현재는 구조화된 양식을 자체 생성
 */
export function exportEvalSheet(result) {
  const r   = result
  const wb  = XLSX.utils.book_new()
  const cur = r.currentCareer ?? { years: r.careerYears, months: r.careerMonths }

  const rows = [
    ['면접 평가표'],
    [],
    ['지원자 성명', r.name, '', '평가일', r.date],
    ['파트/부서', r.part, '', '직무유형', r.jobType],
    ['경력', formatCareer(cur.years, cur.months), '', '경력등급', r.careerLevel],
    ['기존 연봉', r.prevSalary ? `${r.prevSalary.toLocaleString()}만원` : '—', '', '추천 연봉', r.recSalary ? `${r.recSalary.toLocaleString()}만원` : '채용불가'],
    [],
    ['평가 항목', '세부 항목', '선택 내용', '점수'],
  ]

  Object.entries(CATEGORY_ITEMS).forEach(([cat, items]) => {
    const catScore = r.catScores?.[cat] ?? 0
    rows.push([CATEGORY_NAMES[cat], '', '', catScore + '점 (소계)'])
    items.forEach(itemKey => {
      const sel   = r.selections?.[itemKey] ?? '—'
      const score = r.raw?.[itemKey] ?? 0
      rows.push(['', ITEM_NAMES[itemKey], sel, score])
    })
  })

  rows.push(
    [],
    ['종합 점수', r.total, '', '등급', r.grade],
    [],
    ['종합 의견'],
    [r.grade === 'D'
      ? '채용 불가 (55점 미만)'
      : `${r.name} 지원자 ${r.jobType} 직무 평가 - ${r.grade}등급`
    ],
  )

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // 열 너비 설정
  ws['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 14 }]

  // 타이틀 병합
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }]

  XLSX.utils.book_append_sheet(wb, ws, '면접평가')
  XLSX.writeFile(wb, `면접평가_${r.name}_${r.date.replace(/\./g, '')}.xlsx`)
}

/**
 * 인원 목록 → CSV 다운로드
 */
export function exportPersonnelCSV(employees, candidates) {
  const confirmed = (candidates ?? []).filter(c => c.status === 'confirmed')
  const all = [
    ...employees.map(e => ({ ...e, _type: '재직자' })),
    ...confirmed.map(c => ({ ...c, _type: '채용확정', currentSalary: c.confirmedSalary })),
  ]

  const headers = ['구분', '이름', '파트', '직무유형', '경력(현재)', '경력등급', '현재연봉(만원)', '추천연봉(만원)', '메모']
  const rows = all.map(p => {
    const cur = calcCurrentCareer(p.careerYears, p.careerMonths, p.careerInputDate)
    return [
      p._type,
      p.name,
      p.part,
      p.jobType,
      formatCareer(cur.years, cur.months),
      p.careerLevel ?? '—',
      p.currentSalary || '',
      p.recSalary || '',
      p.memo || '',
    ]
  })

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `인원현황_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
