import { createContext, useContext, useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const AuthContext = createContext(null)

// 부트스트랩 관리자 — users 문서가 없어도 이 이메일은 최초 관리자로 인정 (닭-달걀 문제 해결)
const BOOTSTRAP_ADMINS = ['sceom@sni.co.kr']

// 비활성 자동 로그아웃 시간 (분). 마우스·키보드·스크롤·터치가 이 시간 동안 없으면 로그아웃.
const IDLE_LOGOUT_MIN = 30

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)   // users/{uid} 문서
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u) {
        let prof = null
        try {
          // 명단(users)은 이메일(소문자)을 문서 ID로 사용 — 관리자가 로그인 전에 미리 등록 가능
          const snap = await getDoc(doc(db, 'users', (u.email || '').toLowerCase()))
          if (snap.exists()) prof = snap.data()
        } catch { /* 규칙/네트워크 오류 시 미등록으로 처리 */ }

        const isBoot = BOOTSTRAP_ADMINS.includes((u.email || '').toLowerCase())
        if (isBoot) prof = { email: u.email, name: prof?.name || u.email, part: prof?.part ?? null, ...prof, isAdmin: true }
        setProfile(prof)
      } else {
        setProfile(null)
        // 공용 PC 보호 — 로그아웃 시 관리자 잠금 해제 상태가 다음 로그인으로 넘어가지 않게 함
        sessionStorage.removeItem('adminUnlocked')
      }
      setLoading(false)
    })
  }, [])

  const login  = (email, pw) => signInWithEmailAndPassword(auth, email, pw)
  const logout = () => signOut(auth)

  // 비활성 자동 로그아웃 — 로그인 상태에서 일정 시간 입력이 없으면 세션 종료
  useEffect(() => {
    if (!user) return
    let timer
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { signOut(auth) }, IDLE_LOGOUT_MIN * 60 * 1000)
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()   // 타이머 시작
    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [user])

  const isAdmin   = !!profile?.isAdmin   // 관리자 표시된 계정만
  const part      = profile?.part ?? null
  const hasAccess = !!profile            // 명단(users)에 있거나 부트스트랩 관리자라야 PJT채용관리 진입

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, part, hasAccess, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
