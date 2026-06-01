import { useAuth } from '../context/AuthContext'

export default function MobileNav({ page, onPage, candidateCount }) {
  const { isAdmin } = useAuth()

  const items = [
    { id: 'eval',       icon: '📝', label: '평가입력' },
    { id: 'candidates', icon: '📋', label: '후보목록' },
    { id: 'personnel',  icon: '👥', label: '인원현황', admin: true },
    { id: 'charts',     icon: '📊', label: '분석',     admin: true },
    { id: 'to',         icon: '🎯', label: 'T/O',      admin: true },
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
            <span className="mobile-nav-icon">{m.icon}</span>
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
