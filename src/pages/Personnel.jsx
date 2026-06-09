import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, query, where, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { calcCurrentCareer, formatCareer, totalCareerYears } from '../utils/career'
import { useParams } from '../context/ParamsContext'
import { useDemo } from '../context/DemoContext'
import { getCareerLevel } from '../utils/career'
import { JT_TAG_STYLE, JT_COLOR } from '../utils/constants'
import { exportPersonnelCSV } from '../utils/excel'
import { useGrid } from '../utils/useGrid'
import { GridTH } from '../components/GridHeader'

// 인라인 편집용 텍스트 입력 공통 스타일
const CELL_INPUT = {
  height: 30, border: '1.5px solid #e2e8f0', borderRadius: 6,
  padding: '0 8px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

// 경력(년/개월) 인라인 편집기 — 두 값을 로컬 상태로 함께 들고 있다가 변경 시 한 번에 커밋.
// (각 input이 closure의 e.career*를 참조하면, 스냅샷 왕복 전 연속 수정 시 한쪽이 덮어써지는 문제가 있어 분리)
function CareerEditor({ years, months, onCommit }) {
  const [y, setY] = useState(String(years ?? 0))
  const [m, setM] = useState(String(months ?? 0))
  const commit = () => {
    const ny = parseInt(y) || 0
    const nm = parseInt(m) || 0
    if (ny !== (years || 0) || nm !== (months || 0)) onCommit(ny, nm)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>입력:</span>
      <input type="number" min="0" max="50" value={y}
        onChange={e => setY(e.target.value)} onBlur={commit}
        style={{ ...CELL_INPUT, width: 44, textAlign: 'center', fontSize: 12 }} />
      <span style={{ fontSize: 11, color: '#94a3b8' }}>년</span>
      <input type="number" min="0" max="11" value={m}
        onChange={e => setM(e.target.value)} onBlur={commit}
        style={{ ...CELL_INPUT, width: 44, textAlign: 'center', fontSize: 12 }} />
      <span style={{ fontSize: 11, color: '#94a3b8' }}>개월</span>
    </div>
  )
}

export default function Personnel() {
  const { isAdmin, part } = useAuth()
  const { params }  = useParams()
  const { demoMode, maskWon, shownSalary } = useDemo()
  const [employees, setEmployees] = useState([])
  const [partList, setPartList]   = useState([])
  const [showAdd, setShowAdd]     = useState(false)
  const [form, setForm]           = useState({ name: '', part: '', jobType: '현장주간', careerYears: '', careerMonths: '', currentSalary: '', memo: '' })
  const [saving, setSaving]       = useState(false)

  // 파트 목록 (직원 추가/수정 시 드롭다운 · 채용평가와 동일 소스)
  useEffect(() => onSnapshot(collection(db, 'parts'), s => {
    const rows = s.docs.map(d => ({ id: d.id, ...d.data() }))
    rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    setPartList(rows)
  }), [])

  // 관리자는 전체, 일반 사용자는 자기 파트만 (서버 규칙과 동일하게 클라이언트에서도 필터)
  useEffect(() => {
    if (!isAdmin && !part) return   // 파트 미배정: 구독 안 함 (빈 목록 유지)
    const ref = isAdmin
      ? collection(db, 'employees')
      : query(collection(db, 'employees'), where('part', '==', part))
    return onSnapshot(ref, snap => {
      const rows = snap.docs.map(d => d.data())
      rows.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
      setEmployees(rows)
    })
  }, [isAdmin, part])

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

  const handleJobTypeChange = async (id, val) => {
    await updateDoc(doc(db, 'employees', String(id)), { jobType: val })
  }

  // 기준연봉을 제외한 항목 인라인 수정 (이름·파트·메모 등)
  const handleField = async (id, field, val) => {
    await updateDoc(doc(db, 'employees', String(id)), { [field]: val })
  }

  // 경력 수정 — 입력 시점(careerInputDate)을 현재로 갱신해 입력값이 곧 현재 경력이 되도록
  const handleCareerChange = async (id, years, months) => {
    await updateDoc(doc(db, 'employees', String(id)), {
      careerYears: parseInt(years) || 0,
      careerMonths: parseInt(months) || 0,
      careerInputDate: new Date().toISOString(),
    })
  }

  // 재계산 시 경력등급을 산출할 수 있는 직무유형 목록 (드롭다운 = 재계산과 항상 일치)
  const jobTypeKeys = Object.keys(params.careerLevels || {})

  const handleDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await deleteDoc(doc(db, 'employees', String(id)))
  }

  // 파생 필드(현재경력·경력등급) 계산
  const rows = employees.map(e => {
    const cur   = calcCurrentCareer(e.careerYears, e.careerMonths, e.careerInputDate)
    const yrs   = totalCareerYears(cur.years, cur.months)
    const level = getCareerLevel(e.jobType, yrs, params.careerLevels)
    const levelLabel = level?.label ?? e.careerLevel ?? '—'
    return { e, cur, level, levelLabel }
  })

  // 정렬·필터 기준 (연봉은 화면에 보이는 값과 일치 → 시연모드에서 실제값 누수 없음)
  const baseSeed = r => 'base-' + r.e.jobType + '-' + r.levelLabel
  const columns = [
    { key: 'name',     label: '이름',     get: r => r.e.name },
    { key: 'part',     label: '파트',     get: r => r.e.part },
    { key: 'jobType',  label: '직무유형', get: r => r.e.jobType },
    { key: 'career',   label: '현재 경력', get: r => r.cur.totalMonths, text: r => formatCareer(r.cur.years, r.cur.months) },
    { key: 'level',    label: '경력등급', get: r => r.levelLabel },
    { key: 'baseSalary', label: '기준연봉', align: 'right',
      get:  r => r.level ? (shownSalary(r.level.salary, baseSeed(r)) ?? -1) : -1,
      text: r => r.level ? `${maskWon(r.level.salary, baseSeed(r))}만원` : '—' },
    { key: 'currentSalary', label: '현재연봉', align: 'right',
      get:  r => shownSalary(r.e.currentSalary, r.e.id) ?? -1,
      text: r => `${maskWon(r.e.currentSalary, r.e.id)}만원` },
    { key: 'memo',     label: '메모',     get: r => r.e.memo || '' },
  ]
  const grid = useGrid(rows, columns)

  // 모든 훅 호출 이후에 조건부 반환 (rules-of-hooks 준수)
  if (!isAdmin && !part) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>배정된 파트가 없어 조회할 인원이 없습니다.</div>

  return (
    <div>
      <div className="page-title">인원 현황</div>
      <div className="page-desc">
        {isAdmin
          ? '기존 재직자 및 채용 확정자의 경력과 현재 연봉을 관리합니다. 경력은 입력 시점 기준 자동 증가합니다.'
          : `${part} 파트 재직자 현황입니다. 경력은 입력 시점 기준 자동 증가합니다. (조회 전용)`}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
        <button className="btn-icon" onClick={() => exportPersonnelCSV(employees)}>📥 CSV 내보내기</button>
        {isAdmin && <button className="btn-primary" onClick={() => setShowAdd(true)}>+ 직원 추가</button>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {employees.length === 0 ? (
          <div className="table-empty">등록된 직원이 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map(c => <GridTH key={c.key} col={c} grid={grid} />)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grid.view.length === 0 && (
                  <tr><td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                    필터 조건에 맞는 직원이 없습니다.
                  </td></tr>
                )}
                {grid.view.map(({ e, cur, level, levelLabel }) => {
                  const jts = JT_TAG_STYLE[e.jobType] || {}
                  const partInList = partList.some(p => p.name === e.part)
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>
                        {isAdmin ? (
                          <input
                            defaultValue={e.name}
                            onBlur={ev => { const v = ev.target.value.trim(); if (v && v !== e.name) handleField(e.id, 'name', v) }}
                            style={{ ...CELL_INPUT, width: 84, fontWeight: 600 }}
                          />
                        ) : e.name}
                      </td>
                      <td>
                        {isAdmin ? (
                          <select
                            value={partInList ? e.part : ''}
                            onChange={ev => handleField(e.id, 'part', ev.target.value)}
                            style={{ ...CELL_INPUT, width: 110, cursor: 'pointer',
                              border: partInList ? '1.5px solid #e2e8f0' : '1.5px solid #fca5a5' }}
                          >
                            {!partInList && <option value="" disabled>{e.part || '파트 선택'}</option>}
                            {partList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        ) : e.part}
                      </td>
                      <td>
                        {isAdmin ? (
                          <select
                            value={jobTypeKeys.includes(e.jobType) ? e.jobType : ''}
                            onChange={ev => handleJobTypeChange(e.id, ev.target.value)}
                            style={{
                              ...jts, padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                              border: jobTypeKeys.includes(e.jobType) ? '1px solid transparent' : '1px solid #fca5a5',
                              fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                              color: jobTypeKeys.includes(e.jobType) ? (jts.color || '#1a202c') : '#b91c1c',
                            }}
                          >
                            <option value="" disabled>직무 선택</option>
                            {jobTypeKeys.map(jt => <option key={jt} value={jt}>{jt}</option>)}
                          </select>
                        ) : (
                          <span style={{ ...jts, padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                            {e.jobType}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {formatCareer(cur.years, cur.months)}
                        {isAdmin ? (
                          <CareerEditor
                            key={`${e.careerYears}-${e.careerMonths}-${e.careerInputDate}`}
                            years={e.careerYears}
                            months={e.careerMonths}
                            onCommit={(y, m) => handleCareerChange(e.id, y, m)}
                          />
                        ) : (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>입력: {formatCareer(e.careerYears, e.careerMonths)}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 600, color: JT_COLOR[e.jobType] || '#0d9488' }}>
                          {levelLabel}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {level ? `${maskWon(level.salary, 'base-' + e.jobType + '-' + levelLabel)}만원` : '—'}
                      </td>
                      <td>
                        {demoMode ? (
                          <span style={{ fontSize: 13 }}>{maskWon(e.currentSalary, e.id)}만원</span>
                        ) : isAdmin ? (
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
                        ) : (
                          <span style={{ fontSize: 13 }}>
                            {e.currentSalary ? `${e.currentSalary.toLocaleString()}만원` : '—'}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b', maxWidth: 140 }}>
                        {isAdmin ? (
                          <input
                            defaultValue={e.memo || ''}
                            onBlur={ev => { if (ev.target.value !== (e.memo || '')) handleField(e.id, 'memo', ev.target.value) }}
                            placeholder="비고"
                            style={{ ...CELL_INPUT, width: 130, fontSize: 12, color: '#64748b' }}
                          />
                        ) : e.memo}
                      </td>
                      <td>
                        {isAdmin && (
                          <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(e.id)}>삭제</button>
                        )}
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
                <div className="info-label">파트</div>
                <select className="info-input" value={form.part} onChange={e => setForm(p => ({ ...p, part: e.target.value }))}>
                  <option value="">파트 선택</option>
                  {partList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
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
