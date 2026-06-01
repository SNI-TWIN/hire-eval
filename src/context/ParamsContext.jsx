import { createContext, useContext, useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { DEFAULT_PARAMS } from '../utils/constants'

const ParamsContext = createContext(null)

export function ParamsProvider({ children }) {
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'params_v2'), snap => {
      if (snap.exists()) {
        const data = snap.data()
        setParams(prev => ({
          ...prev,
          careerLevels:    data.careerLevels    ?? prev.careerLevels,
          scoring:         data.scoring         ?? prev.scoring,
          gradeThresholds: data.gradeThresholds ?? prev.gradeThresholds,
          gradeRatio:      data.gradeRatio      ?? prev.gradeRatio,
        }))
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
