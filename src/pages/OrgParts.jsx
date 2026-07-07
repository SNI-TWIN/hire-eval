import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, doc, addDoc, updateDoc } from 'firebase/firestore'
import { logAudit, moveToTrash } from '../utils/audit'
import { useConfirm } from '../components/ConfirmDialog'

export default function OrgParts() {
  const [ask, confirmEl]            = useConfirm()
  const [parts, setParts]           = useState([])
  const [candidates, setCandidates] = useState([])
  const [name, setName]             = useState('')
  const [busy, setBusy]             = useState(false)

  useEffect(() => onSnapshot(collection(db, 'parts'), s => {
    const r = s.docs.map(d => ({ id: d.id, ...d.data() }))
    r.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    setParts(r)
  }), [])

  // 관리자만 이 화면에 오므로 전체 후보를 읽어 미분류를 점검
  useEffect(() => onSnapshot(collection(db, 'candidates'), s =>
    setCandidates(s.docs.map(d => ({ id: d.id, ...d.data() })))), [])

  const partNames = parts.map(p => p.name)

  const addPart = async () => {
    const n = name.trim()
    if (!n) return
    if (partNames.includes(n)) { setName(''); return }
    setBusy(true)
    const ref = await addDoc(collection(db, 'parts'), { name: n, order: (parts.at(-1)?.order ?? 0) + 1 })
    logAudit('파트 추가', { type: 'parts', id: ref.id, name: n })
    setName(''); setBusy(false)
  }

  const renamePart = async (p, v) => {
    const nv = v.trim()
    if (!nv || nv === p.name) return
    await updateDoc(doc(db, 'parts', p.id), { name: nv })
    logAudit('파트명 변경', { type: 'parts', id: p.id, name: nv }, `${p.name} → ${nv}`)
  }
  const removePart = async (p) => {
    const used = candidates.filter(c => c.part === p.name).length
    const warn = used > 0 ? `\n이 파트로 저장된 후보 ${used}건은 '미분류'가 됩니다.` : ''
    const ok = await ask({
      title: '파트 삭제',
      message: `'${p.name}' 파트를 삭제할까요?${warn}\n(감사 로그·휴지통에서 복원할 수 있습니다)`,
      danger: true, confirmLabel: '삭제',
    })
    if (!ok) return
    const data = { ...p }; delete data.id   // 문서 필드만 휴지통에 보관 (id는 docId로 따로)
    await moveToTrash('parts', p.id, data, p.name)
    logAudit('파트 삭제', { type: 'parts', id: p.id, name: p.name })
  }

  // ── 3단계: 표준 파트에 없는 후보(기존 자유 텍스트 등) 재배정 ──
  const unassigned = candidates.filter(c => !partNames.includes(c.part))
  const reassign = (c, part) => { if (part) updateDoc(doc(db, 'candidates', String(c.id)), { part }) }

  return (
    <div>
      <div className="page-title">파트 관리</div>
      <div className="page-desc">파트(부서)를 추가·수정하고, 기존에 잘못 저장된 후보의 파트를 정리합니다.</div>

      {/* 파트 추가 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">파트 추가</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="info-input" value={name} onChange={e => setName(e.target.value)}
            placeholder="예) 전기파트" onKeyDown={e => e.key === 'Enter' && addPart()} style={{ maxWidth: 280 }} />
          <button className="btn-primary" onClick={addPart} disabled={busy}>추가</button>
        </div>
      </div>

      {/* 파트 목록 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {parts.length === 0 ? (
          <div className="table-empty">등록된 파트가 없습니다.</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>파트명</th><th>소속 후보 수</th><th></th></tr></thead>
            <tbody>
              {parts.map(p => (
                <tr key={p.id}>
                  <td data-label="파트명">
                    <input className="info-input" defaultValue={p.name} key={p.name}
                      onBlur={e => renamePart(p, e.target.value)}
                      style={{ padding: '4px 8px', fontSize: 13, maxWidth: 220 }} />
                  </td>
                  <td data-label="소속 후보 수" style={{ color: '#64748b' }}>{candidates.filter(c => c.part === p.name).length}건</td>
                  <td className="row-actions">
                    <button className="btn-danger btn-xs"
                      onClick={() => removePart(p)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>
        ※ 파트명을 바꿔도 기존 후보의 파트 값은 자동 변경되지 않습니다. 필요 시 아래 정리에서 재배정하세요.
      </div>

      {/* 미분류 후보 정리 (마이그레이션) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="card-title" style={{ margin: 0 }}>미분류 후보 정리</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            표준 파트에 속하지 않은 후보입니다. 파트를 지정하면 해당 파트장에게만 보이게 됩니다.
          </div>
        </div>
        {unassigned.length === 0 ? (
          <div className="table-empty">정리할 후보가 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>이름</th><th>현재 파트값</th><th>직무유형</th><th>평가일</th><th>파트 지정</th></tr></thead>
              <tbody>
                {unassigned.map(c => (
                  <tr key={c.id}>
                    <td className="row-title" style={{ fontWeight: 600 }}>{c.name}</td>
                    <td data-label="현재 파트값" style={{ color: '#b45309' }}>{c.part || '(없음)'}</td>
                    <td data-label="직무유형">{c.jobType}</td>
                    <td data-label="평가일" style={{ fontSize: 12, color: '#94a3b8' }}>{c.date}</td>
                    <td data-label="파트 지정">
                      <select className="info-input" defaultValue="" style={{ padding: '4px 8px', fontSize: 13, maxWidth: 180 }}
                        onChange={e => reassign(c, e.target.value)}>
                        <option value="">선택…</option>
                        {parts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmEl}
    </div>
  )
}
