import { ClipboardList, UserCheck, Users, BarChart2, Target } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function MobileNav({ page, onPage, candidateCount }) {
  const { isAdmin } = useAuth()

  const items = [
    { id: 'eval',       Icon: ClipboardList, label: '채용평가' },
    { id: 'candidates', Icon: UserCheck,     label: '채용 후보 목록' },
    { id: 'personnel',  Icon: Users,         label: '인원 현황' },
    { id: 'charts',     Icon: BarChart2,     label: '차트 분석',  admin: true },
    { id: 'to',         Icon: Target,        label: 'T/O 현황',  admin: true },
  ]

  return (
    <nav className="mobile-nav">
      {items.map(m => {
        if (m.admin && !isAdmin) return null
        return (
          <button
            key={m.id}
            className={`mobile-nav-item${page === m.id ? ' active' : ''}`}
            onClick={() => onPage(m.id)}
          >
            <span className="mobile-nav-icon"><m.Icon size={22} /></span>
            {m.label}
            {m.id === 'candidates' && candidateCount > 0 && (
              <span style={{ color: '#0d9488', fontWeight: 700 }}>({candidateCount})</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
