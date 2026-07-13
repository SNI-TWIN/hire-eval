import { useAuth } from '../context/AuthContext'
import { useDemo } from '../context/DemoContext'

export default function Header({ onChangeCode, adminUnlocked }) {
  const { user, profile, isAdmin, logout } = useAuth()
  const { demoMode, setDemoMode, demoStyle, setDemoStyle } = useDemo()

  return (
    <>
      <header className="header">
        <div className="header-logo">PJT채용관리</div>
        <div className="header-sub">채용 평가 시스템</div>
        <div className="header-right">
          {isAdmin && (
            <button
              className="btn-admin-login"
              onClick={() => setDemoMode(!demoMode)}
              title="연봉 등 민감정보를 가린 시연·강의용 화면 (실제 데이터는 바뀌지 않습니다)"
              style={demoMode ? { background: '#7c3aed', color: '#fff', borderColor: '#7c3aed' } : undefined}
            >
              {demoMode ? '🔒 시연 모드 ON' : '시연 모드'}
            </button>
          )}
          {isAdmin && adminUnlocked && (
            <button className="btn-admin-login" onClick={onChangeCode}>관리자 코드 변경</button>
          )}
          <span>
            {profile?.name || user?.email}
            {isAdmin ? ' · 관리자' : profile?.part ? ` · ${profile.part}` : ''}
          </span>
          <button className="btn-admin-login" onClick={logout}>로그아웃</button>
        </div>
      </header>

      {demoMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          padding: '8px 20px', background: '#f5f3ff', borderBottom: '1px solid #ddd6fe',
          color: '#5b21b6', fontSize: 13, fontWeight: 600,
        }}>
          <span>🔒 시연 모드 — 화면의 연봉은 실제 값이 아닙니다. (데이터는 그대로이며 OFF 시 원래대로 표시됩니다)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontWeight: 500, color: '#7c3aed' }}>표시 방식</span>
            {[
              { id: 'fake', label: '가짜 숫자' },
              { id: 'mask', label: '••• 마스킹' },
            ].map(o => (
              <button
                key={o.id}
                onClick={() => setDemoStyle(o.id)}
                style={{
                  padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', border: '1px solid',
                  borderColor: demoStyle === o.id ? '#7c3aed' : '#ddd6fe',
                  background: demoStyle === o.id ? '#7c3aed' : '#fff',
                  color: demoStyle === o.id ? '#fff' : '#7c3aed',
                }}
              >
                {o.label}
              </button>
            ))}
          </span>
        </div>
      )}
    </>
  )
}
