import { useState } from 'react'
import { useParams } from '../context/ParamsContext'
import { calcCurrentCareer, formatCareer, totalCareerYears, getCareerLevel } from '../utils/career'
import { calcGrade, calcRecommendedSalary } from '../utils/salary'
import { CATEGORY_ITEMS, CATEGORY_NAMES, ITEM_NAMES, JT_COLOR, JT_TAG_STYLE } from '../utils/constants'
import EvalResult from './EvalResult'

const JOB_TYPES = [
  { id: '현장주간', icon: '🏗️', desc: '현장 근무 · 주간' },
  { id: '현장교대', icon: '🔄', desc: '현장 근무 · 교대' },
  { id: '사무주간', icon: '📋', desc: '사무 기획 · 주간' },
]

export default function EvalInput() {
  const { params } = useParams()
  const [jobType, setJobType]   = useState(null)
  const [name, setName]         = useState('')
  const [part, setPart]         = useState('')
  const [careerYears, setCareerYears]   = useState('')
  const [careerMonths, setCareerMonths] = useState('')
  const [prevSalary, setPrevSalary]     = useState('')
  const [selections, setSelections]     = useState({})
  const [error, setError]               = useState('')
  const [result, setResult]             = useState(null)

  const select = (itemKey, optionKey) => {
    setSelections(prev => ({ ...prev, [itemKey]: optionKey }))
  }

  const calcTotal = (sels) => {
    let total = 0
    Object.entries(sels).forEach(([item, opt]) => {
      const score = params.scoring[item]?.[opt] ?? 0
      total += score
    })
    return total
  }

  const validate = () => {
    if (!jobType) return '직무유형을 선택해 주세요.'
    for (const [cat, items] of Object.entries(CATEGORY_ITEMS)) {
      for (const item of items) {
        if (selections[item] === undefined) {
          return `"${CATEGORY_NAMES[cat]} > ${ITEM_NAMES[item]}" 항목을 선택해 주세요.`
        }
      }
    }
    const y = parseInt(careerYears) || 0
    const m = parseInt(careerMonths) || 0
    if (y === 0 && m === 0 && careerYears === '' && careerMonths === '') {
      return '경력을 입력해 주세요. (신입이면 0년 0개월)'
    }
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
      raw[item] = params.scoring[item]?.[opt] ?? 0
    })

    const catScores = {}
    Object.entries(CATEGORY_ITEMS).forEach(([cat, items]) => {
      catScores[cat] = items.reduce((s, k) => s + (raw[k] ?? 0), 0)
    })

    setResult({
      id: Date.now(),
      name:   name.trim()  || '(이름 미입력)',
      part:   part.trim()  || '(파트 미입력)',
      jobType,
      careerYears: y,
      careerMonths: m,
      careerInputDate: inputDate,
      currentCareer: current,
      careerLevel: level?.label ?? '—',
      prevSalary: parseInt(prevSalary) || 0,
      selections,
      raw,
      catScores,
      total,
      grade,
      recSalary,
      date: new Date().toLocaleDateString('ko-KR'),
    })
  }

  const handleReset = () => {
    setJobType(null); setName(''); setPart('')
    setCareerYears(''); setCareerMonths(''); setPrevSalary('')
    setSelections({}); setError(''); setResult(null)
  }

  if (result) return <EvalResult result={result} onBack={() => setResult(null)} onReset={handleReset} />

  return (
    <div>
      <div className="page-title">면접 평가 입력</div>
      <div className="page-desc">직무유형 선택 후 모든 항목을 평가하고 점수를 산출하세요.</div>

      {error && <div className="validation-msg">⚠ {error}</div>}

      {/* ① 직무유형 */}
      <div className="card">
        <div className="card-title">① 직무유형 선택 <span className="badge badge-warn">필수</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {JOB_TYPES.map(jt => (
            <div
              key={jt.id}
              onClick={() => setJobType(jt.id)}
              style={{
                border: `2px solid ${jobType === jt.id ? JT_COLOR[jt.id] : '#e2e8f0'}`,
                background: jobType === jt.id ? (JT_TAG_STYLE[jt.id]?.background ?? '#e6faf7') : '#fff',
                borderRadius: 12, padding: '22px 16px', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.18s',
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 10 }}>{jt.icon}</div>
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
            <input className="info-input" value={part} onChange={e => setPart(e.target.value)} placeholder="배치 예정 파트" />
          </div>
        </div>
        <div className="info-grid">
          <div>
            <div className="info-label">총 경력</div>
            <div className="career-input-wrap">
              <input
                className="career-input"
                type="number" min="0" max="50"
                value={careerYears}
                onChange={e => setCareerYears(e.target.value)}
                placeholder="0"
              />
              <span className="career-unit">년</span>
              <input
                className="career-input"
                type="number" min="0" max="11"
                value={careerMonths}
                onChange={e => setCareerMonths(e.target.value)}
                placeholder="0"
              />
              <span className="career-unit">개월</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
              신입이면 0년 0개월 입력 · 매달 자동 증가
            </div>
          </div>
          <div>
            <div className="info-label">기존 연봉 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(선택)</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="info-input"
                type="number" min="0" step="100"
                value={prevSalary}
                onChange={e => setPrevSalary(e.target.value)}
                placeholder="예) 3200"
                style={{ maxWidth: 160 }}
              />
              <span style={{ fontSize: 14, color: '#64748b' }}>만원</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>추천 연봉 산출 시 참고</div>
          </div>
        </div>
      </div>

      {/* ③ 평가 항목 */}
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
                <span style={{
                  background: '#e6faf7', color: '#0b7a70',
                  borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                }}>
                  {['①','②','③','④'][ci]}
                </span>
                {CATEGORY_NAMES[cat]}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {items.map(itemKey => {
                  const opts = params.scoring[itemKey] ?? {}
                  const maxScore = Math.max(...Object.values(opts))
                  return (
                    <div key={itemKey} style={{
                      border: '1px solid #e2e8f0', borderRadius: 12, padding: 18,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                        {ITEM_NAMES[itemKey]}
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>
                          최대 {maxScore}점
                        </span>
                      </div>
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
                              <span className="radio-score">
                                {score >= 0 ? `${score}점` : `${score}점`}
                              </span>
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
