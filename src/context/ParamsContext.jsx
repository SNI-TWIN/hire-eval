import { createContext, useContext, useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { DEFAULT_PARAMS } from '../utils/constants'

const ParamsContext = createContext(null)

// 구버전 scoring 키를 신버전으로 자동 변환
const SCORE_MIGRATIONS = {
  equipment: {
    '혼자서 수행': '장애 발생 시 원인 파악부터 긴급 조치까지 단독 수행 가능',
    '단독 수행':   '장애 발생 시 원인 파악부터 긴급 조치까지 단독 수행 가능',
    '이에 따라':   '선임자의 지시에 따라 주요 장비를 무리 없이 조작 가능',
    '지시에 따라 조작': '선임자의 지시에 따라 주요 장비를 무리 없이 조작 가능',
    '기본 원리만 알지': '장비 명칭과 기본 원리만 알고 있는 수준',
    '기본 원리만 앎':   '장비 명칭과 기본 원리만 알고 있는 수준',
  },
  careerConsistency: {
    '2~3년':  '2~3년 미만',
    '2년 미만': '1~2년 미만',
  },
  punctuality: {
    '지': '지각',
  },
  certification: {
    '사/수첩/교육': '기능사/수첩/교육',
  },
}

function migrateScoring(scoring) {
  let anyChanged = false
  const next = { ...scoring }
  for (const [item, map] of Object.entries(SCORE_MIGRATIONS)) {
    if (!next[item]) continue
    const opts = { ...next[item] }
    let itemChanged = false
    for (const [oldKey, newKey] of Object.entries(map)) {
      if (oldKey in opts && !(newKey in opts)) {
        opts[newKey] = opts[oldKey]
        delete opts[oldKey]
        itemChanged = true
        anyChanged = true
      }
    }
    if (itemChanged) next[item] = opts
  }
  return { scoring: next, changed: anyChanged }
}

export function ParamsProvider({ children }) {
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'params_v2'), async snap => {
      if (snap.exists()) {
        const data = snap.data()
        const { scoring, changed } = migrateScoring(data.scoring ?? {})
        setParams(prev => ({
          ...prev,
          careerLevels:    data.careerLevels    ?? prev.careerLevels,
          scoring,
          gradeThresholds: data.gradeThresholds ?? prev.gradeThresholds,
          gradeRatio:      data.gradeRatio      ?? prev.gradeRatio,
        }))
        if (changed) {
          setDoc(doc(db, 'settings', 'params_v2'), { ...data, scoring }).catch(() => {})
        }
      }
      setLoaded(true)
    }, () => setLoaded(true))
    return unsub
  }, [])

  const saveParams = async (next) => {
    setParams(next)
    await setDoc(doc(db, 'settings', 'params_v2'), next)
  }

  return (
    <ParamsContext.Provider value={{ params, saveParams, loaded }}>
      {children}
    </ParamsContext.Provider>
  )
}

export const useParams = () => useContext(ParamsContext)
