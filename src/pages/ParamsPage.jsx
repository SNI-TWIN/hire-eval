import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useParams } from '../context/ParamsContext'
import { JOB_TYPES, GRADE_STYLE } from '../utils/constants'
import { buildEvalSchema } from '../utils/schema'

export default function ParamsPage() {
  const { isAdmin }          = useAuth()
  const { params, saveParams } = useParams()
  const [tab, setTab]        = useState('현장주간')
  const [draft, setDraft]    = useState(null)
  const [saving, setSaving]  = useState(false)
  const [toast, setToast]    = useState('')

  if (!isAdmin) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>관리자 로그인이 필요합니다.</div>

  const working = draft ?? params

  const startEdit = () => setDraft(JSON.parse(JSON.stringify(params)))
  const cancelEdit = () => setDraft(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveParams(draft)
      setDraft(null)
      setToast('저장 완료')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setSaving(false)
    }
  }

  const updLevel = (jt, i, k, v) => {
    setDraft(p => {
      const next = JSON.parse(JSON.stringify(p))
      next.careerLevels[jt][i][k] = k === 'salary' ? (parseInt(v) || 0) : (k === 'label' ? v : (parseFloat(v) || 0))
      return next
    })
  }

  const updThreshold = (k, v) => {
    setDraft(p => {
      const next = JSON.parse(JSON.stringify(p))
      next.gradeThresholds[k] = parseInt(v) || 0
      return next
    })
  }

  // 등급별 밴드 내 위치 — 화면은 0~100(%) 입력, 저장은 0~1
  const updGradePos = (k, v) => {
    setDraft(p => {
      const next = JSON.parse(JSON.stringify(p))
      next.gradePos = next.gradePos || {}
      const pct = parseFloat(v)
      next.gradePos[k] = isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct)) / 100
      return next
    })
  }

  // ── 면접배점 편집 (카테고리 / 항목 / 선택지) ──
  const clone  = p => JSON.parse(JSON.stringify(p))
  const genKey = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

  const addCategory = () => setDraft(p => {
    const n = clone(p); n.categories = n.categories || []
    n.categories.push({ key: genKey('cat'), name: '새 카테고리' }); return n
  })
  const updCategory = (catKey, v) => setDraft(p => {
    const n = clone(p); const c = (n.categories || []).find(c => c.key === catKey); if (c) c.name = v; return n
  })
  const delCategory = (catKey) => setDraft(p => {
    const n = clone(p)
    ;(n.items || []).filter(it => it.category === catKey).forEach(it => { delete n.scoring[it.key] })
    n.items = (n.items || []).filter(it => it.category !== catKey)
    n.categories = (n.categories || []).filter(c => c.key !== catKey)
    return n
  })

  const addItem = (catKey) => setDraft(p => {
    const n = clone(p); const key = genKey('item')
    n.items = n.items || []; n.items.push({ key, name: '새 항목', desc: '', category: catKey })
    n.scoring = n.scoring || {}; n.scoring[key] = {}; return n
  })
  const updItem = (itemKey, field, v) => setDraft(p => {
    const n = clone(p); const it = (n.items || []).find(i => i.key === itemKey); if (it) it[field] = v; return n
  })
  const delItem = (itemKey) => setDraft(p => {
    const n = clone(p); n.items = (n.items || []).filter(i => i.key !== itemKey); delete n.scoring[itemKey]; return n
  })

  const addOption = (itemKey) => setDraft(p => {
    const n = clone(p); const opts = n.scoring[itemKey] || {}
    let label = '새 선택지', k = 1; while (label in opts) label = `새 선택지 ${k++}`
    opts[label] = 0; n.scoring[itemKey] = opts; return n
  })
  const updOptionLabel = (itemKey, idx, newLabel) => setDraft(p => {
    const n = clone(p); const entries = Object.entries(n.scoring[itemKey] || {})
    if (entries[idx]) entries[idx][0] = newLabel
    n.scoring[itemKey] = Object.fromEntries(entries); return n
  })
  const updOptionScore = (itemKey, label, v) => setDraft(p => {
    const n = clone(p); if (n.scoring[itemKey]) n.scoring[itemKey][label] = parseInt(v) || 0; return n
  })
  const delOption = (itemKey, label) => setDraft(p => {
    const n = clone(p); if (n.scoring[itemKey]) delete n.scoring[itemKey][label]; return n
  })

  return (
    <div>
      <div className="page-title">파라미터 설정</div>
      <div className="page-desc">경력등급별 기준연봉, 면접 배점, 등급 기준을 설정합니다. 모든 변경은 클라우드에 저장됩니다.</div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        {!draft
          ? <button className="btn-primary" onClick={startEdit}>편집 시작</button>
          : <>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
              <button className="btn-secondary" onClick={cancelEdit}>취소</button>
            </>
        }
        {toast && <span style={{ fontSize: 13, color: '#0b7a70', fontWeight: 500, background: '#e6faf7', padding: '6px 14px', borderRadius: 8 }}>{toast}</span>}
        {!draft && <span style={{ fontSize: 12, color: '#94a3b8' }}>편집 시작을 눌러 수정하세요</span>}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        {['연봉기준표', '면접배점', '등급기준'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 24px', fontSize: 14, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? '#0d9488' : '#64748b', border: 'none', background: 'none',
            borderBottom: `2px solid ${tab === t ? '#0d9488' : 'transparent'}`,
            marginBottom: -2, cursor: 'pointer', fontFamily: 'inherit',
          }}>{t}</button>
        ))}
      </div>

      {/* 연봉기준표 탭 */}
      {tab === '연봉기준표' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {JOB_TYPES.map(jt => (
            <div key={jt} className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>{jt}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 500, borderBottom: '1px solid #e2e8f0' }}>등급</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 500, borderBottom: '1px solid #e2e8f0' }}>경력 범위</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 500, borderBottom: '1px solid #e2e8f0' }}>기준연봉</th>
                  </tr>
                </thead>
                <tbody>
                  {(working.careerLevels[jt] || []).map((lv, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px 8px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>
                        {draft
                          ? <input style={{ width: 50, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 12, fontFamily: 'inherit' }}
                              value={lv.label} onChange={e => updLevel(jt, i, 'label', e.target.value)} />
                          : lv.label}
                      </td>
                      <td style={{ padding: '8px 8px', borderBottom: '1px solid #f1f5f9', fontSize: 12, color: '#64748b' }}>
                        {lv.minYears}년~{lv.maxYears != null ? `${lv.maxYears}년` : ''}
                      </td>
                      <td style={{ padding: '8px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        {draft
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                              <input type="number" step="100"
                                style={{ width: 72, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 12, textAlign: 'right', fontFamily: 'inherit' }}
                                value={lv.salary} onChange={e => updLevel(jt, i, 'salary', e.target.value)} />
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>만원</span>
                            </div>
                          : <span style={{ fontWeight: 600, color: '#0b7a70' }}>{lv.salary.toLocaleString()}만원</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* 면접배점 탭 */}
      {tab === '면접배점' && (
        <div>
          {!draft && <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>편집 시작을 눌러 카테고리·항목·선택지를 추가/삭제하거나 이름·점수를 수정하세요.</div>}

          {buildEvalSchema(working).map(cat => (
            <div key={cat.key} className="card" style={{ marginBottom: 16 }}>
              {/* 카테고리 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #f1f5f9' }}>
                {draft ? (
                  <>
                    <input value={cat.name} onChange={e => updCategory(cat.key, e.target.value)} placeholder="카테고리명"
                      style={{ fontSize: 15, fontWeight: 700, border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 10px', fontFamily: 'inherit', flex: 1, maxWidth: 280 }} />
                    <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => delCategory(cat.key)}>카테고리 삭제</button>
                  </>
                ) : (
                  <div className="card-title" style={{ margin: 0 }}>{cat.name}</div>
                )}
              </div>

              {/* 항목들 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {cat.items.map(it => (
                  <div key={it.key} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                    {/* 항목 헤더 */}
                    {draft ? (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          <input value={it.name} onChange={e => updItem(it.key, 'name', e.target.value)} placeholder="항목명"
                            style={{ fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontFamily: 'inherit', flex: 1, minWidth: 0 }} />
                          <button className="btn-danger" style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }} onClick={() => delItem(it.key)}>삭제</button>
                        </div>
                        <input value={it.desc} onChange={e => updItem(it.key, 'desc', e.target.value)} placeholder="설명 (선택)"
                          style={{ width: '100%', boxSizing: 'border-box', fontSize: 11, color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', fontFamily: 'inherit', marginBottom: 6 }} />
                        <select value={it.category} onChange={e => updItem(it.key, 'category', e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', fontSize: 11, color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', fontFamily: 'inherit' }}>
                          {(working.categories || []).map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{it.name}</div>
                        {it.desc && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>{it.desc}</div>}
                      </div>
                    )}

                    {/* 선택지 */}
                    {Object.entries(it.options).map(([opt, score], oi) => (
                      <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        {draft ? (
                          <>
                            <input value={opt} onChange={e => updOptionLabel(it.key, oi, e.target.value)} placeholder="선택지"
                              style={{ flex: 1, minWidth: 0, fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontFamily: 'inherit' }} />
                            <input type="number" value={score} onChange={e => updOptionScore(it.key, opt, e.target.value)}
                              style={{ width: 56, flexShrink: 0, fontSize: 12, textAlign: 'right', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontFamily: 'inherit' }} />
                            <button onClick={() => delOption(it.key, opt)} title="선택지 삭제"
                              style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex: 1, fontSize: 12, color: '#4a5568' }}>{opt}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: score < 0 ? '#e53e3e' : '#0b7a70', width: 40, textAlign: 'right' }}>
                              {score >= 0 ? `+${score}` : score}점
                            </span>
                          </>
                        )}
                      </div>
                    ))}

                    {draft && (
                      <button className="btn-secondary" style={{ marginTop: 6, padding: '3px 10px', fontSize: 11 }} onClick={() => addOption(it.key)}>+ 선택지</button>
                    )}
                    {draft && it.key === 'certification' && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
                        ※ 자격증 세부 가산(동종/타직무 적용·추가 보유 보너스)은 코드에서 처리됩니다.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {draft && (
                <button className="btn-secondary" style={{ marginTop: 12, padding: '5px 12px', fontSize: 12 }} onClick={() => addItem(cat.key)}>+ 항목 추가</button>
              )}
            </div>
          ))}

          {draft && (
            <button className="btn-primary" style={{ marginTop: 4 }} onClick={addCategory}>+ 카테고리 추가</button>
          )}
        </div>
      )}

      {/* 등급기준 탭 */}
      {tab === '등급기준' && (
        <div style={{ display: 'grid', gap: 16, maxWidth: 480 }}>
          <div className="card">
            <div className="card-title">면접 등급 기준점수</div>
            {[['S','최우수'],['A','우수'],['B','양호'],['C','보통']].map(([g, name]) => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span className="grade-badge" style={{ ...GRADE_STYLE[g], minWidth: 36, textAlign: 'center' }}>{g}</span>
                <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{name}</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {draft
                    ? <input type="number" style={{ width: 56, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 13, textAlign: 'right', fontFamily: 'inherit' }}
                        value={working.gradeThresholds[g]} onChange={e => updThreshold(g, e.target.value)} />
                    : <strong style={{ color: '#1a202c' }}>{working.gradeThresholds[g]}</strong>
                  }
                  점 이상
                </span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
              D등급 (채용불가): C 기준점수 미만
            </div>
          </div>

          {/* 등급별 연봉 밴드 내 위치 */}
          <div className="card">
            <div className="card-title">등급별 연봉 밴드 내 위치</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, marginBottom: 14 }}>
              경력등급 연봉밴드(하한~상한) 안에서 면접등급이 놓일 위치입니다.<br />
              <strong>0% = 하한(기준연봉)</strong>, <strong>100% = 상한 직전</strong>. 추천액 = 하한 + 밴드폭 × 위치%.
            </div>
            {[['S','최우수'],['A','우수'],['B','양호'],['C','보통']].map(([g, name]) => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span className="grade-badge" style={{ ...GRADE_STYLE[g], minWidth: 36, textAlign: 'center' }}>{g}</span>
                <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{name}</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {draft
                    ? <input type="number" min="0" max="100" style={{ width: 56, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 13, textAlign: 'right', fontFamily: 'inherit' }}
                        value={Math.round((working.gradePos?.[g] ?? 0) * 100)} onChange={e => updGradePos(g, e.target.value)} />
                    : <strong style={{ color: '#1a202c' }}>{Math.round((working.gradePos?.[g] ?? 0) * 100)}</strong>
                  }
                  % 지점
                </span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9', lineHeight: 1.7 }}>
              ※ C를 0%로 두면 최저 추천이 기준연봉(하한)과 같아집니다.<br />
              ※ 보통 S ≥ A ≥ B ≥ C 순서로 설정하세요. (상한은 다음 경력등급 시작가라 100%여도 그 직전까지만 추천됩니다)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
