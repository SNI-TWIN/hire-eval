import { useState, useEffect } from 'react'
import { Building2, Timer, Briefcase } from 'lucide-react'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useParams } from '../context/ParamsContext'
import { calcCurrentCareer, totalCareerYears, getCareerLevel } from '../utils/career'
import { calcGrade, calcRecommendedSalary } from '../utils/salary'
import { CATEGORY_ITEMS, CATEGORY_NAMES, ITEM_NAMES, ITEM_DESCRIPTIONS, JT_COLOR, JT_TAG_STYLE } from '../utils/constants'
import EvalResult from './EvalResult'

const JOB_TYPES = [
  { id: '현장주간', Icon: Building2, desc: '현장 근무 · 주간' },
  { id: '현장교대', Icon: Timer,     desc: '현장 근무 · 교대' },
  { id: '사무주간', Icon: Briefcase, desc: '사무 기획 · 주간' },
]

const CERT_SUB_INIT = { type1: false, type2: false, extra3: false, extra4: false }

export default function EvalInput() {
  const { params } = useParams()
  const { isAdmin, part: myPart }     = useAuth()
  const [partList, setPartList]       = useState([])
  const [jobType, setJobType]         = useState(null)
  const [name, setName]               = useState('')
  const [part, setPart]               = useState(isAdmin ? '' : (myPart || ''))

  // 관리자는 파트 목록에서 선택, 파트장은 본인 파트 고정
  useEffect(() => {
    if (!isAdmin) return
    return onSnapshot(collection(db, 'parts'), s => {
      const rows = s.docs.map(d => ({ id: d.id, ...d.data() }))
      rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      setPartList(rows)
    })
  }, [isAdmin])
  const [careerYears, setCareerYears]   = useState('')
  const [careerMonths, setCareerMonths] = useState('')
  const [prevSalary, setPrevSalary]     = useState('')
  const [selections, setSelections]     = useState({})
  const [certSub, setCertSub]           = useState(CERT_SUB_INIT)
  const [error, setError]               = useState('')
  const [result, setResult]             = useState(null)

  const select = (itemKey, optionKey) => {
    setSelections(prev => {
      if (prev[itemKey] === optionKey) {
        const next = { ...prev }
        delete next[itemKey]
        return next
      }
      return { ...prev, [itemKey]: optionKey }
    })
    if (itemKey === 'certification') setCertSub(CERT_SUB_INIT)
  }

  const calcCertScore = (baseOpt, sub) => {
    if (!baseOpt) return 0
    const base = params.scoring.certification?.[baseOpt] ?? 0
    if (!sub.type1 && !sub.type2) return 0
    const adjusted = sub.type1 ? base : base * 0.5
    const bonus = (sub.extra3 ? 1 : 0) + (sub.extra4 ? 0.5 : 0)
    return adjusted + bonus
  }

  const calcTotal = (sels) => {
    let total = 0
    Object.entries(sels).forEach(([item, opt]) => {
      if (item === 'certification') {
        total += calcCertScore(opt, certSub)
      } else {
        total += params.scoring[item]?.[opt] ?? 0
      }
    })
    return total
  }

  const validate = () => {
    if (!jobType) return '직무유형을 선택해 주세요.'
    if (isAdmin && !part) return '파트를 선택해 주세요.'
    if (selections.certification && certSub.type1 && certSub.type2)
      return '자격증 항목: ①동종직무와 ②타직무는 동시에 선택할 수 없습니다.'
    const y = parseInt(careerYears) || 0
    const m = parseInt(careerMonths) || 0
    if (y === 0 && m === 0 && careerYears === '' && careerMonths === '')
      return '경력을 입력해 주세요. (신입이면 0년 0개월)'
    return ''
  }

  const handleCalc = () => {
    const err = validate()
    if (err) { setError(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setError('')

    const y = parseInt(careerYears) || 0
    const m = parseInt(careerMonths) || 0
    const inputDate = new Date().toISOString()
    const current   = calcCurrentCareer(y, m, inputDate)
    const totalYrs  = totalCareerYears(current.years, current.months)
    const level     = getCareerLevel(jobType, totalYrs, params.careerLevels)
    const total     = calcTotal(selections)
    const grade     = calcGrade(total, params.gradeThresholds)
    const recSalary = calcRecommendedSalary(level?.salary ?? 0, grade, parseInt(prevSalary) || 0, params.gradeRatio)

    const raw = {}
    Object.entries(selections).forEach(([item, opt]) => {
      raw[item] = item === 'certification'
        ? calcCertScore(opt, certSub)
        : (params.scoring[item]?.[opt] ?? 0)
    })

    const catScores = {}
    Object.entries(CATEGORY_ITEMS).forEach(([cat, items]) => {
      catScores[cat] = items.reduce((s, k) => s + (raw[k] ?? 0), 0)
    })

    setResult({
      id: Date.now(),
      name:   name.trim()  || '(이름 미입력)',
      part:   (isAdmin ? part : myPart) || '(파트 미입력)',
      jobType,
      careerYears: y,
      careerMonths: m,
      careerInputDate: inputDate,
      currentCareer: current,
      careerLevel: level?.label ?? '—',
      prevSalary: parseInt(prevSalary) || 0,
      selections,
      certSub,
      raw,
      catScores,
      total,
      grade,
      recSalary,
      date: new Date().toLocaleDateString('ko-KR'),
    })
  }

  const handleReset = () => {
    setJobType(null); setName(''); setPart(isAdmin ? '' : (myPart || ''))
    setCareerYears(''); setCareerMonths(''); setPrevSalary('')
    setSelections({}); setCertSub(CERT_SUB_INIT); setError(''); setResult(null)
  }

  if (result) return <EvalResult result={result} onBack={() => setResult(null)} onReset={handleReset} />

  const certError = !!(selections.certification && certSub.type1 && certSub.type2)

  return (
    <div>
      <div className="page-title">채용평가</div>
      <div className="page-desc">직무유형 선택 후 항목을 평가하면 점수를 자동으로 산출합니다.</div>

      {error && <div className="validation-msg">⚠ {error}</div>}

      {/* ① 직무유형 */}
      <div className="card">
        <div className="card-title">① 직무유형 선택 <span className="badge badge-warn">필수</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 14 }}>
          {JOB_TYPES.map(jt => (
            <div
              key={jt.id}
              onClick={() => { setJobType(prev => prev === jt.id ? null : jt.id); setError('') }}
              style={{
                border: `2px solid ${jobType === jt.id ? JT_COLOR[jt.id] : '#e2e8f0'}`,
                background: jobType === jt.id ? (JT_TAG_STYLE[jt.id]?.background ?? '#e6faf7') : '#fff',
                borderRadius: 12, padding: '22px 16px', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.18s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <jt.Icon size={30} color={jobType === jt.id ? JT_COLOR[jt.id] : '#94a3b8'} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: jobType === jt.id ? JT_COLOR[jt.id] : '#1a202c', marginBottom: 4 }}>{jt.id}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{jt.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ② 기본정보 */}
      <div className="card">
        <div className="card-title">② 지원자 기본 정보</div>
        <div className="info-grid" style={{ marginBottom: 16 }}>
          <div>
            <div className="info-label">지원자 이름</div>
            <input className="info-input" value={name} onChange={e => setName(e.target.value)} placeholder="이름 (선택)" />
          </div>
          <div>
            <div className="info-label">소속 파트 / 부서</div>
            {isAdmin ? (
              <select className="info-input" value={part} onChange={e => setPart(e.target.value)}>
                <option value="">파트 선택</option>
                {partList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            ) : (
              <input className="info-input" value={myPart || '(파트 미배정)'} readOnly
                style={{ background: '#f1f5f9', color: '#64748b' }} />
            )}
          </div>
        </div>
        <div className="info-grid">
          <div>
            <div className="info-label">총 경력</div>
            <div className="career-input-wrap">
              <input className="career-input" type="number" min="0" max="50"
                value={careerYears} onChange={e => setCareerYears(e.target.value)} placeholder="0" />
              <span className="career-unit">년</span>
              <input className="career-input" type="number" min="0" max="11"
                value={careerMonths} onChange={e => setCareerMonths(e.target.value)} placeholder="0" />
              <span className="career-unit">개월</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>신입이면 0년 0개월 입력 · 매달 자동 증가</div>
          </div>
          <div>
            <div className="info-label">기존 연봉 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(선택)</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="info-input" type="number" min="0" step="100"
                value={prevSalary} onChange={e => setPrevSalary(e.target.value)}
                placeholder="예) 3200" style={{ maxWidth: 160 }} />
              <span style={{ fontSize: 14, color: '#64748b' }}>만원</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>추천 연봉 산출 시 참고</div>
          </div>
        </div>
      </div>

      {/* ③ 면접 평가 항목 */}
      <div className="card-section">
        <div className="sect-header">③ 면접 평가 항목</div>
        <div className="sect-body">
          {Object.entries(CATEGORY_ITEMS).map(([cat, items], ci) => (
            <div key={cat} style={{ marginBottom: ci < 3 ? 28 : 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: '#1a202c',
                marginBottom: 14, paddingBottom: 8,
                borderBottom: '2px solid #f1f5f9',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ background: '#e6faf7', color: '#0b7a70', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                  {['①','②','③','④'][ci]}
                </span>
                {CATEGORY_NAMES[cat]}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {items.map(itemKey => {
                  const opts     = params.scoring[itemKey] ?? {}
                  const maxScore = Math.max(...Object.values(opts))

                  /* ─── 자격증 특수 카드 ─── */
                  if (itemKey === 'certification') {
                    const certFinal = calcCertScore(selections.certification, certSub)
                    return (
                      <div key={itemKey} style={{
                        border: `1px solid ${certError ? '#fca5a5' : '#e2e8f0'}`,
                        borderRadius: 12, padding: 18,
                        gridColumn: selections.certification ? '1 / -1' : 'auto',
                      }}>
                        {/* 항목 헤더 */}
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                          {ITEM_NAMES[itemKey]}
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>{maxScore}점</span>
                        </div>

                        {/* 기본 3가지 옵션 */}
                        <div className="radio-group">
                          {Object.entries(opts).map(([optKey, score]) => {
                            const isSel = selections[itemKey] === optKey
                            return (
                              <label key={optKey}
                                className={`radio-option${isSel ? ' selected' : ''}`}
                                onClick={() => select(itemKey, optKey)}
                              >
                                <div className="radio-dot" />
                                <span className="radio-text">{optKey}</span>
                                <span className="radio-score">{score}점</span>
                              </label>
                            )
                          })}
                        </div>

                        {/* 서브 체크 패널 — 기본 선택 후 열림 */}
                        {selections.certification && (
                          <div style={{
                            marginTop: 14, padding: 16,
                            background: '#f8fafc', borderRadius: 8,
                            border: `1px solid ${certError ? '#fca5a5' : '#e2e8f0'}`,
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                              자격증 세부 조건
                            </div>

                            {/* ①② 자격증 유형 */}
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                                자격증 유형
                                <span style={{ color: '#e53e3e', marginLeft: 6, fontWeight: 600 }}>① ② 중 하나 필수</span>
                              </div>
                              {[
                                { key: 'type1', num: '①', label: '동종직무 자격증', desc: '기본점수 그대로 적용' },
                                { key: 'type2', num: '②', label: '타직무 시설 자격증', desc: '기본점수의 50% 적용' },
                              ].map(({ key, num, label, desc }) => (
                                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                                  <input type="checkbox"
                                    checked={certSub[key]}
                                    onChange={() => setCertSub(p => ({ ...p, [key]: !p[key] }))}
                                    style={{ width: 16, height: 16, accentColor: '#0d9488', cursor: 'pointer', flexShrink: 0 }}
                                  />
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a202c' }}>{num} {label}</span>
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>— {desc}</span>
                                </label>
                              ))}
                              {certError && (
                                <div style={{ fontSize: 11, color: '#dc2626', padding: '6px 10px', background: '#fef2f2', borderRadius: 6, marginTop: 4 }}>
                                  ⚠ ①과 ②는 동시에 선택할 수 없습니다.
                                </div>
                              )}
                            </div>

                            {/* ③④ 추가 자격증 */}
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                                추가 자격증 보유 여부
                                <span style={{ color: '#94a3b8', marginLeft: 6 }}>(선택 · 중복 가능)</span>
                              </div>
                              {[
                                { key: 'extra3', num: '③', label: '기사 자격증 추가 보유',     bonus: '+1점' },
                                { key: 'extra4', num: '④', label: '산업기사 자격증 추가 보유', bonus: '+0.5점' },
                              ].map(({ key, num, label, bonus }) => (
                                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                                  <input type="checkbox"
                                    checked={certSub[key]}
                                    onChange={() => setCertSub(p => ({ ...p, [key]: !p[key] }))}
                                    style={{ width: 16, height: 16, accentColor: '#0d9488', cursor: 'pointer', flexShrink: 0 }}
                                  />
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a202c' }}>{num} {label}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0b7a70' }}>{bonus}</span>
                                </label>
                              ))}
                            </div>

                            {/* 실시간 점수 미리보기 */}
                            <div style={{
                              marginTop: 12, paddingTop: 12,
                              borderTop: '1px solid #e2e8f0',
                              display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10,
                            }}>
                              <span style={{ fontSize: 12, color: '#64748b' }}>최종 자격증 점수</span>
                              <span style={{ fontSize: 18, fontWeight: 700, color: certError ? '#dc2626' : '#0b7a70' }}>
                                {certError ? '오류' : `${certFinal}점`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }

                  /* ─── 일반 카드 ─── */
                  return (
                    <div key={itemKey} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 2 }}>
                        {ITEM_NAMES[itemKey]}
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>{maxScore}점</span>
                      </div>
                      {ITEM_DESCRIPTIONS[itemKey] && (
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>
                          {ITEM_DESCRIPTIONS[itemKey]}
                        </div>
                      )}
                      <div className="radio-group" style={{ marginTop: 10 }}>
                        {Object.entries(opts).map(([optKey, score]) => {
                          const isDeduct = score < 0
                          const isSel    = selections[itemKey] === optKey
                          return (
                            <label
                              key={optKey}
                              className={`radio-option${isSel ? ' selected' : ''}${isDeduct ? ' deduction' : ''}`}
                              onClick={() => select(itemKey, optKey)}
                            >
                              <div className="radio-dot" />
                              <span className="radio-text">{optKey}</span>
                              <span className="radio-score">{score >= 0 ? `${score}점` : `${score}점`}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="eval-actions" style={{ marginTop: 24 }}>
            <button className="btn-calc" onClick={handleCalc}>점수 산출 및 연봉 추천 →</button>
            <button className="btn-secondary" onClick={handleReset}>초기화</button>
          </div>
        </div>
      </div>
    </div>
  )
}
