// 감사 로그(audit_logs) + 휴지통(trash) — 백엔드 없이 Firestore 컬렉션으로 구현
// - audit_logs: 누가 언제 무엇을 했는지 한 줄씩 기록. 수정·삭제 불가(규칙에서 차단), 열람은 관리자만
// - trash: 삭제 시 원본 문서를 통째로 보관(소프트 삭제). 관리자가 복원/영구삭제 가능
import { db, auth } from '../firebase'
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore'

// 감사 로그 한 건 기록 — 기록 실패가 본 작업을 막지 않도록 fire-and-forget
// 예) logAudit('직원 삭제', { type: 'employees', id, name }, '연봉 3,200만원')
export function logAudit(action, target = {}, detail = '') {
  setDoc(doc(collection(db, 'audit_logs')), {
    action,
    targetType: target.type ?? '',
    targetId:   String(target.id ?? ''),
    targetName: target.name ?? '',
    detail,
    actor: auth.currentUser?.email ?? '',
    at: new Date().toISOString(),
  }).catch(() => {})
}

// 원본 문서를 휴지통으로 옮기고 삭제 (한 배치로 원자 처리)
// data에는 문서 필드만 넣을 것 (doc id는 docId로 별도 보관 → 복원 시 같은 ID로 되살림)
export async function moveToTrash(col, docId, data, label) {
  const batch = writeBatch(db)
  batch.set(doc(collection(db, 'trash')), {
    col,
    docId: String(docId),
    data,
    label: label ?? data?.name ?? String(docId),
    deletedBy: auth.currentUser?.email ?? '',
    deletedAt: new Date().toISOString(),
  })
  batch.delete(doc(db, col, String(docId)))
  await batch.commit()
}

// 휴지통 항목 복원 — 원래 컬렉션/문서 ID로 되돌리고 휴지통에서 제거 (관리자 전용)
export async function restoreFromTrash(t) {
  const batch = writeBatch(db)
  batch.set(doc(db, t.col, t.docId), t.data)
  batch.delete(doc(db, 'trash', t.id))
  await batch.commit()
}
