import { useState } from 'react'
import { db } from '../firebase'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { GRADE_STYLE, GRADE_NAMES, JT_TAG_STYLE, JT_COLOR } from '../utils/constants'
import { formatCareer, calcCurrentCareer } from '../utils/career'

export default function Candidates({ candidates, onPage }) {
  const [filter, setFilter]             = useState('all')
  const [confirmId, setConfirmId]       = useState(null)
  const [confirmSalary, setConfirmSalary] = useState('')
  const [saving, setSaving]             = useState(false)

  const filtered = candidates.filter(c =>
    filter === 'all' ? true : c.status === filter
  )

  const handleConfirm = async () => {
    if (!confirmId || !confirmSalary) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'candidates', String(confirmId)), {
        status: 'confirmed',
        confirmedSalary: parseInt(confirmSalary),
        confirmedDate: new Date().toLocaleDateString('ko-KR'),
      })
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

  return (
    <div>
      <div className="page-title">채용 후보 목록</div>
      <div className="page-desc">저장된 지원자 평가 이력입니다. 채용 확정 시 실제 연봉을 입력하세요.</div>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['all','전체'], ['candidate','채용 후보'], ['confirmed','채용 확정']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            style={{
              padding: '6px 16px', borderRadius: 8, border: '1.5px solid',
              borderColor: filter === v ? '#0d9488' : '#e2e8f0',
              background: filter === v ? '#e6faf7' : '#fff',
              color: filter === v ? '#0b7a70' : '#64748b',
              fontFamily: 'inherit', fontSize: 13, fontWeight: filter === v ? 600 : 400, cursor: 'pointer',
            }}
          >
            {l}
            <span style={{
              marginLeft: 6, fontSize: 11, background: filter === v ? '#0d9488' : '#f1f5f9',
              color: filter === v ? '#fff' : '#64748b', padding: '0 5px', borderRadius: 8,
            }}>
              {v === 'all' ? candidates.length : candidates.filter(c => c.status === v).length}
            </span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="table-empty">저장된 이력이 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>이름</th><th>파트</th><th>직무유형</th><th>경력</th>
                  <th>점수</th><th>등급</th><th>추천연봉</th><th>확정연봉</th>
                  <th>평가일</th><th>상태</th><th></th>
                </tr>
              </thead>
              <tbody>
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
                      <td>{c.recSalary.toLocaleString()}만원</td>
                      <td>
                        {c.status === 'confirmed' ? (
                          <span style={{ fontWeight: 600, color: '#0b7a70' }}>
                            {c.confirmedSalary ? `${c.confirmedSalary.toLocaleString()}만원` : '—'}
                          </span>
                        ) : (
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
                      </td>
                      <td style={{ fontSize: 12, color: '#94a3b8' }}>{c.date}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: c.status === 'confirmed' ? '#e6faf7' : '#fef9c3',
                          color: c.status === 'confirmed' ? '#0b7a70' : '#854d0e',
                        }}>
                          {c.status === 'confirmed' ? '확정' : '후보'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleDelete(c.id)}>
                          삭제
                        </button>
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
            <div className="modal-desc">실제 확정된 연봉을 입력하세요.</div>
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
