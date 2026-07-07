import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useParams } from '../context/ParamsContext'
import { useDemo } from '../context/DemoContext'
import { calcCurrentCareer, totalCareerYears } from '../utils/career'
import { JT_COLOR, JOB_TYPES } from '../utils/constants'
import { Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend
} from 'chart.js'

ChartJS.register(LinearScale, PointElement, Tooltip, Legend)

export default function Charts() {
  const { isAdmin } = useAuth()
  const { params }  = useParams()
  const { demoMode, demoStyle, maskWon, shownSalary } = useDemo()
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    return onSnapshot(collection(db, 'employees'), s => setEmployees(s.docs.map(d => d.data())))
  }, [])

  if (!isAdmin) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>관리자 로그인이 필요합니다.</div>

  // 시연 모드(마스킹)에서는 점을 찍을 숫자 자체가 없으므로 차트를 숨김.
  // 가짜 숫자 모드에서는 shownSalary가 시드 기반 가짜값을 주므로 그대로 그림 (실제값 누수 없음)
  const hideScatter = demoMode && demoStyle === 'mask'

  // 직무유형별 데이터셋 — 인원 현황(employees) 기준. 연봉은 화면 표시값(shownSalary)과 일치
  const datasets = JOB_TYPES.map(jt => {
    const empPoints = employees
      .filter(e => e.jobType === jt && e.currentSalary > 0)
      .map(e => {
        const cur = calcCurrentCareer(e.careerYears, e.careerMonths, e.careerInputDate)
        return { x: parseFloat(totalCareerYears(cur.years, cur.months).toFixed(1)), y: shownSalary(e.currentSalary, e.id) ?? 0, label: e.name }
      })
    return {
      label: jt,
      data: empPoints,
      backgroundColor: JT_COLOR[jt] + 'cc',
      pointRadius: 7,
      pointHoverRadius: 9,
    }
  })

  const options = {
    responsive: true,
    maintainAspectRatio: false,   // 모바일에서 납작해지지 않게 컨테이너(.chart-box) 높이를 따름
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.raw.label ?? ''} (경력 ${ctx.raw.x}년 / ${ctx.raw.y.toLocaleString()}만원)`
        }
      }
    },
    scales: {
      x: { title: { display: true, text: '경력 (년)', font: { size: 12 } }, min: 0 },
      y: { title: { display: true, text: '연봉 (만원)', font: { size: 12 } }, min: 2000 },
    }
  }

  const total = employees.length

  return (
    <div>
      <div className="page-title">차트 분석</div>
      <div className="page-desc">직무유형별 경력-연봉 분포를 시각화합니다. (인원 현황 기준)</div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: '전체 인원', value: total + '명', color: '#0d9488' },
          ...JOB_TYPES.map(jt => ({
            label: jt,
            value: employees.filter(e => e.jobType === jt).length + '명',
            color: JT_COLOR[jt],
          }))
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px', marginBottom: 0 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 산점도 */}
      <div className="card">
        <div className="card-title">경력 vs 연봉 분포</div>
        {total === 0 ? (
          <div className="table-empty">표시할 데이터가 없습니다.<br/>인원 현황 데이터를 먼저 입력하세요.</div>
        ) : hideScatter ? (
          <div style={{
            background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8,
            padding: '40px 14px', textAlign: 'center', fontSize: 13, color: '#94a3b8',
          }}>
            🔒 시연 모드(마스킹)에서는 연봉 분포 차트를 숨깁니다. 표시 방식을 '가짜 숫자'로 바꾸면 가짜 값으로 표시됩니다.
          </div>
        ) : (
          <div className="chart-box">
            <Scatter data={{ datasets }} options={options} />
          </div>
        )}
      </div>

      {/* 연봉기준표 */}
      <div className="card">
        <div className="card-title">경력등급별 기준연봉 비교</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>등급</th>
                {JOB_TYPES.map(jt => <th key={jt}>{jt}</th>)}
              </tr>
            </thead>
            <tbody>
              {['신입','초급','중급','고급','특급'].map(lbl => (
                <tr key={lbl}>
                  <td className="row-title" style={{ fontWeight: 600 }}>{lbl}</td>
                  {JOB_TYPES.map(jt => {
                    const level = (params.careerLevels[jt] || []).find(l => l.label === lbl)
                    // 시드를 인원 현황의 기준연봉 열과 맞춰 시연 모드에서 같은 가짜값이 보이게 함
                    return <td key={jt} data-label={jt}>{level ? `${maskWon(level.salary, 'base-' + jt + '-' + lbl)}만원` : '—'}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
