import { ClipboardList, UserCheck, Users, BarChart2, Target, Settings, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const PUBLIC_MENUS = [
  { id: 'eval',       Icon: ClipboardList, label: '채용평가' },
  { id: 'candidates', Icon: UserCheck,     label: '채용 후보 목록', badge: true },
]
const ADMIN_MENUS = [
  { id: 'personnel', Icon: Users,     label: '인원 현황' },
  { id: 'charts',    Icon: BarChart2, label: '차트 분석' },
  { id: 'to',        Icon: Target,    label: 'T/O 현황' },
  { id: 'params',    Icon: Settings,  label: '파라미터 설정' },
]

export default function Sidebar({ page, onPage, candidateCount }) {
  const { isAdmin } = useAuth()

  return (
    <nav className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">채용 평가</div>
        {PUBLIC_MENUS.map(m => (
          <button
            key={m.id}
            className={`nav-item${page === m.id ? ' active' : ''}`}
            onClick={() => onPage(m.id)}
          >
            <span className="nav-icon"><m.Icon size={16} /></span>
            {m.label}
            {m.badge && candidateCount > 0 && (
              <span className="nav-badge show">{candidateCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="nav-divider" />

      <div className="sidebar-section">
        <div className="sidebar-label">관리자</div>
        {ADMIN_MENUS.map(m => (
          <button
            key={m.id}
            className={`nav-item admin-item${page === m.id ? ' active' : ''}`}
            onClick={() => onPage(m.id)}
          >
            <span className="nav-icon"><m.Icon size={16} /></span>
            {m.label}
            {!isAdmin && <Lock size={13} className="nav-lock" />}
          </button>
        ))}
      </div>
    </nav>
  )
}
