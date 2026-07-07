import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useAuth } from './context/AuthContext'
import { createdTs } from './utils/useGrid'

import Header        from './components/Header'
import Sidebar       from './components/Sidebar'
import MobileNav     from './components/MobileNav'
import AdminCodeModal from './components/AdminCodeModal'
import LoginPage     from './pages/LoginPage'

import EvalInput    from './pages/EvalInput'
import Candidates   from './pages/Candidates'
import Personnel    from './pages/Personnel'
import Charts       from './pages/Charts'
import TOPage       from './pages/TOPage'
import ParamsPage   from './pages/ParamsPage'
import Members      from './pages/Members'
import OrgParts     from './pages/OrgParts'
import AuditPage    from './pages/AuditPage'

const ADMIN_PAGES = ['charts', 'to', 'params', 'members', 'orgparts', 'audit']

export default function App() {
  const { loading, user, hasAccess, logout } = useAuth()

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#94a3b8' }}>불러오는 중...</div>
  }
  if (!user) return <LoginPage />
  if (!hasAccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
        <div className="card" style={{ maxWidth: 400, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a202c', marginBottom: 8 }}>접근 권한이 없습니다</div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>
            <strong>{user.email}</strong> 계정은 아직 파트가 배정되지 않았습니다.<br />
            관리자에게 권한 배정을 요청하세요.
          </div>
          <button className="btn-secondary" onClick={logout}>로그아웃</button>
        </div>
      </div>
    )
  }

  // key=uid — 로그아웃/사용자 변경 시 포털 상태(보던 페이지·관리자 잠금 해제 등)를 통째로 초기화.
  // 공용 PC에서 이전 사용자의 화면 상태가 다음 사용자에게 넘어가지 않게 함
  return <Portal key={user.uid} />
}

function Portal() {
  const { isAdmin, part } = useAuth()
  const [page, setPage]             = useState('eval')
  const [candidates, setCandidates] = useState([])
  // 관리자 코드 잠금 해제(세션 유지) + 코드 게이트/변경 모달
  // (sessionStorage의 adminUnlocked는 로그아웃 시 AuthContext에서 제거됨)
  const [adminUnlocked, setAdminUnlocked] = useState(() => sessionStorage.getItem('adminUnlocked') === '1')
  const [codeGate, setCodeGate]     = useState(null)   // { target } | { change:true } | null

  // 채용 후보 실시간 — 관리자는 전체, 파트장은 자기 파트만 (서버 규칙과 동일하게 클라이언트에서도 필터)
  useEffect(() => {
    if (!isAdmin && !part) return   // 파트 미배정: 구독 안 함 (빈 목록 유지)
    const ref = isAdmin
      ? collection(db, 'candidates')
      : query(collection(db, 'candidates'), where('part', '==', part))
    return onSnapshot(ref, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      rows.sort((a, b) => createdTs(b) - createdTs(a))
      setCandidates(rows)
    })
  }, [isAdmin, part])

  const unlockAdmin = () => {
    sessionStorage.setItem('adminUnlocked', '1')
    setAdminUnlocked(true)
  }

  const goPage = (id) => {
    if (ADMIN_PAGES.includes(id)) {
      if (!isAdmin) return                 // 관리자 계정만
      if (!adminUnlocked) { setCodeGate({ target: id }); return }  // 코드 게이트
    }
    setPage(id)
  }

  const pendingCount = candidates.filter(c => c.status === 'candidate').length

  return (
    <div className="app-wrap">
      <Header onChangeCode={() => setCodeGate({ change: true })} adminUnlocked={adminUnlocked} />

      <div className="layout">
        <Sidebar page={page} onPage={goPage} candidateCount={pendingCount} />

        <main className="main-content">
          {page === 'eval'       && <EvalInput />}
          {page === 'candidates' && <Candidates candidates={candidates} />}
          {page === 'personnel'  && <Personnel />}
          {page === 'charts'     && <Charts />}
          {page === 'to'         && <TOPage />}
          {page === 'params'     && <ParamsPage />}
          {page === 'members'    && <Members />}
          {page === 'orgparts'   && <OrgParts />}
          {page === 'audit'      && <AuditPage />}
        </main>
      </div>

      <MobileNav page={page} onPage={goPage} candidateCount={pendingCount} />

      {codeGate && (
        <AdminCodeModal
          change={!!codeGate.change}
          onClose={() => setCodeGate(null)}
          onUnlock={() => {
            unlockAdmin()
            if (codeGate.target) setPage(codeGate.target)
            setCodeGate(null)
          }}
        />
      )}
    </div>
  )
}
