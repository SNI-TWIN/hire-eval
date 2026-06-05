import { useState } from 'react'
import { db } from '../firebase'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { GRADE_STYLE, JT_TAG_STYLE, JT_COLOR } from '../utils/constants'
import { formatCareer, calcCurrentCareer } from '../utils/career'
import EvalResult from './EvalResult'

export default function Candidates({ candidates }) {
  const { isAdmin } = useAuth()
  const [confirmId, setConfirmId]         = useState(null)
  const [confirmSalary, setConfirmSalary] = useState('')
  const [saving, setSaving]               = useState(false)
  const [viewing, setViewing]             = useState(null)   // 상세보기 중인 후보

  // 채용 확정 — 인원 현황(employees)으로 이관 후 후보 목록에서 제거 (관리자 전용)
  const handleConfirm = async () => {
    if (!confirmId || !confirmSalary) return
    const c = candidates.find(x => String(x.id) === String(confirmId))
    if (!c) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'employees', String(c.id)), {
        id: Number(c.id) || c.id,
        name: c.name,
        part: c.part,
        jobType: c.jobType,
        careerYears: c.careerYears,
        careerMonths: c.careerMonths,
        careerInputDate: c.careerInputDate,
        careerLevel: c.careerLevel ?? null,   // 평가 시점 경력등급 스냅샷 (재계산 실패 시 폴백)
        currentSalary: parseInt(confirmSalary),
        memo: `채용확정 (${c.grade}등급 · ${c.total}점)`,
        addedDate: new Date().toLocaleDateString('ko-KR'),
      })
      await deleteDoc(doc(db, 'candidates', String(c.id)))
      setConfirmId(null)
      setConfirmSalary('')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('이 이력을 삭제하시겠습니까?')) return
    await deleteDoc(doc(db, 'candidates', String(id)))
  }

  // 상세보기 — 저장된 평가 결과를 그대로 다시 표시 (읽기 전용)
  if (viewing) {
    return <EvalResult result={viewing} viewMode onBack={() => setViewing(null)} />
  }

  return (
    <div>
      <div className="page-title">채용 후보 목록</div>
      <div className="page-desc">저장된 지원자 평가 이력입니다. 채용 확정 시 실제 연봉을 입력하면 인원 현황으로 이동합니다.</div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {candidates.length === 0 ? (
          <div className="table-empty">저장된 이력이 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>이름</th><th>파트</th><th>직무유형</th><th>경력</th>
                  <th>점수</th><th>등급</th><th>추천연봉</th>
                  <th>평가일</th><th></th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(c => {
                  const cur  = calcCurrentCareer(c.careerYears, c.careerMonths, c.careerInputDate)
                  const gs   = GRADE_STYLE[c.grade]
                  const jts  = JT_TAG_STYLE[c.jobType] || {}
                  const jtc  = JT_COLOR[c.jobType] || '#0d9488'
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.part}</td>
                      <td>
                        <span style={{ ...jts, padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                          {c.jobType}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {formatCareer(cur.years, cur.months)}
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.careerLevel}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: 15, color: jtc }}>{c.total}점</span>
                      </td>
                      <td>
                        <span className="grade-badge" style={gs}>{c.grade}</span>
                      </td>
                      <td>{c.recSalary.toLocaleString()}만원</td>
                      <td style={{ fontSize: 12, color: '#94a3b8' }}>{c.date}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            style={{
                              padding: '4px 10px', background: '#f1f5f9', border: 'none',
                              borderRadius: 6, color: '#475569', fontSize: 12, cursor: 'pointer',
                              fontFamily: 'inherit', fontWeight: 600,
                            }}
                            onClick={() => setViewing(c)}
                          >
                            상세정보
                          </button>
                          {isAdmin && (
                            <button
                              style={{
                                padding: '4px 10px', background: '#ede9fe', border: 'none',
                                borderRadius: 6, color: '#5b21b6', fontSize: 12, cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                              onClick={() => { setConfirmId(c.id); setConfirmSalary(String(c.recSalary)) }}
                            >
                              확정 입력
                            </button>
                          )}
                          <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => handleDelete(c.id)}>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 채용 확정 모달 */}
      {confirmId && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title">채용 확정</div>
            <div className="modal-desc">실제 확정된 연봉을 입력하세요. 확정 시 인원 현황으로 이동합니다.</div>
            <div className="info-label">확정 연봉 (만원)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input
                className="info-input"
                type="number" step="100"
                value={confirmSalary}
                onChange={e => setConfirmSalary(e.target.value)}
                style={{ maxWidth: 160 }}
              />
              <span style={{ fontSize: 14, color: '#64748b' }}>만원</span>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmId(null)}>취소</button>
              <button className="btn-primary" onClick={handleConfirm} disabled={saving}>
                {saving ? '저장 중...' : '확정 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
