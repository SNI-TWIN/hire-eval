import { useAuth } from '../context/AuthContext'

export default function Header({ onChangeCode, adminUnlocked }) {
  const { user, profile, isAdmin, logout } = useAuth()

  return (
    <header className="header">
      <div className="header-logo">인사관리 포털</div>
      <div className="header-sub">채용 평가 시스템</div>
      <div className="header-right">
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
  )
}
