// 관리자 코드 해시 — 원문 대신 해시만 Firestore에 저장
const SALT = 'hr-portal-admin'

export async function hashCode(code) {
  const data = new TextEncoder().encode(`${SALT}:${code}`)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
