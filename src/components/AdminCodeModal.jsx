import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { hashCode } from '../utils/crypto'

const CODE_RE = /^\d{6}$/

/**
 * 관리자 6자리 코드 게이트.
 * - 코드 미설정 시: 설정 모드(최초 1회)
 * - 코드 설정됨 + change=false: 입력 모드 → 성공 시 onUnlock()
 * - change=true: 변경 모드(현재 코드 확인 후 새 코드로 교체)
 */
export default function AdminCodeModal({ onClose, onUnlock, change = false }) {
  const { user } = useAuth()
  const [ready, setReady]   = useState(false)
  const [hasCode, setHasCode] = useState(false)
  const [cur, setCur]       = useState('')
  const [next, setNext]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [show, setShow]     = useState(false)   // 코드 표시/숨김 토글

  useEffect(() => {
    getDoc(doc(db, 'config', 'admin'))
      .then(snap => { setHasCode(snap.exists() && !!snap.data().codeHash); setReady(true) })
      .catch(() => { setHasCode(false); setReady(true) })
  }, [])

  const setupMode  = ready && !hasCode          // 최초 코드 설정
  const changeMode = change && hasCode          // 코드 변경
  const enterMode  = !setupMode && !changeMode  // 일반 입력

  const saveCode = async (codeHash) => {
    await setDoc(doc(db, 'config', 'admin'), {
      codeHash, updatedAt: new Date().toISOString(), updatedBy: user?.email || '',
    })
  }

  const verify = async (code) => {
    const snap = await getDoc(doc(db, 'config', 'admin'))
    return snap.exists() && snap.data().codeHash === await hashCode(code)
  }

  const handle = async e => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      // 입력 모드: 코드 확인 후 잠금 해제
      if (enterMode) {
        if (!CODE_RE.test(cur)) return setError('6자리 숫자를 입력하세요.')
        if (!(await verify(cur))) return setError('관리자 코드가 일치하지 않습니다.')
        onUnlock(); return
      }
      // 설정/변경 모드: 새 코드 유효성
      if (!CODE_RE.test(next)) return setError('새 코드는 6자리 숫자여야 합니다.')
      if (next !== confirm)    return setError('새 코드가 서로 일치하지 않습니다.')
      if (changeMode) {
        if (!(await verify(cur))) return setError('현재 코드가 일치하지 않습니다.')
      }
      await saveCode(await hashCode(next))
      if (setupMode) onUnlock()   // 최초 설정 = 곧바로 진입
      else { setError(''); onClose() }
    } catch (err) {
      setError('처리 중 오류: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const title = setupMode ? '관리자 코드 설정' : changeMode ? '관리자 코드 변경' : '관리자 인증'
  const desc  = setupMode
    ? '관리자 페이지 최초 진입입니다. 사용할 6자리 코드를 설정하세요.'
    : changeMode ? '현재 코드 확인 후 새 6자리 코드로 변경합니다.'
    : '관리자 페이지에 들어가려면 6자리 코드를 입력하세요.'

  const numInput = (val, set, ph) => (
    <div style={{ position: 'relative' }}>
      <input
        className="info-input" inputMode="numeric" maxLength={6} value={val}
        type={show ? 'text' : 'password'}
        onChange={e => set(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder={ph} autoComplete="new-password"
        style={{ letterSpacing: 4, fontSize: 18, textAlign: 'center', paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? '코드 숨기기' : '코드 보기'}
        title={show ? '숨기기' : '보기'}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', padding: 4,
          background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
        }}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">{title}</div>
        <div className="modal-desc">{desc}</div>
        {!ready ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>확인 중...</div>
        ) : (
          <form onSubmit={handle}>
            {(enterMode || changeMode) && (
              <div style={{ marginBottom: 12 }}>
                <div className="info-label">{changeMode ? '현재 코드' : '관리자 코드'}</div>
                {numInput(cur, setCur, '••••••')}
              </div>
            )}
            {(setupMode || changeMode) && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div className="info-label">새 코드 (6자리)</div>
                  {numInput(next, setNext, '••••••')}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div className="info-label">새 코드 확인</div>
                  {numInput(confirm, setConfirm, '••••••')}
                </div>
              </>
            )}
            {error && (
              <div className="validation-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? '처리 중...' : setupMode ? '설정하고 진입' : changeMode ? '코드 변경' : '확인'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
