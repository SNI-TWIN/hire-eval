import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Filter, ArrowUp, ArrowDown, X } from 'lucide-react'

// 엑셀 데이터 필터 스타일의 정렬+필터 UI
// - 데스크톱: 헤더 제목 클릭 → 그 자리에 팝업 (GridTH)
// - 모바일:   thead가 숨겨지므로 표 위의 칩 바(MobileGridBar) → 바텀시트로 동일 기능 제공
// 정렬·필터 상태 로직은 utils/useGrid 참고

// 정렬 버튼 + 값 검색 + 체크리스트 — 팝업/바텀시트 공용 본문
function FilterMenuBody({ col, grid, onClose, autoFocus = false }) {
  const [q, setQ] = useState('')

  const options    = grid.distinct(col.key)
  const current    = grid.filters[col.key]            // Set | undefined
  const allChecked = !current
  const isChecked  = (v) => allChecked || current.has(v)
  const shown      = options.filter(v => v.toLowerCase().includes(q.toLowerCase()))
  const sortedAsc  = grid.sort.key === col.key && grid.sort.dir === 1
  const sortedDesc = grid.sort.key === col.key && grid.sort.dir === -1

  const toggleValue = (v) => {
    const base = current ? new Set(current) : new Set(options)
    if (base.has(v)) base.delete(v); else base.add(v)
    grid.setColFilter(col.key, base.size === options.length ? null : base)
  }

  return (
    <>
      <button type="button" className={`fmenu-sort${sortedAsc ? ' active' : ''}`}
        onClick={() => { grid.setSort({ key: col.key, dir: 1 }); onClose() }}>
        ▲ 오름차순 정렬
      </button>
      <button type="button" className={`fmenu-sort${sortedDesc ? ' active' : ''}`}
        onClick={() => { grid.setSort({ key: col.key, dir: -1 }); onClose() }}>
        ▼ 내림차순 정렬
      </button>

      <div className="fmenu-divider" />

      <input
        className="fmenu-search"
        autoFocus={autoFocus} value={q} onChange={e => setQ(e.target.value)} placeholder="값 검색…"
      />
      <div className="fmenu-links">
        <button type="button" className="fmenu-link" onClick={() => grid.setColFilter(col.key, null)}>전체 선택</button>
        <button type="button" className="fmenu-link" onClick={() => grid.setColFilter(col.key, new Set())}>전체 해제</button>
      </div>
      <div className="fmenu-list">
        {shown.length === 0 && <div className="fmenu-empty">표시할 값이 없습니다.</div>}
        {shown.map(v => (
          <label key={v} className="fmenu-opt">
            <input type="checkbox" checked={isChecked(v)} onChange={() => toggleValue(v)} />
            <span>{v || '(빈 값)'}</span>
          </label>
        ))}
      </div>
    </>
  )
}

export function GridTH({ col, grid }) {
  const align = col.align === 'right' ? 'right' : 'left'
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState(null)
  const btnRef  = useRef(null)
  const menuRef = useRef(null)

  const openMenu = () => {
    if (open) { setOpen(false); return }
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right })
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return
    // 페이지 스크롤 시 팝업을 닫되, 팝업 내부(체크리스트) 스크롤은 무시
    const close = (e) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => { window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true) }
  }, [open])

  const sortedAsc  = grid.sort.key === col.key && grid.sort.dir === 1
  const sortedDesc = grid.sort.key === col.key && grid.sort.dir === -1
  const hasFilter  = !!grid.filters[col.key]
  const accent     = hasFilter || sortedAsc || sortedDesc

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
          <div ref={menuRef} style={{
            position: 'fixed', top: pos.top, zIndex: 1001,
            ...(align === 'right' ? { right: pos.right } : { left: pos.left }),
            minWidth: 210, maxWidth: 280, background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', padding: 8, fontWeight: 400,
          }}>
            <FilterMenuBody col={col} grid={grid} onClose={() => setOpen(false)} autoFocus />
          </div>
        </>,
        document.body
      )}
    </th>
  )
}

// 모바일 전용 칩 바 — 표 위에 두면 데스크톱에서는 CSS로 숨겨짐 (.mgrid-bar)
export function MobileGridBar({ columns, grid }) {
  const [openKey, setOpenKey] = useState(null)
  const openCol = columns.find(c => c.key === openKey)
  const hasAny  = !!grid.sort.key || Object.keys(grid.filters).length > 0

  const clearAll = () => {
    grid.setSort({ key: null, dir: 1 })
    Object.keys(grid.filters).forEach(k => grid.setColFilter(k, null))
  }

  return (
    <>
      <div className="mgrid-bar">
        {columns.map(col => {
          const sorted   = grid.sort.key === col.key
          const filtered = !!grid.filters[col.key]
          return (
            <button key={col.key} type="button"
              className={`mgrid-chip${sorted || filtered ? ' active' : ''}`}
              onClick={() => setOpenKey(col.key)}
            >
              {col.label}
              {sorted && (grid.sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
              {filtered ? <Filter size={12} /> : <ChevronDown size={12} />}
            </button>
          )
        })}
        {hasAny && (
          <button type="button" className="mgrid-chip clear" onClick={clearAll}>
            <X size={12} /> 초기화
          </button>
        )}
      </div>

      {openCol && createPortal(
        <>
          <div className="sheet-overlay" onMouseDown={() => setOpenKey(null)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div className="sheet-title">{openCol.label} — 정렬·필터</div>
            <div className="sheet-scroll">
              <FilterMenuBody col={openCol} grid={grid} onClose={() => setOpenKey(null)} />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
