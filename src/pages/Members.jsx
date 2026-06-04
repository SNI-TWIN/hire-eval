import { useState, useEffect } from 'react'
import { db, auth, firebaseConfig } from '../firebase'
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth'

// 보조 Firebase 앱으로 계정을 만들어, 현재 관리자 로그인 세션이 풀리지 않게 함
async function createAuthAccount(email, pw) {
  const app2 = initializeApp(firebaseConfig, 'secondary-' + Date.now())
  try {
    await createUserWithEmailAndPassword(getAuth(app2), email, pw)
    await signOut(getAuth(app2))
    return { ok: true }
  } catch (e) {
    return { ok: false, code: e.code, message: e.message }
  } finally {
    await deleteApp(app2)
  }
}

const EMPTY = { email: '', name: '', part: '', isAdmin: false, pw: '' }

export default function Members() {
  const [members, setMembers] = useState([])
  const [parts, setParts]     = useState([])
  const [form, setForm]       = useState(EMPTY)
  const [msg, setMsg]         = useState(null)
  const [busy, setBusy]       = useState(false)

  useEffect(() => onSnapshot(collection(db, 'users'), s =>
    setMembers(s.docs.map(d => ({ id: d.id, ...d.data() })))), [])

  useEffect(() => onSnapshot(collection(db, 'parts'), s => {
    const r = s.docs.map(d => ({ id: d.id, ...d.data() }))
    r.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    setParts(r)
  }), [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const add = async () => {
    const email = form.email.trim().toLowerCase()
    if (!email) return setMsg({ ok: false, text: '이메일을 입력하세요.' })
    if (!form.isAdmin && !form.part) return setMsg({ ok: false, text: '파트를 선택하거나 관리자로 지정하세요.' })
    if (!form.pw) return setMsg({ ok: false, text: '초기 비밀번호를 입력하세요. (6자 이상)' })
    if (form.pw.length < 6) return setMsg({ ok: false, text: '비밀번호는 6자 이상이어야 합니다.' })
    setBusy(true); setMsg(null)
    try {
      let note = ''
      const res = await createAuthAccount(email, form.pw)
      if (!res.ok && res.code === 'auth/email-already-in-use') {
        note = ' (이미 가입된 계정 — 명단만 갱신. 비밀번호는 재설정 메일로 변경하세요)'
      } else if (!res.ok) {
        setBusy(false); return setMsg({ ok: false, text: '계정 생성 실패: ' + res.message })
      }
      await setDoc(doc(db, 'users', email), {
        email,
        name: form.name.trim() || email,
        part: form.isAdmin ? null : form.part,
        isAdmin: !!form.isAdmin,
        createdAt: new Date().toISOString(),
      })
      setForm(EMPTY)
      setMsg({ ok: true, text: '등록되었습니다.' + note })
    } catch (e) {
      setMsg({ ok: false, text: '오류: ' + e.message })
    } finally {
      setBusy(false)
    }
  }

  // 비밀번호 재설정 메일 발송 — 사용자가 메일 링크로 직접 새 비밀번호 설정
  const sendReset = async (m) => {
    setBusy(true); setMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      await sendPasswordResetEmail(auth, m.email)
      setMsg({ ok: true, text: `${m.email} 로 비밀번호 재설정 메일을 보냈습니다.` })
    } catch (e) {
      const text = e.code === 'auth/user-not-found'
        ? `${m.email} 의 로그인 계정이 없습니다. 먼저 비밀번호와 함께 등록하세요.`
        : '재설정 메일 발송 실패: ' + e.message
      setMsg({ ok: false, text })
    } finally {
      setBusy(false)
    }
  }

  const changePart  = (m, part) => updateDoc(doc(db, 'users', m.id), { part })
  const toggleAdmin = (m) => updateDoc(doc(db, 'users', m.id), { isAdmin: !m.isAdmin, part: !m.isAdmin ? null : m.part })
  const remove = (m) => {
    if (confirm(`${m.email} 명단을 삭제할까요?\n(로그인 계정 자체는 Firebase 콘솔에서 별도로 삭제하세요)`))
      deleteDoc(doc(db, 'users', m.id))
  }

  return (
    <div>
      <div className="page-title">사용자 관리</div>
      <div className="page-desc">
        이메일·초기 비밀번호로 사용자를 등록하면 바로 로그인할 수 있는 계정이 만들어집니다. 관리자로 지정하면 모든 파트를 볼 수 있습니다.
        <br />비밀번호 변경은 목록의 <strong>비밀번호 재설정 메일</strong> 버튼으로 — 사용자가 메일 링크를 통해 직접 새 비밀번호를 설정합니다.
      </div>

      {/* 등록 폼 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">사용자 등록</div>
        <div className="info-grid" style={{ marginBottom: 12 }}>
          <div>
            <div className="info-label">이메일</div>
            <input className="info-input" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} placeholder="name@company.com" />
          </div>
          <div>
            <div className="info-label">이름</div>
            <input className="info-input" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="홍길동" />
          </div>
        </div>
        <div className="info-grid" style={{ marginBottom: 12 }}>
          <div>
            <div className="info-label">파트 {form.isAdmin && <span style={{ color: '#94a3b8', fontWeight: 400 }}>(관리자는 전체)</span>}</div>
            <select className="info-input" value={form.part} disabled={form.isAdmin}
              onChange={e => set('part', e.target.value)}>
              <option value="">파트 선택</option>
              {parts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <div className="info-label">초기 비밀번호 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(6자 이상, 필수)</span></div>
            <input className="info-input" type="text" value={form.pw}
              onChange={e => set('pw', e.target.value)} placeholder="로그인용 초기 비밀번호" autoComplete="off" />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isAdmin}
            onChange={e => set('isAdmin', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#0d9488' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>관리자 권한 부여 (모든 파트 조회 + 관리자 페이지)</span>
        </label>
        {msg && (
          <div className="validation-msg" style={{
            display: 'block', marginBottom: 12,
            color: msg.ok ? '#0b7a70' : '#e53e3e',
            background: msg.ok ? '#e6faf7' : '#fef2f2',
          }}>
            {msg.text}
          </div>
        )}
        {parts.length === 0 && (
          <div style={{ fontSize: 12, color: '#b45309', marginBottom: 12 }}>
            ⚠ 먼저 <strong>파트 관리</strong>에서 파트를 추가하세요.
          </div>
        )}
        <button className="btn-primary" onClick={add} disabled={busy}>
          {busy ? '등록 중...' : '사용자 등록'}
        </button>
      </div>

      {/* 사용자 목록 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {members.length === 0 ? (
          <div className="table-empty">등록된 사용자가 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>이메일</th><th>이름</th><th>파트</th><th>관리자</th><th></th></tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.email}</td>
                    <td>{m.name}</td>
                    <td>
                      {m.isAdmin ? (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>전체</span>
                      ) : (
                        <select className="info-input" value={m.part || ''} style={{ padding: '4px 8px', fontSize: 13 }}
                          onChange={e => changePart(m, e.target.value)}>
                          <option value="">미배정</option>
                          {parts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      )}
                    </td>
                    <td>
                      <button onClick={() => toggleAdmin(m)} style={{
                        padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: '1px solid', borderColor: m.isAdmin ? '#0d9488' : '#e2e8f0',
                        background: m.isAdmin ? '#e6faf7' : '#fff', color: m.isAdmin ? '#0b7a70' : '#64748b',
                      }}>
                        {m.isAdmin ? '관리자' : '일반'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          style={{
                            padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontFamily: 'inherit',
                          }}
                          disabled={busy}
                          onClick={() => sendReset(m)}
                          title="해당 사용자에게 비밀번호 재설정 메일을 보냅니다"
                        >
                          비밀번호 재설정 메일
                        </button>
                        <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => remove(m)}>삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
