import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { supabase } from '../supabase'
import { fetchMonthRecords, findCycleStartAndLength, saveDayRecord } from '../lib/records'
import { getFlowLevel } from '../lib/flowColors'
import DayModal from './DayModal'
import './Calendar.css'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

const Calendar = forwardRef(function Calendar(_props, ref) {
  const today = new Date()
  const [summary, setSummary] = useState(null)
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()) // 0-indexed
  const [records, setRecords] = useState({}) // { 'YYYY-MM-DD': { level, tags } }
  const [selectedDate, setSelectedDate] = useState(null)

  const monthStart = new Date(currentYear, currentMonth, 1)
  const monthEnd = new Date(currentYear, currentMonth + 1, 0)

  // 월요일=0 기준으로 시작 오프셋 계산
  const startDow = (monthStart.getDay() + 6) % 7 // 0=Mon, 6=Sun
  const totalDays = monthEnd.getDate()

  // 달력 셀 배열 생성
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  useEffect(() => {
    fetchRecords()
  }, [currentYear, currentMonth])

  async function fetchRecords() {
    try {
      const from = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
      const to = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`
      const map = await fetchMonthRecords(supabase, from, to)
      setRecords(map)

      // 상단 요약(현재 주기/배란/다음 생리)
      const info = await findCycleStartAndLength(supabase, 160)
      setSummary(buildSummary(info))
    } catch {
      // Supabase 연결 실패 시 무시
    }
  }

  function formatDate(day) {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function isToday(day) {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentYear(y => y - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentYear(y => y + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  function handleGoToday() {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
  }

  useImperativeHandle(ref, () => ({
    goToday: handleGoToday,
  }))

  async function handleSave(day, level, tags) {
    const dateStr = formatDate(day)
    const hasTags = tags.brown || tags.start || tags.end

    if (level === null && !hasTags) {
      setRecords(prev => {
        const next = { ...prev }
        delete next[dateStr]
        return next
      })
    } else {
      setRecords(prev => ({ ...prev, [dateStr]: { level, tags } }))
    }
    setSelectedDate(null)

    try {
      await saveDayRecord(supabase, dateStr, level, tags)
      const info = await findCycleStartAndLength(supabase, 160)
      setSummary(buildSummary(info))
    } catch (err) {
      console.error('저장 실패:', err)
    }
  }

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월',
                      '7월', '8월', '9월', '10월', '11월', '12월']

  return (
    <div className="calendar-wrap">
      <header className="cal-header">
        <button className="nav-btn" onClick={handlePrevMonth}>‹</button>
        <h1 className="cal-title">
          {currentYear}년 {monthNames[currentMonth]}
        </h1>
        <button className="nav-btn" onClick={handleNextMonth}>›</button>
      </header>

      <SummaryCards summary={summary} />

      <div className="calendar-body">
        <div className="weekday-row">
          {WEEKDAYS.map(d => (
            <div key={d} className={`weekday-cell ${d === '토' ? 'sat' : ''} ${d === '일' ? 'sun' : ''}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="day-grid">
          {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="day-cell empty" />

          const dateStr = formatDate(day)
          const record = records[dateStr]
          const level = record?.level
          const tags = record?.tags
          const flowStyle = getFlowLevel(level)
          const hasTags = tags && (tags.brown || tags.start || tags.end)
          const colPos = idx % 7 // 0=Mon...5=Sat,6=Sun
          const isSat = colPos === 5
          const isSun = colPos === 6
          const showOvulation =
            summary?.ovulationKey === dateStr && !isPastDate(dateStr)
          const showFertile =
            summary &&
            isDateInRange(dateStr, summary.fertileFromKey, summary.fertileToKey) &&
            !isPastDate(dateStr)

          return (
            <div
              key={dateStr}
              className={`day-cell ${isToday(day) ? 'today' : ''} ${isSat ? 'sat' : ''} ${isSun ? 'sun' : ''} ${showFertile ? 'fertile-day' : ''} ${showOvulation ? 'ovulation-day' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              <div className="day-top">
                <div className="day-top-row">
                  <span className={`day-num ${showOvulation ? 'ovulation-num' : ''}`}>{day}</span>
                  {hasTags && <TagDots tags={tags} />}
                </div>
                {isToday(day) && <div className="today-text">오늘</div>}
              </div>

              {(level || showOvulation) && (
                <div className="day-indicators">
                  {level && flowStyle && <Droplet flow={flowStyle} level={level} />}
                  {showOvulation && (
                    <div className="ovulation-marker" title="배란 예상일">
                      <OvulationFlowerIcon size="sm" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
          })}
        </div>
      </div>

      {selectedDate && (
        <DayModal
          date={formatDate(selectedDate)}
          day={selectedDate}
          currentLevel={records[formatDate(selectedDate)]?.level ?? null}
          currentTags={records[formatDate(selectedDate)]?.tags ?? null}
          onSave={handleSave}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
})

export default Calendar

function Droplet({ flow, level }) {
  return (
    <div className="droplet-wrap" title={`${level}단계 · ${flow.label}`}>
      <svg viewBox="0 0 32 40" className="droplet-svg">
        <path
          d="M16 3 C16 3 14 7 10 14 C6 21 4 24 4 28 C4 34 9.4 38 16 38 C22.6 38 28 34 28 28 C28 24 26 21 22 14 C18 7 16 3 16 3 Z"
          fill={flow.fill}
          stroke={flow.stroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function TagDots({ tags }) {
  return (
    <div className="tag-dots" aria-hidden="true">
      {tags.brown && <span className="tag-dot brown" title="갈색혈" />}
      {tags.start && <span className="tag-dot start" title="시작" />}
      {tags.end && <span className="tag-dot end" title="끝" />}
    </div>
  )
}

const DEFAULT_CYCLE_LENGTH = 28
const LUTEAL_DAYS = 14

function dateKeyFromDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDateKey(key) {
  if (!key) return null
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function diffDays(a, b) {
  const ms = 24 * 60 * 60 * 1000
  const ax = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const bx = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((ax - bx) / ms)
}

function fmtMD(date) {
  return `${date.getMonth() + 1}.${date.getDate()}`
}

function getWeekdayKor(date) {
  // JS getDay(): 0=일, 6=토
  const names = ['일', '월', '화', '수', '목', '금', '토']
  return names[date.getDay()] || ''
}

function todayKey() {
  return dateKeyFromDate(new Date())
}

function isPastDate(dateStr) {
  return dateStr < todayKey()
}

function isDateInRange(dateStr, fromKey, toKey) {
  if (!fromKey || !toKey) return false
  return dateStr >= fromKey && dateStr <= toKey
}

function buildSummary(info) {
  if (!info?.currentStartKey) return null

  const start = parseDateKey(info.currentStartKey)
  if (!start) return null

  const today = new Date()
  const cycleLength = info.cycleLength || DEFAULT_CYCLE_LENGTH
  const cycleDay = diffDays(today, start) + 1
  const nextPeriod = addDays(start, cycleLength)
  const dDay = diffDays(nextPeriod, today)

  const ovulation = addDays(start, cycleLength - LUTEAL_DAYS)
  const fertileFrom = addDays(ovulation, -4)
  const fertileTo = addDays(ovulation, 2)

  const cycleStartMD = fmtMD(start)
  const nextPeriodMD = fmtMD(nextPeriod)
  const ovulationMD = fmtMD(ovulation)
  const cycleStartLabel = `${cycleStartMD} (${getWeekdayKor(start)})`
  const nextPeriodLabel = `${nextPeriodMD} (${getWeekdayKor(nextPeriod)})`
  const ovulationLabel = `${ovulationMD}(${getWeekdayKor(ovulation)})`

  return {
    cycleStartKey: info.currentStartKey,
    cycleLength,
    cycleDay: Math.max(1, cycleDay),
    nextPeriodKey: dateKeyFromDate(nextPeriod),
    nextPeriodMD,
    nextPeriodLabel,
    nextPeriodDDay: dDay,
    ovulationKey: dateKeyFromDate(ovulation),
    ovulationMD,
    ovulationLabel,
    fertileFromKey: dateKeyFromDate(fertileFrom),
    fertileToKey: dateKeyFromDate(fertileTo),
    fertileMD: `${fmtMD(fertileFrom)} - ${fmtMD(fertileTo)}`,
    cycleStartLabel,
  }
}

function OvulationFlowerIcon({ size = 'md' }) {
  const petals = [0, 72, 144, 216, 288]
  return (
    <svg
      className={`ov-flower-icon ${size}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <g transform="translate(12 12)">
        {petals.map(deg => (
          <ellipse
            key={deg}
            cx="0"
            cy="-5.2"
            rx="3.1"
            ry="5"
            fill="currentColor"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r="2.4" fill="currentColor" />
      </g>
    </svg>
  )
}

function SummaryCards({ summary }) {
  if (!summary) return null

  const nextDDay =
    summary.nextPeriodDDay >= 0
      ? `D-${summary.nextPeriodDDay}`
      : `D+${Math.abs(summary.nextPeriodDDay)}`

  return (
    <div className="summary-row">
      <div className="summary-card">
        <div className="summary-head">
          <div className="summary-icon next" aria-hidden="true">🩸</div>
          <div className="summary-value next-value">{nextDDay}</div>
        </div>
        <div className="summary-sub">예상 {summary.nextPeriodLabel}</div>
      </div>

      <div className="summary-card summary-ovulation">
        <div className="summary-head">
          <div className="summary-icon ov" aria-hidden="true">
            <OvulationFlowerIcon />
          </div>
          <div className="summary-value ovulation-value">{summary.ovulationLabel}</div>
        </div>
        <div className="summary-sub">가임기 {summary.fertileMD}</div>
      </div>

      <div className="summary-card">
        <div className="summary-head">
          <div className="summary-icon cal" aria-hidden="true">📅</div>
          <div className="summary-value cycle-value">{summary.cycleLength}일</div>
        </div>
        <div className="summary-sub">시작 {summary.cycleStartLabel}</div>
      </div>
    </div>
  )
}
