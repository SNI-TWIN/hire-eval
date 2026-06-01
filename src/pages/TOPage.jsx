import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { JT_COLOR, JT_TAG_STYLE } from '../utils/constants'

export default function TOPage() {
  const { isAdmin }   = useAuth()
  const [employees, setEmployees]     = useState([])
  const [toConfig, setToConfig]       = useState([])   // [{ part, jobType, to }]
  const [editing, setEditing]         = useState(false)
  const [draft, setDraft]             = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'employees'), s => setEmployees(s.docs.map(d => d.data())))
    getDoc(doc(db, 'settings', 'to_config')).then(snap => {
      if (snap.exists()) setToConfig(snap.data().parts ?? [])
    })
    return () => { u1() }
  }, [])

  if (!isAdmin) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>관리자 로그인이 필요합니다.</div>

  // 현원 = 인원 현황(employees). 채용 확정 시 employees로 등록됨.
  const allPersonnel = employees

  // 파트별 현원 집계
  const countByPart = {}
  allPersonnel.forEach(p => {
    const key = `${p.part}__${p.jobType}`
    countByPart[key] = (countByPart[key] || 0) + 1
  })

  const startEdit = () => { setDraft(toConfig.map(r => ({ ...r }))); setEditing(true) }
  const saveEdit  = async () => {
    setToConfig(draft)
    await setDoc(doc(db, 'settings', 'to_config'), { parts: draft })
    setEditing(false)
  }
  const addRow = () => setDraft(p => [...p, { part: '', jobType: '현장주간', to: 0 }])
  const delRow = i => setDraft(p => p.filter((_, idx) => idx !== i))
  const updRow = (i, k, v) => setDraft(p => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r))

  const rows = toConfig.map(r => {
    const key    = `${r.part}__${r.jobType}`
    const cur    = countByPart[key] || 0
    const remain = r.to - cur
    return { ...r, cur, remain }
  })
  const totalTo  = toConfig.reduce((s, r) => s + (parseInt(r.to) || 0), 0)
  const totalCur = allPersonnel.length

  return (
    <div>
      <div className="page-title">T/O 현황</div>
      <div className="page-desc">파트별 정원(T/O) 대비 현원을 확인하고 관리합니다.</div>

      {/* 전체 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: '전체 T/O', value: totalTo + '명', color: '#0d9488' },
          { label: '현재 인원', value: totalCur + '명', color: '#3b82f6' },
          { label: '잔여 T/O', value: (totalTo - totalCur) + '명', color: totalTo - totalCur >= 0 ? '#7c3aed' : '#e53e3e' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px', marginBottom: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* T/O 테이블 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>파트별 T/O 현황</span>
          {!editing
            ? <button className="btn-icon" onClick={startEdit}>편집</button>
            : <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-icon" onClick={addRow}>+ 행 추가</button>
                <button className="btn-primary" onClick={saveEdit}>저장</button>
                <button className="btn-secondary" onClick={() => setEditing(false)}>취소</button>
              </div>
          }
        </div>
        {rows.length === 0 && !editing ? (
          <div className="table-empty">T/O 설정이 없습니다. 편집을 눌러 추가하세요.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>파트</th><th>직무유형</th><th>T/O</th><th>현원</th><th>잔여</th>{editing && <th></th>}</tr>
              </thead>
              <tbody>
                {editing
                  ? draft.map((r, i) => (
                      <tr key={i}>
                        <td><input style={{ width: 120, border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'inherit' }}
                          value={r.part} onChange={e => updRow(i, 'part', e.target.value)} placeholder="파트명" /></td>
                        <td>
                          <select style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'inherit' }}
                            value={r.jobType} onChange={e => updRow(i, 'jobType', e.target.value)}>
                            {['현장주간','현장교대','사무주간'].map(jt => <option key={jt}>{jt}</option>)}
                          </select>
                        </td>
                        <td><input type="number" min="0" style={{ width: 60, border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'inherit' }}
                          value={r.to} onChange={e => updRow(i, 'to', parseInt(e.target.value) || 0)} /></td>
                        <td>—</td><td>—</td>
                        <td><button className="btn-danger" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => delRow(i)}>삭제</button></td>
                      </tr>
                    ))
                  : rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.part || '—'}</td>
                        <td><span style={{ ...JT_TAG_STYLE[r.jobType], padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{r.jobType}</span></td>
                        <td>{r.to}명</td>
                        <td style={{ fontWeight: 600, color: JT_COLOR[r.jobType] }}>{r.cur}명</td>
                        <td>
                          <span style={{
                            fontWeight: 600,
                            color: r.remain > 0 ? '#0b7a70' : r.remain === 0 ? '#854d0e' : '#9b1c1c',
                          }}>
                            {r.remain > 0 ? `+${r.remain}` : r.remain}명
                          </span>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
