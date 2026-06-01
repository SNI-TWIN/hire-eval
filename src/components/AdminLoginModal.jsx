import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AdminLoginModal({ onClose }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw]       = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, pw)
      onClose()
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">관리자 로그인</div>
        <div className="modal-desc">인원 현황, 차트, 설정 등 관리자 메뉴에 접근합니다.</div>
        <form onSubmit={handle}>
          <div style={{ marginBottom: 12 }}>
            <div className="info-label">이메일</div>
            <input
              className="info-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="info-label">비밀번호</div>
            <input
              className="info-input"
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <div className="validation-msg" style={{ display: 'block', marginBottom: 12 }}>
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
