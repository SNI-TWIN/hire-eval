import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { calcCurrentCareer, formatCareer, totalCareerYears } from '../utils/career'
import { useParams } from '../context/ParamsContext'
import { getCareerLevel } from '../utils/career'
import { JT_TAG_STYLE, JT_COLOR } from '../utils/constants'
import { exportPersonnelCSV } from '../utils/excel'

export default function Personnel() {
  const { isAdmin } = useAuth()
  const { params }  = useParams()
  const [employees, setEmployees] = useState([])
  const [showAdd, setShowAdd]     = useState(false)
  const [form, setForm]           = useState({ name: '', part: '', jobType: '현장주간', careerYears: '', careerMonths: '', currentSalary: '', memo: '' })
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('id', 'desc'))
    return onSnapshot(q, snap => setEmployees(snap.docs.map(d => d.data())))
  }, [])

  if (!isAdmin) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>관리자 로그인이 필요합니다.</div>

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const id = Date.now()
    await setDoc(doc(db, 'employees', String(id)), {
      id,
      name: form.name.trim(),
      part: form.part.trim(),
      jobType: form.jobType,
      careerYears: parseInt(form.careerYears) || 0,
      careerMonths: parseInt(form.careerMonths) || 0,
      careerInputDate: new Date().toISOString(),
      currentSalary: parseInt(form.currentSalary) || 0,
      memo: form.memo.trim(),
      addedDate: new Date().toLocaleDateString('ko-KR'),
    })
    setForm({ name: '', part: '', jobType: '현장주간', careerYears: '', careerMonths: '', currentSalary: '', memo: '' })
    setShowAdd(false)
    setSaving(false)
  }

  const handleSalaryChange = async (id, val) => {
    await updateDoc(doc(db, 'employees', String(id)), { currentSalary: parseInt(val) || 0 })
  }

  const handleDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await deleteDoc(doc(db, 'employees', String(id)))
  }

  return (
    <div>
      <div className="page-title">인원 현황</div>
      <div className="page-desc">기존 재직자 및 채용 확정자의 경력과 현재 연봉을 관리합니다. 경력은 입력 시점 기준 자동 증가합니다.</div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
        <button className="btn-icon" onClick={() => exportPersonnelCSV(employees)}>📥 CSV 내보내기</button>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ 직원 추가</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {employees.length === 0 ? (
          <div className="table-empty">등록된 직원이 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>이름</th><th>파트</th><th>직무유형</th>
                  <th>현재 경력</th><th>경력등급</th>
                  <th>기준연봉</th><th>현재연봉</th>
                  <th>메모</th><th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => {
                  const cur   = calcCurrentCareer(e.careerYears, e.careerMonths, e.careerInputDate)
                  const yrs   = totalCareerYears(cur.years, cur.months)
                  const level = getCareerLevel(e.jobType, yrs, params.careerLevels)
                  // 재계산(경력 자동증가 반영) 우선, 실패 시 평가 시점 스냅샷으로 폴백
                  const levelLabel = level?.label ?? e.careerLevel ?? '—'
                  const jts   = JT_TAG_STYLE[e.jobType] || {}
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.name}</td>
                      <td>{e.part}</td>
                      <td><span style={{ ...jts, padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{e.jobType}</span></td>
                      <td style={{ fontSize: 13 }}>
                        {formatCareer(cur.years, cur.months)}
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>입력: {formatCareer(e.careerYears, e.careerMonths)}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 600, color: JT_COLOR[e.jobType] || '#0d9488' }}>
                          {levelLabel}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {level ? `${level.salary.toLocaleString()}만원` : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number" step="100"
                            defaultValue={e.currentSalary || ''}
                            onBlur={ev => handleSalaryChange(e.id, ev.target.value)}
                            style={{
                              width: 80, height: 30, border: '1.5px solid #e2e8f0',
                              borderRadius: 6, padding: '0 8px', fontSize: 13,
                              fontFamily: 'inherit', textAlign: 'right', outline: 'none',
                            }}
                            placeholder="—"
                          />
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>만원</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b', maxWidth: 120 }}>{e.memo}</td>
                      <td>
                        <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(e.id)}>삭제</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 추가 모달 */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div className="modal-title">직원 추가</div>
            <div className="modal-desc">기존 재직자 정보를 입력합니다.</div>
            <div className="info-grid" style={{ marginBottom: 12 }}>
              <div>
                <div className="info-label">이름 *</div>
                <input className="info-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="홍길동" />
              </div>
              <div>
                <div className="info-label">파트 / 부서</div>
                <input className="info-input" value={form.part} onChange={e => setForm(p => ({ ...p, part: e.target.value }))} placeholder="생산1팀" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div className="info-label">직무유형</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['현장주간', '현장교대', '사무주간'].map(jt => (
                  <button key={jt} onClick={() => setForm(p => ({ ...p, jobType: jt }))} style={{
                    padding: '6px 14px', border: '1.5px solid', borderColor: form.jobType === jt ? '#0d9488' : '#e2e8f0',
                    borderRadius: 8, background: form.jobType === jt ? '#e6faf7' : '#fff',
                    color: form.jobType === jt ? '#0b7a70' : '#64748b',
                    fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
                  }}>{jt}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div className="info-label">총 경력</div>
              <div className="career-input-wrap">
                <input className="career-input" type="number" min="0" value={form.careerYears} onChange={e => setForm(p => ({ ...p, careerYears: e.target.value }))} placeholder="0" />
                <span className="career-unit">년</span>
                <input className="career-input" type="number" min="0" max="11" value={form.careerMonths} onChange={e => setForm(p => ({ ...p, careerMonths: e.target.value }))} placeholder="0" />
                <span className="career-unit">개월</span>
              </div>
            </div>
            <div className="info-grid" style={{ marginBottom: 12 }}>
              <div>
                <div className="info-label">현재 연봉 (만원)</div>
                <input className="info-input" type="number" step="100" value={form.currentSalary} onChange={e => setForm(p => ({ ...p, currentSalary: e.target.value }))} placeholder="3200" />
              </div>
              <div>
                <div className="info-label">메모</div>
                <input className="info-input" value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} placeholder="비고" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>취소</button>
              <button className="btn-primary" onClick={handleAdd} disabled={saving || !form.name.trim()}>
                {saving ? '저장 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
