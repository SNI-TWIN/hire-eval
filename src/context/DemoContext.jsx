import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

// 시연/강의용 "시연 모드"
// - 실제 Firestore 데이터는 절대 건드리지 않고, 화면에 표시되는 연봉만 가립니다.
// - OFF 하면 즉시 원래 값으로 복원(데이터가 그대로이므로 복원 위험 0).
// - 가짜 숫자는 시드(id 등) 기반으로 고정 생성 → 시연 중 같은 사람은 항상 같은 값.
// - ON/OFF는 "켠 사용자의 로그인 세션"에만 적용: 같은 탭에서 새로고침(F5)하면 유지되지만,
//   로그아웃하거나 다른 사용자가 로그인하면 자동 OFF.
//   (공용 PC에서 관리자가 켜둔 채 나가도 다음 사용자에게 넘어가지 않음)

const DemoContext = createContext(null)

const SS_MODE  = 'demoMode'    // ON/OFF — 탭 세션 + 켠 사용자에게만 유효
const SS_OWNER = 'demoOwner'   // 모드를 켠 사용자(uid). 다르면 강제 OFF
const LS_STYLE = 'demoStyle'   // 표시 방식(가짜/마스킹)은 민감정보가 아니므로 기기에 유지

// 구버전 키 정리 — 예전에는 localStorage에 저장되어 기기 전체(다음 사용자)에 남았음
localStorage.removeItem('demoMode')

// FNV-1a 해시 — 시드 문자열을 안정적인 정수로
function hashSeed(seed) {
  const s = String(seed ?? '')
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// 시드 기반 그럴듯한 가짜 연봉 (3,000~5,490만원, 10만원 단위) — 실제값과 무관해 정보 유출 없음
function fakeSalary(seed) {
  return 3000 + (hashSeed(seed) % 250) * 10
}

export function DemoProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [rawMode, setRawMode]          = useState(() => sessionStorage.getItem(SS_MODE) === '1')
  const [demoStyle, setDemoStyleState] = useState(() => localStorage.getItem(LS_STYLE) || 'fake')

  // 로그아웃 시 세션 기록 제거 — 같은 탭에서 다음 로그인이 이어받지 못하게 함
  useEffect(() => {
    if (!uid) {
      sessionStorage.removeItem(SS_MODE)
      sessionStorage.removeItem(SS_OWNER)
    }
  }, [uid])

  // 실제 적용 여부 = 켠 사용자 본인이 로그인 중일 때만 (다른 사용자/로그아웃이면 자동 OFF)
  const demoMode = rawMode && !!uid && sessionStorage.getItem(SS_OWNER) === uid

  const setDemoMode = useCallback((v) => {
    setRawMode(v)
    sessionStorage.setItem(SS_MODE, v ? '1' : '0')
    if (uid) sessionStorage.setItem(SS_OWNER, uid)
  }, [uid])
  const setDemoStyle = useCallback((v) => {
    setDemoStyleState(v); localStorage.setItem(LS_STYLE, v)
  }, [])

  // 연봉 표시 문자열 — OFF면 실제값, ON이면 마스킹(••••) 또는 가짜 숫자. (단위 '만원'은 호출부에서 붙임)
  const maskWon = useCallback((value, seed) => {
    if (!demoMode) return Number(value || 0).toLocaleString()
    if (demoStyle === 'mask') return '••••'
    return fakeSalary(seed).toLocaleString()
  }, [demoMode, demoStyle])

  // 화면에 실제로 보이는 연봉의 "정렬용 숫자" — OFF=실제값, 가짜=가짜값, 마스킹=null(정렬 무의미)
  // 정렬/필터가 화면 표시값과 일치하도록(=실제 연봉 누수 없음) maskWon과 짝을 이룸
  const shownSalary = useCallback((value, seed) => {
    if (!demoMode) return Number(value || 0)
    if (demoStyle === 'mask') return null
    return fakeSalary(seed)
  }, [demoMode, demoStyle])

  return (
    <DemoContext.Provider value={{ demoMode, setDemoMode, demoStyle, setDemoStyle, maskWon, shownSalary }}>
      {children}
    </DemoContext.Provider>
  )
}

export const useDemo = () => useContext(DemoContext)
