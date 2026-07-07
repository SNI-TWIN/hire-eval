import { useState } from 'react'
import { Wrench, Clock, ArrowLeftRight, Lightbulb, CircleDot, Download } from 'lucide-react'
import { db } from '../firebase'
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore'
import { logAudit } from '../utils/audit'
import { useAuth } from '../context/AuthContext'
import { useDemo } from '../context/DemoContext'
import { GRADE_STYLE, GRADE_NAMES, JT_COLOR, JT_TAG_STYLE } from '../utils/constants'
import { buildEvalSchema } from '../utils/schema'
import { useParams } from '../context/ParamsContext'
import { formatCareer } from '../utils/career'
import { exportEvalSheet } from '../utils/excel'

const SUMMARIES = {
  S: '탁월한 역량을 보유한 지원자입니다. 즉시 투입 가능하며 장기 계약 또는 정규직 전환 검토를 권장합니다.',
  A: '우수한 역량을 갖춘 지원자로 대부분의 업무를 독립적으로 수행할 수 있습니다. 적극적인 채용을 권장합니다.',
  B: '양호한 수준의 역량을 보유하고 있습니다. 일부 교육 지원 시 충분한 성과를 기대할 수 있습니다.',
  C: '기본 역량은 갖추고 있으나 보완이 필요합니다. 채용 시 온보딩 계획을 별도 수립하는 것을 권장합니다.',
  D: '역량 보완이 많이 필요합니다. 직무 적합성 재검토 또는 채용 보류를 권장합니다.',
}

const CAT_ICONS = {
  jobSkill:       Wrench,
  sincerity:      Clock,
  adaptability:   ArrowLeftRight,
  problemSolving: Lightbulb,
}
const catIcon = key => CAT_ICONS[key] ?? CircleDot

export default function EvalResult({ result: r, onBack, onReset, viewMode = false }) {
  const { params }          = useParams()
  const { user, isAdmin }   = useAuth()
  const { demoMode, maskWon } = useDemo()
  const [saved, setSaved]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState('')
  // 평가자가 종합 판단으로 정하는 추천 연봉 (기본값은 AI 추천연봉)
  const [evalSalary, setEvalSalary] = useState(
    r.evalSalary != null ? String(r.evalSalary) : (r.grade === 'D' ? '' : String(r.recSalary))
  )

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(''), 2500)
  }

  // 상세보기(저장된 후보)에서 평가자 추천 연봉 수정 시 즉시 저장
  const handleEvalSalaryBlur = async () => {
    if (!viewMode) return
    try {
      const next = parseInt(evalSalary) || 0
      await updateDoc(doc(db, 'candidates', String(r.id)), { evalSalary: next })
      logAudit('후보 추천연봉 수정', { type: 'candidates', id: r.id, name: r.name }, `→ ${next.toLocaleString()}만원`)
      showToast('평가자 추천 연봉을 저장했습니다.')
    } catch (e) {
      showToast('저장 실패: ' + e.message, false)
    }
  }

  // 채용 후보로 저장 — candidates 컬렉션에 보관 (자동 ID — Date.now() 충돌 방지)
  const handleSaveCandidate = async () => {
    if (saving) return
    setSaving(true)
    try {
      const ref = doc(collection(db, 'candidates'))
      await setDoc(ref, {
        ...r,
        id: ref.id,
        createdAt: new Date().toISOString(),
        evalSalary: parseInt(evalSalary) || r.recSalary,
        status: 'candidate', ownerUid: user?.uid || null, ownerEmail: user?.email || null,
      })
      logAudit('후보 저장', { type: 'candidates', id: ref.id, name: r.name }, `${r.part} · ${r.grade}등급 ${r.total}점`)
      setSaved(true)
      showToast('채용 후보로 저장되었습니다.')
    } catch (e) {
      showToast('저장 실패: ' + e.message, false)
    } finally {
      setSaving(false)
    }
  }

  // 채용 확정 — 인원 현황(employees)에 바로 등록 (관리자 전용)
  const handleConfirm = async () => {
    if (saving) return
    setSaving(true)
    try {
      const ref = doc(collection(db, 'employees'))   // 자동 ID
      const salary = parseInt(evalSalary) || r.recSalary
      await setDoc(ref, {
        id: ref.id,
        name: r.name,
        part: r.part,
        jobType: r.jobType,
        careerYears: r.careerYears,
        careerMonths: r.careerMonths,
        careerInputDate: r.careerInputDate,
        careerLevel: r.careerLevel ?? null,   // 평가 시점 경력등급 스냅샷 (재계산 실패 시 폴백)
        currentSalary: salary,   // 평가자 추천 연봉을 현재연봉으로 이관
        memo: `채용확정 (${r.grade}등급 · ${r.total}점)`,
        createdAt: new Date().toISOString(),
        addedDate: new Date().toLocaleDateString('ko-KR'),
      })
      logAudit('채용 확정', { type: 'employees', id: ref.id, name: r.name },
        `${r.part} · ${r.grade}등급 ${r.total}점 · 확정연봉 ${salary.toLocaleString()}만원`)
      setSaved(true)
      showToast('채용 확정 — 인원 현황에 등록되었습니다.')
    } catch (e) {
      showToast('확정 실패: ' + e.message, false)
    } finally {
      setSaving(false)
    }
  }

  const schema  = buildEvalSchema(params)
  const jtColor = JT_COLOR[r.jobType] || '#0d9488'
  const jtStyle = JT_TAG_STYLE[r.jobType] || {}
  const gs      = GRADE_STYLE[r.grade]
  const circ    = 2 * Math.PI * 68
  const offset  = circ - (r.total / 100) * circ

  return (
    <div>
      <div className="page-title">{viewMode ? '평가 상세' : '평가 결과'}</div>
      <div className="page-desc">
        {viewMode
          ? '저장된 채용 후보의 평가 상세 내역입니다.'
          : '입력 정보를 기반으로 산출된 종합 점수와 적정 연봉입니다.'}
      </div>

      {/* 지원자 정보 바 */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '12px 18px', display: 'flex', gap: 24, marginBottom: 16,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {r.name !== '(이름 미입력)' && (
          <span style={{ fontSize: 13, color: '#64748b' }}>이름: <strong style={{ color: '#1a202c' }}>{r.name}</strong></span>
        )}
        {r.part !== '(파트 미입력)' && (
          <span style={{ fontSize: 13, color: '#64748b' }}>파트: <strong style={{ color: '#1a202c' }}>{r.part}</strong></span>
        )}
        <span>
          <span style={{ ...jtStyle, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{r.jobType}</span>
        </span>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          경력: <strong style={{ color: '#1a202c' }}>{formatCareer(r.currentCareer.years, r.currentCareer.months)}</strong>
          <span style={{ marginLeft: 6, fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: 6 }}>
            {r.careerLevel}
          </span>
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>평가일: {r.date}</span>
      </div>

      {/* 점수 + 연봉 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* 원형 점수 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: 500 }}>종합 평가 점수</div>
          <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 12 }}>
            <svg viewBox="0 0 160 160" width="160" height="160">
              <circle cx="80" cy="80" r="68" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle cx="80" cy="80" r="68" fill="none" stroke={jtColor} strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
              <div style={{ fontSize: 38, fontWeight: 700, color: '#1a202c', lineHeight: 1 }}>{r.total}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>/ 100</div>
            </div>
          </div>
          <div style={{ ...gs, padding: '6px 20px', borderRadius: 20, fontSize: 15, fontWeight: 600 }}>
            {GRADE_NAMES[r.grade]}
          </div>
          {r.grade === 'D' && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#9b1c1c', background: '#fef2f2', padding: '4px 12px', borderRadius: 6 }}>
              채용 불가 (55점 미만)
            </div>
          )}
        </div>

        {/* 연봉 */}
        <div className="card">
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>적정 연봉 추천</div>
          {r.grade === 'D' ? (
            <div style={{ fontSize: 22, fontWeight: 700, color: '#9b1c1c', marginBottom: 4 }}>채용 불가</div>
          ) : (
            <div style={{ fontSize: 30, fontWeight: 700, color: jtColor, marginBottom: 4, letterSpacing: '-0.5px' }}>
              {maskWon(r.recSalary, r.id)} 만원
            </div>
          )}
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            경력등급: <strong style={{ color: '#1a202c' }}>{r.careerLevel}</strong>
            {r.prevSalary > 0 && (
              <span style={{ marginLeft: 12 }}>기존연봉: <strong>{maskWon(r.prevSalary, 'prev-' + r.id)}만원</strong></span>
            )}
          </div>

          {/* 평가자 추천 연봉 — AI 추천을 참고해 평가자가 종합 판단으로 최종 결정 */}
          {r.grade !== 'D' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
              padding: '12px 14px', background: '#f0fdfa', border: '1px solid #99e6d9',
              borderRadius: 8, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0b7a70' }}>평가자 추천 연봉</span>
              {demoMode ? (
                <span style={{ fontSize: 18, fontWeight: 700, color: '#0b7a70' }}>
                  {maskWon(parseInt(evalSalary) || r.recSalary, 'eval-' + r.id)}
                </span>
              ) : (
                <input
                  type="number" step="100" inputMode="numeric"
                  value={evalSalary}
                  onChange={e => setEvalSalary(e.target.value)}
                  onBlur={handleEvalSalaryBlur}
                  style={{
                    width: 120, height: 34, border: '1.5px solid #5eead4', borderRadius: 6,
                    padding: '0 10px', fontSize: 16, fontWeight: 700, textAlign: 'right',
                    color: '#0b7a70', outline: 'none', fontFamily: 'inherit', background: '#fff',
                  }}
                />
              )}
              <span style={{ fontSize: 13, color: '#0b7a70' }}>만원</span>
              <span style={{ fontSize: 11, color: '#5b9d92', marginLeft: 'auto' }}>
                AI 추천을 참고해 평가자가 최종 판단{viewMode && !demoMode ? ' · 수정 시 자동 저장' : ''}
              </span>
            </div>
          )}

          {/* 시연 모드: 산출 근거에 실제 연봉밴드 금액이 노출되므로 숨김 */}
          {demoMode && r.grade !== 'D' && (
            <div style={{
              background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8,
              padding: '12px 14px', marginBottom: 20, fontSize: 12, color: '#94a3b8',
            }}>
              🔒 시연 모드에서는 연봉 산출 근거를 숨깁니다.
            </div>
          )}

          {/* 추천 연봉 계산 근거 — 왜 이 금액인지 단계별로 표시 */}
          {!demoMode && r.grade !== 'D' && r.recDetail && (() => {
            const d = r.recDetail
            const pct = (v) => `${Math.round(v * 100)}%`
            const won = (v) => `${Math.round(v).toLocaleString()}만원`
            return (
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '12px 14px', marginBottom: 20, fontSize: 12, color: '#475569', lineHeight: 1.85,
              }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CircleDot size={12} /> 추천 연봉 계산 근거
                </div>
                <div>
                  ① 경력등급 <strong style={{ color: '#1a202c' }}>{r.careerLevel}</strong> 연봉밴드:{' '}
                  <strong>{won(d.floor)}</strong> ~ <strong>{won(d.top)}</strong>
                  {d.isTopBand && <span style={{ color: '#94a3b8' }}> (최상위 등급 — 상한 가상 +10%)</span>}
                  {' '}<span style={{ color: '#94a3b8' }}>· 밴드폭 {won(d.band)}</span>
                </div>
                <div>
                  ② 면접등급 <strong style={{ color: '#1a202c' }}>{r.grade}</strong> 밴드 내 위치:{' '}
                  <strong>{pct(d.basePos)}</strong>
                  {' '}→ {won(d.floor)} + {won(d.band)} × {pct(d.basePos)} = <strong>{won(d.baseAmt)}</strong>
                </div>
                {d.bumped && (
                  <div style={{ color: '#0b7a70' }}>
                    ③ 기존연봉({r.prevSalary.toLocaleString()}만원)이 더 높아 한 등급 상향{' '}
                    (<strong>{r.grade} → {d.appliedGrade}</strong>, 위치 {pct(d.appliedPos)})
                  </div>
                )}
                <div style={{ marginTop: 4, paddingTop: 6, borderTop: '1px dashed #e2e8f0' }}>
                  {d.bumped ? '④' : '③'} {d.roundUnit}만원 단위 반올림
                  {d.capped && <span> 후 상한({won(d.ceiling)}) 미만 보정</span>} →{' '}
                  <strong style={{ color: '#1a202c' }}>{r.recSalary.toLocaleString()}만원</strong>
                </div>
              </div>
            )
          })()}

          {/* 채용 불가(D) 근거 — 연봉 산정이 아니라 기준 미달임을 설명 */}
          {r.grade === 'D' && (() => {
            const cMin = params.gradeThresholds?.C ?? 55
            return (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                padding: '12px 14px', marginBottom: 20, fontSize: 12, color: '#9b1c1c', lineHeight: 1.85,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CircleDot size={12} /> 채용 불가 판정 근거
                </div>
                <div>
                  종합점수 <strong>{r.total}점</strong> &lt; 채용 가능 최저 기준{' '}
                  <strong>{cMin}점 (C등급)</strong> → 연봉 산정 제외 (채용 불가)
                </div>
              </div>
            )
          })()}
          {/* 카테고리별 소계 바 */}
          {schema.map(cat => {
            const score = r.catScores[cat.key] ?? 0
            const maxPossible = cat.items.reduce((s, it) =>
              s + Math.max(0, ...Object.values(it.options).map(Number)), 0)
            const pct = maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 0
            const barColor = pct >= 75 ? '#0d9488' : pct >= 50 ? '#3b82f6' : pct >= 33 ? '#f59e0b' : '#ef4444'
            const Icon = catIcon(cat.key)
            return (
              <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 12, width: 90, color: '#374151', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon size={13} style={{ flexShrink: 0 }} />
                  {cat.name}
                </div>
                <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: 8, background: barColor, borderRadius: 4, transition: 'width 0.8s' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a202c', width: 36, textAlign: 'right' }}>{score}점</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 항목별 상세 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">항목별 점수 상세</div>
        {schema.map(cat => {
          const Icon = catIcon(cat.key)
          return (
            <div key={cat.key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon size={13} />
                {cat.name}
              </div>
              {cat.items.map(it => {
                const k    = it.key
                const s    = r.raw[k] ?? 0
                const maxS = Math.max(1, ...Object.values(it.options).map(Number))
                const pctItem = Math.max(0, Math.round((s / maxS) * 100))
                const bc   = pctItem >= 75 ? '#0d9488' : pctItem >= 50 ? '#3b82f6' : pctItem >= 25 ? '#f59e0b' : s < 0 ? '#ef4444' : '#94a3b8'
                const sel  = r.selections[k] ?? '—'
                return (
                  <div key={k} className="detail-row">
                    <div className="detail-name">{it.name}</div>
                    <div className="detail-track">
                      <div style={{ width: `${pctItem}%`, maxWidth: '100%', height: 8, background: bc, borderRadius: 4, transition: 'width 0.8s' }} />
                    </div>
                    <div className="detail-sel">{sel}</div>
                    <div className="detail-score" style={{ color: s < 0 ? '#e53e3e' : '#1a202c' }}>
                      {s >= 0 ? `+${s}` : s}점
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* 종합 의견 */}
      <div style={{ background: '#f0fdfa', border: '1px solid #99e6d9', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0b7a70', marginBottom: 8 }}>종합 의견</div>
        <div style={{ fontSize: 13, color: '#2d6e60', lineHeight: 1.8 }}>
          {r.name !== '(이름 미입력)' && <strong>{r.name}</strong>} 지원자의{' '}
          <strong>{r.jobType}</strong> 직무 평가 결과입니다. {SUMMARIES[r.grade]}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {viewMode ? (
          <>
            <button className="btn-secondary" onClick={onBack}>← 목록으로</button>
            <button className="btn-icon" onClick={() => exportEvalSheet(r, params)} disabled={demoMode}
              title={demoMode ? '시연 모드에서는 실제 연봉 유출을 막기 위해 내보내기가 비활성화됩니다' : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 6, ...(demoMode ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}>
              <Download size={14} /> 엑셀 다운로드
            </button>
            {toast && (
              <span style={{ fontSize: 13, color: toast.ok ? '#0b7a70' : '#e53e3e', fontWeight: 500 }}>
                {toast.msg}
              </span>
            )}
          </>
        ) : (
          <>
            {!saved ? (
              <>
                <button className="btn-primary" onClick={handleSaveCandidate} disabled={saving}>
                  채용 후보 저장
                </button>
                {isAdmin && (
                  <button
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
                    onClick={handleConfirm}
                    disabled={saving || r.grade === 'D'}
                  >
                    채용 확정 저장
                  </button>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#0b7a70', fontWeight: 500, background: '#e6faf7', padding: '8px 16px', borderRadius: 8 }}>
                저장 완료
              </div>
            )}
            <button className="btn-icon" onClick={() => exportEvalSheet(r, params)} disabled={demoMode}
              title={demoMode ? '시연 모드에서는 실제 연봉 유출을 막기 위해 내보내기가 비활성화됩니다' : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 6, ...(demoMode ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}>
              <Download size={14} /> 엑셀 다운로드
            </button>
            <button className="btn-secondary" onClick={onBack}>← 평가 입력으로</button>
            <button className="btn-danger"    onClick={onReset}>초기화 후 새 입력</button>
            {toast && (
              <span style={{ fontSize: 13, color: toast.ok ? '#0b7a70' : '#e53e3e', fontWeight: 500 }}>
                {toast.msg}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
