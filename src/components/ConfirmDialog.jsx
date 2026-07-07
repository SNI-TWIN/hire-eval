import { useState, useRef, useCallback } from 'react'

// window.confirm 대체 훅 — PWA·모바일에서 브라우저 다이얼로그 대신 앱과 같은 모달로 확인.
// 사용:  const [ask, confirmEl] = useConfirm()
//        if (!(await ask({ title, message, danger: true, confirmLabel: '삭제' }))) return
//        ... JSX 마지막에 {confirmEl} 렌더
export function useConfirm() {
  const [opts, setOpts] = useState(null)
  const resolver = useRef(null)

  const ask = useCallback(o => new Promise(res => {
    resolver.current = res
    setOpts(o)
  }), [])

  const done = (ok) => {
    setOpts(null)
    resolver.current?.(ok)
    resolver.current = null
  }

  const confirmEl = opts ? (
    <div className="modal-overlay" onMouseDown={() => done(false)}>
      <div className="modal-box" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-title">{opts.title}</div>
        <div className="modal-desc" style={{ whiteSpace: 'pre-line', marginBottom: 0, lineHeight: 1.7 }}>
          {opts.message}
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => done(false)}>취소</button>
          <button className={opts.danger ? 'btn-danger' : 'btn-primary'} onClick={() => done(true)}>
            {opts.confirmLabel || '확인'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return [ask, confirmEl]
}
