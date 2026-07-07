import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, query, orderBy, limit, doc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { restoreFromTrash, logAudit } from '../utils/audit'
import { useConfirm } from '../components/ConfirmDialog'

// 휴지통(trash) + 감사 로그(audit_logs) — 관리자 전용
// 삭제된 데이터의 복원/영구삭제, 그리고 누가 언제 무엇을 했는지 기록 열람

const COL_LABEL = { employees: '직원', candidates: '채용 후보', users: '사용자', parts: '파트' }
const fmtTime = iso => (iso ? new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '—')

export default function AuditPage() {
  const { isAdmin } = useAuth()
  const [ask, confirmEl]  = useConfirm()
  const [tab, setTab]     = useState('trash')
  const [trash, setTrash] = useState([])
  const [logs, setLogs]   = useState([])
  const [busy, setBusy]   = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    const u1 = onSnapshot(query(collection(db, 'trash'), orderBy('deletedAt', 'desc'), limit(200)),
      s => setTrash(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(query(collection(db, 'audit_logs'), orderBy('at', 'desc'), limit(300)),
      s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [isAdmin])

  if (!isAdmin) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>관리자 로그인이 필요합니다.</div>

  const restore = async (t) => {
    const ok = await ask({
      title: '휴지통 복원',
      message: `'${t.label}' (${COL_LABEL[t.col] ?? t.col}) 을(를) 복원할까요?\n` +
        `(같은 항목이 이미 다시 만들어져 있으면 복원본으로 덮어써집니다)`,
      confirmLabel: '복원',
    })
    if (!ok) return
    setBusy(true)
    try {
      await restoreFromTrash(t)
      logAudit('휴지통 복원', { type: t.col, id: t.docId, name: t.label })
    } catch (e) {
      alert('복원 실패: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const purge = async (t) => {
    const ok = await ask({
      title: '영구 삭제',
      message: `'${t.label}' 을(를) 영구 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`,
      danger: true, confirmLabel: '영구 삭제',
    })
    if (!ok) return
    setBusy(true)
    try {
      await deleteDoc(doc(db, 'trash', t.id))
      logAudit('영구 삭제', { type: t.col, id: t.docId, name: t.label })
    } catch (e) {
      alert('영구 삭제 실패: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const tabBtn = (id, label, count) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit', border: '1px solid',
        borderColor: tab === id ? '#0d9488' : '#e2e8f0',
        background: tab === id ? '#e6faf7' : '#fff',
        color: tab === id ? '#0b7a70' : '#64748b',
      }}
    >
      {label}{count > 0 && ` (${count})`}
    </button>
  )

  return (
    <div>
      <div className="page-title">감사 로그 · 휴지통</div>
      <div className="page-desc">
        삭제된 데이터를 복원하거나 영구 삭제하고, 주요 작업(등록·수정·삭제·권한 변경 등)의 기록을 확인합니다.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tabBtn('trash', '휴지통', trash.length)}
        {tabBtn('logs', '감사 로그', 0)}
      </div>

      {tab === 'trash' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {trash.length === 0 ? (
            <div className="table-empty">휴지통이 비어 있습니다.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>종류</th><th>항목</th><th>삭제한 사람</th><th>삭제 시각</th><th></th></tr>
                </thead>
                <tbody>
                  {trash.map(t => (
                    <tr key={t.id}>
                      <td data-label="종류">
                        <span style={{ fontSize: 12, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 10, fontWeight: 600 }}>
                          {COL_LABEL[t.col] ?? t.col}
                        </span>
                      </td>
                      <td data-label="항목" style={{ fontWeight: 600 }}>{t.label}</td>
                      <td data-label="삭제한 사람" style={{ fontSize: 13, color: '#64748b' }}>{t.deletedBy || '—'}</td>
                      <td data-label="삭제 시각" style={{ fontSize: 12, color: '#94a3b8' }}>{fmtTime(t.deletedAt)}</td>
                      <td className="row-actions">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="btn-xs"
                            style={{ border: 'none', background: '#e6faf7', color: '#0b7a70', fontWeight: 600 }}
                            disabled={busy} onClick={() => restore(t)}
                          >
                            복원
                          </button>
                          <button className="btn-danger btn-xs"
                            disabled={busy} onClick={() => purge(t)}>
                            영구 삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {logs.length === 0 ? (
            <div className="table-empty">기록된 작업이 없습니다.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>시각</th><th>작업</th><th>대상</th><th>상세</th><th>작업자</th></tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td data-label="시각" style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtTime(l.at)}</td>
                      <td data-label="작업" style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{l.action}</td>
                      <td data-label="대상" style={{ fontSize: 13 }}>
                        {l.targetName || '—'}
                        {l.targetType && (
                          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>
                            ({COL_LABEL[l.targetType] ?? l.targetType})
                          </span>
                        )}
                      </td>
                      <td data-label="상세" style={{ fontSize: 12, color: '#64748b', maxWidth: 280 }}>{l.detail || ''}</td>
                      <td data-label="작업자" style={{ fontSize: 12, color: '#64748b' }}>{l.actor || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: '10px 18px', fontSize: 12, color: '#94a3b8', borderTop: '1px solid #f1f5f9' }}>
            최근 300건까지 표시됩니다. 기록은 수정·삭제할 수 없습니다.
          </div>
        </div>
      )}

      {confirmEl}
    </div>
  )
}
