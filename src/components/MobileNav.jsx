import { useState } from 'react'
import {
  ClipboardList, UserCheck, Users, MoreHorizontal,
  BarChart2, Target, Settings, UserCog, Building2, History,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// 하단 탭 바 — 기본 3개 + (관리자) 더보기 바텀시트.
// 사이드바 전용이던 관리자 메뉴(파라미터·사용자·파트·감사로그)도 모바일에서 접근 가능하게 함
const TABS = [
  { id: 'eval',       Icon: ClipboardList, label: '채용평가' },
  { id: 'candidates', Icon: UserCheck,     label: '후보', badge: true },
  { id: 'personnel',  Icon: Users,         label: '인원' },
]
const ADMIN_MENUS = [
  { id: 'charts',    Icon: BarChart2, label: '차트 분석' },
  { id: 'to',        Icon: Target,    label: 'T/O 현황' },
  { id: 'members',   Icon: UserCog,   label: '사용자 관리' },
  { id: 'orgparts',  Icon: Building2, label: '파트 관리' },
  { id: 'params',    Icon: Settings,  label: '파라미터 설정' },
  { id: 'audit',     Icon: History,   label: '감사 로그·휴지통' },
]

export default function MobileNav({ page, onPage, candidateCount }) {
  const { isAdmin } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = ADMIN_MENUS.some(m => m.id === page)

  const go = (id) => { setMoreOpen(false); onPage(id) }

  return (
    <>
      <nav className="mobile-nav">
        {TABS.map(m => (
          <button
            key={m.id}
            className={`mobile-nav-item${page === m.id ? ' active' : ''}`}
            onClick={() => go(m.id)}
          >
            <span className="mobile-nav-icon">
              <m.Icon size={22} />
              {m.badge && candidateCount > 0 && (
                <span className="mobile-nav-badge">{candidateCount}</span>
              )}
            </span>
            {m.label}
          </button>
        ))}
        {isAdmin && (
          <button
            className={`mobile-nav-item${moreActive ? ' active' : ''}`}
            onClick={() => setMoreOpen(o => !o)}
          >
            <span className="mobile-nav-icon"><MoreHorizontal size={22} /></span>
            더보기
          </button>
        )}
      </nav>

      {moreOpen && (
        <>
          <div className="sheet-overlay" onClick={() => setMoreOpen(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div className="sheet-title">관리자 메뉴</div>
            <div className="sheet-scroll">
              {ADMIN_MENUS.map(m => (
                <button
                  key={m.id}
                  className={`sheet-item${page === m.id ? ' active' : ''}`}
                  onClick={() => go(m.id)}
                >
                  <m.Icon size={18} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
