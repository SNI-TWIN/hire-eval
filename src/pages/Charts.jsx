import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useParams } from '../context/ParamsContext'
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
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    return onSnapshot(collection(db, 'employees'), s => setEmployees(s.docs.map(d => d.data())))
  }, [])

  if (!isAdmin) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>관리자 로그인이 필요합니다.</div>

  // 직무유형별 데이터셋 — 인원 현황(employees) 기준
  const datasets = JOB_TYPES.map(jt => {
    const empPoints = employees
      .filter(e => e.jobType === jt && e.currentSalary > 0)
      .map(e => {
        const cur = calcCurrentCareer(e.careerYears, e.careerMonths, e.careerInputDate)
        return { x: parseFloat(totalCareerYears(cur.years, cur.months).toFixed(1)), y: e.currentSalary, label: e.name }
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
        ) : (
          <Scatter data={{ datasets }} options={options} />
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
                  <td style={{ fontWeight: 600 }}>{lbl}</td>
                  {JOB_TYPES.map(jt => {
                    const level = (params.careerLevels[jt] || []).find(l => l.label === lbl)
                    return <td key={jt}>{level ? `${level.salary.toLocaleString()}만원` : '—'}</td>
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
