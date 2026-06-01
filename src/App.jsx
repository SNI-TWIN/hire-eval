import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { useAuth } from './context/AuthContext'

import Header        from './components/Header'
import Sidebar       from './components/Sidebar'
import MobileNav     from './components/MobileNav'
import AdminLoginModal from './components/AdminLoginModal'

import EvalInput    from './pages/EvalInput'
import Candidates   from './pages/Candidates'
import Personnel    from './pages/Personnel'
import Charts       from './pages/Charts'
import TOPage       from './pages/TOPage'
import ParamsPage   from './pages/ParamsPage'

export default function App() {
  const { isAdmin } = useAuth()
  const [page, setPage]             = useState('eval')
  const [showLogin, setShowLogin]   = useState(false)
  const [candidates, setCandidates] = useState([])

  // 채용 후보 실시간
  useEffect(() => {
    const q = query(collection(db, 'candidates'), orderBy('id', 'desc'))
    return onSnapshot(q, snap => {
      setCandidates(snap.docs.map(d => d.data()))
    })
  }, [])

  const goPage = (id) => {
    const adminPages = ['personnel', 'charts', 'to', 'params']
    if (adminPages.includes(id) && !isAdmin) {
      setShowLogin(true)
      return
    }
    setPage(id)
  }

  const pendingCount = candidates.filter(c => c.status === 'candidate').length

  return (
    <div className="app-wrap">
      <Header onAdminClick={() => setShowLogin(true)} />

      <div className="layout">
        <Sidebar page={page} onPage={goPage} candidateCount={pendingCount} />

        <main className="main-content">
          {page === 'eval'       && <EvalInput />}
          {page === 'candidates' && <Candidates candidates={candidates} onPage={goPage} />}
          {page === 'personnel'  && <Personnel />}
          {page === 'charts'     && <Charts />}
          {page === 'to'         && <TOPage />}
          {page === 'params'     && <ParamsPage />}
        </main>
      </div>

      <MobileNav page={page} onPage={goPage} candidateCount={pendingCount} />

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
