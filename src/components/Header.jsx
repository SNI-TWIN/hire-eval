import { useAuth } from '../context/AuthContext'

export default function Header({ onAdminClick }) {
  const { isAdmin, logout } = useAuth()

  return (
    <header className="header">
      <div className="header-logo">인사관리 포털</div>
      <div className="header-sub">채용 평가 시스템</div>
      <div className="header-right">
        {isAdmin ? (
          <>
            <span>관리자</span>
            <button className="btn-admin-login" onClick={logout}>로그아웃</button>
          </>
        ) : (
          <button className="btn-admin-login" onClick={onAdminClick}>관리자 로그인</button>
        )}
      </div>
    </header>
  )
}
