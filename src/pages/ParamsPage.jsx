import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useParams } from '../context/ParamsContext'
import { JOB_TYPES, ITEM_NAMES, CATEGORY_ITEMS, CATEGORY_NAMES, GRADE_STYLE } from '../utils/constants'

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

  const updScoring = (item, opt, v) => {
    setDraft(p => {
      const next = JSON.parse(JSON.stringify(p))
      next.scoring[item][opt] = parseInt(v) || 0
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {Object.entries(CATEGORY_ITEMS).map(([cat, items]) => (
            <div key={cat} className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>{CATEGORY_NAMES[cat]}</div>
              {items.map(itemKey => (
                <div key={itemKey} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{ITEM_NAMES[itemKey]}</div>
                  {Object.entries(working.scoring[itemKey] ?? {}).map(([opt, score]) => (
                    <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#4a5568', flex: 1 }}>{opt}</span>
                      {draft
                        ? <input type="number" style={{ width: 56, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 12, textAlign: 'right', fontFamily: 'inherit' }}
                            value={score} onChange={e => updScoring(itemKey, opt, e.target.value)} />
                        : <span style={{ fontSize: 12, fontWeight: 600, color: score < 0 ? '#e53e3e' : '#0b7a70', width: 36, textAlign: 'right' }}>
                            {score >= 0 ? `+${score}` : score}점
                          </span>
                      }
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 등급기준 탭 */}
      {tab === '등급기준' && (
        <div className="card" style={{ maxWidth: 480 }}>
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
      )}
    </div>
  )
}
