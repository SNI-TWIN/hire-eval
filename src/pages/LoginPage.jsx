import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail]     = useState('')
  const [pw, setPw]           = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), pw)
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#0d9488 0%,#0b7a70 100%)', padding: 20,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', letterSpacing: '-0.3px' }}>PJT채용관리</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>로그인 후 이용할 수 있습니다.</div>
        </div>
        <form onSubmit={handle}>
          <div style={{ marginBottom: 12 }}>
            <div className="info-label">이메일</div>
            <input
              className="info-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="username"
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
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <div className="validation-msg" style={{ display: 'block', marginBottom: 12 }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 16, textAlign: 'center', lineHeight: 1.6 }}>
          계정이 없으면 관리자에게 발급을 요청하세요.
        </div>
      </div>
    </div>
  )
}
