import { useState } from 'react'
import { db } from '../firebase'
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useDemo } from '../context/DemoContext'
import { GRADE_STYLE, JT_TAG_STYLE, JT_COLOR } from '../utils/constants'
import { formatCareer, calcCurrentCareer } from '../utils/career'
import EvalResult from './EvalResult'

// 목록 상단 열별 필터 컨트롤 공통 스타일
const FILTER_INPUT = {
  width: '100%', minWidth: 0, height: 28, boxSizing: 'border-box',
  border: '1px solid #cbd5e1', borderRadius: 6, padding: '0 6px',
  fontSize: 12, fontFamily: 'inherit', fontWeight: 400, color: '#334155',
  background: '#fff', outline: 'none',
}

export default function Candidates({ candidates }) {
  const { isAdmin } = useAuth()
  const { demoMode, maskWon } = useDemo()
  const [confirmId, setConfirmId]         = useState(null)
  const [confirmSalary, setConfirmSalary] = useState('')
  const [saving, setSaving]               = useState(false)
  const [viewing, setViewing]             = useState(null)   // 상세보기 중인 후보
  const [filters, setFilters]             = useState({ name: '', part: '', jobType: '', grade: '' })

  // 평가자 추천 연봉 기본값 — 미설정 후보는 AI 추천연봉을 사용
  const evalOf = (c) => (c.evalSalary != null ? c.evalSalary : c.recSalary)

  const handleEvalSalaryChange = async (id, val) => {
    await updateDoc(doc(db, 'candidates', String(id)), { evalSalary: parseInt(val) || 0 })
  }

  const distinct = (key) => [...new Set(candidates.map(key).filter(Boolean))].sort()
  const filtered = candidates.filter(c =>
    (!filters.name    || (c.name || '').includes(filters.name)) &&
    (!filters.part    || c.part === filters.part) &&
    (!filters.jobType || c.jobType === filters.jobType) &&
    (!filters.grade   || c.grade === filters.grade)
  )

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
                  <th>점수</th><th>등급</th><th>AI 추천연봉</th><th>평가자 추천 연봉</th>
                  <th>평가일</th><th></th>
                </tr>
                <tr className="filter-row">
                  <th><input style={FILTER_INPUT} placeholder="이름" value={filters.name}
                    onChange={e => setFilters(f => ({ ...f, name: e.target.value }))} /></th>
                  <th>
                    <select style={FILTER_INPUT} value={filters.part}
                      onChange={e => setFilters(f => ({ ...f, part: e.target.value }))}>
                      <option value="">전체</option>
                      {distinct(c => c.part).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </th>
                  <th>
                    <select style={FILTER_INPUT} value={filters.jobType}
                      onChange={e => setFilters(f => ({ ...f, jobType: e.target.value }))}>
                      <option value="">전체</option>
                      {distinct(c => c.jobType).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </th>
                  <th></th>
                  <th></th>
                  <th>
                    <select style={FILTER_INPUT} value={filters.grade}
                      onChange={e => setFilters(f => ({ ...f, grade: e.target.value }))}>
                      <option value="">전체</option>
                      {distinct(c => c.grade).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </th>
                  <th></th><th></th><th></th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                    필터 조건에 맞는 후보가 없습니다.
                  </td></tr>
                )}
                {filtered.map(c => {
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
                      <td>{maskWon(c.recSalary, c.id)}만원</td>
                      <td>
                        {demoMode ? (
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#0b7a70' }}>
                            {maskWon(evalOf(c), 'eval-' + c.id)}만원
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number" step="100"
                              defaultValue={evalOf(c)}
                              onBlur={ev => handleEvalSalaryChange(c.id, ev.target.value)}
                              style={{
                                width: 84, height: 30, border: '1.5px solid #5eead4',
                                borderRadius: 6, padding: '0 8px', fontSize: 13, fontWeight: 600,
                                fontFamily: 'inherit', textAlign: 'right', outline: 'none', color: '#0b7a70',
                              }}
                            />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>만원</span>
                          </div>
                        )}
                      </td>
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
                              onClick={() => { setConfirmId(c.id); setConfirmSalary(String(evalOf(c))) }}
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
            <div className="modal-desc">평가자 추천 연봉이 기본값으로 채워집니다. 필요 시 수정 후 확정하면 현재 연봉으로 인원 현황에 이관됩니다.</div>
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
