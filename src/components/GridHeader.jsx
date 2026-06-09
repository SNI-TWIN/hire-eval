import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Filter, ArrowUp, ArrowDown } from 'lucide-react'

// 엑셀 데이터 필터 스타일의 정렬+필터 헤더 셀
// - 헤더 제목을 클릭하면 그 자리에 팝업 메뉴가 열림 (정렬 ▲▼ + 값 체크리스트)
// - 모든 데이터 열에 동일하게 적용해 일관성 확보
// - 팝업은 portal(fixed)로 띄워 표의 가로 스크롤 영역에 잘리지 않게 함
// 정렬·필터 상태 로직은 utils/useGrid 참고

const menuItem = (active) => ({
  display: 'block', width: '100%', textAlign: 'left',
  background: active ? '#f5f3ff' : 'transparent', border: 'none', cursor: 'pointer',
  padding: '7px 8px', borderRadius: 6, fontSize: 13,
  color: active ? '#6d28d9' : '#374151', fontFamily: 'inherit',
})
const linkBtn = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed',
  fontSize: 11, fontFamily: 'inherit', padding: 2, fontWeight: 600,
}

export function GridTH({ col, grid }) {
  const align = col.align === 'right' ? 'right' : 'left'
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState(null)
  const [q, setQ]       = useState('')
  const btnRef = useRef(null)

  const openMenu = () => {
    if (open) { setOpen(false); return }
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right })
    setQ('')
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => { window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true) }
  }, [open])

  const options    = grid.distinct(col.key)
  const current    = grid.filters[col.key]            // Set | undefined
  const allChecked = !current
  const isChecked  = (v) => allChecked || current.has(v)
  const shown      = options.filter(v => v.toLowerCase().includes(q.toLowerCase()))
  const sortedAsc  = grid.sort.key === col.key && grid.sort.dir === 1
  const sortedDesc = grid.sort.key === col.key && grid.sort.dir === -1
  const hasFilter  = !!current
  const accent     = hasFilter || sortedAsc || sortedDesc

  const toggleValue = (v) => {
    const base = current ? new Set(current) : new Set(options)
    if (base.has(v)) base.delete(v); else base.add(v)
    grid.setColFilter(col.key, base.size === options.length ? null : base)
  }

  return (
    <th style={{ whiteSpace: 'nowrap' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, width: '100%',
          justifyContent: align === 'right' ? 'flex-end' : 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          font: 'inherit', fontWeight: 500, color: accent ? '#6d28d9' : 'inherit',
        }}
        title="클릭: 정렬 / 필터"
      >
        <span>{col.label}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', color: accent ? '#7c3aed' : '#94a3b8' }}>
          {sortedAsc && <ArrowUp size={12} />}
          {sortedDesc && <ArrowDown size={12} />}
          {hasFilter ? <Filter size={12} fill="#7c3aed" /> : <ChevronDown size={12} />}
        </span>
      </button>

      {open && pos && createPortal(
        <>
          <div onMouseDown={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <div style={{
            position: 'fixed', top: pos.top, zIndex: 1001,
            ...(align === 'right' ? { right: pos.right } : { left: pos.left }),
            minWidth: 210, maxWidth: 280, background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', padding: 8, fontWeight: 400,
          }}>
            <button type="button" style={menuItem(sortedAsc)}
              onClick={() => { grid.setSort({ key: col.key, dir: 1 }); setOpen(false) }}>
              ▲ 오름차순 정렬
            </button>
            <button type="button" style={menuItem(sortedDesc)}
              onClick={() => { grid.setSort({ key: col.key, dir: -1 }); setOpen(false) }}>
              ▼ 내림차순 정렬
            </button>

            <div style={{ borderTop: '1px solid #f1f5f9', margin: '6px 0' }} />

            <input
              autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="값 검색…"
              style={{
                width: '100%', boxSizing: 'border-box', height: 30, border: '1px solid #cbd5e1',
                borderRadius: 6, padding: '0 8px', fontSize: 12, marginBottom: 6, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px 4px' }}>
              <button type="button" style={linkBtn} onClick={() => grid.setColFilter(col.key, null)}>전체 선택</button>
              <button type="button" style={linkBtn} onClick={() => grid.setColFilter(col.key, new Set())}>전체 해제</button>
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {shown.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8', padding: 6 }}>표시할 값이 없습니다.</div>}
              {shown.map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px', fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={isChecked(v)} onChange={() => toggleValue(v)} style={{ accentColor: '#7c3aed', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '(빈 값)'}</span>
                </label>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </th>
  )
}
