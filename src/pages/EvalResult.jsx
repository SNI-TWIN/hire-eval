import { useState } from 'react'
import { Wrench, Clock, ArrowLeftRight, Lightbulb, CircleDot, Download } from 'lucide-react'
import { db } from '../firebase'
import { doc, setDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
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

export default function EvalResult({ result: r, onBack, onReset }) {
  const { params }          = useParams()
  const { user, isAdmin }   = useAuth()
  const [saved, setSaved]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState('')

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(''), 2500)
  }

  // 채용 후보로 저장 — candidates 컬렉션에 보관
  const handleSaveCandidate = async () => {
    if (saving) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'candidates', String(r.id)), {
        ...r, status: 'candidate', ownerUid: user?.uid || null, ownerEmail: user?.email || null,
      })
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
      await setDoc(doc(db, 'employees', String(r.id)), {
        id: r.id,
        name: r.name,
        part: r.part,
        jobType: r.jobType,
        careerYears: r.careerYears,
        careerMonths: r.careerMonths,
        careerInputDate: r.careerInputDate,
        careerLevel: r.careerLevel ?? null,   // 평가 시점 경력등급 스냅샷 (재계산 실패 시 폴백)
        currentSalary: r.recSalary,
        memo: `채용확정 (${r.grade}등급 · ${r.total}점)`,
        addedDate: new Date().toLocaleDateString('ko-KR'),
      })
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
      <div className="page-title">평가 결과</div>
      <div className="page-desc">입력 정보를 기반으로 산출된 종합 점수와 적정 연봉입니다.</div>

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
              {r.recSalary.toLocaleString()} 만원
            </div>
          )}
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            경력등급: <strong style={{ color: '#1a202c' }}>{r.careerLevel}</strong>
            {r.prevSalary > 0 && (
              <span style={{ marginLeft: 12 }}>기존연봉: <strong>{r.prevSalary.toLocaleString()}만원</strong></span>
            )}
          </div>
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
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: '#374151', width: 150, flexShrink: 0 }}>{it.name}</div>
                    <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pctItem}%`, maxWidth: '100%', height: 8, background: bc, borderRadius: 4, transition: 'width 0.8s' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', width: 120, flexShrink: 0 }}>{sel}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: s < 0 ? '#e53e3e' : '#1a202c', width: 40, textAlign: 'right' }}>
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
        <button className="btn-icon" onClick={() => exportEvalSheet(r, params)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> 엑셀 다운로드
        </button>
        <button className="btn-secondary" onClick={onBack}>← 평가 입력으로</button>
        <button className="btn-danger"    onClick={onReset}>초기화 후 새 입력</button>
        {toast && (
          <span style={{ fontSize: 13, color: toast.ok ? '#0b7a70' : '#e53e3e', fontWeight: 500 }}>
            {toast.msg}
          </span>
        )}
      </div>
    </div>
  )
}
