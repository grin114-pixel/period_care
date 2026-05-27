import { useRef } from 'react'
import Calendar from './components/Calendar'
import './App.css'

function HeaderIcon() {
  return (
    <svg
      className="app-header__icon"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hdrLeafStroke" x1="10" y1="54" x2="54" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b15b6b" />
          <stop offset="0.55" stopColor="#c96d7f" />
          <stop offset="1" stopColor="#d9909c" />
        </linearGradient>
      </defs>
      <g
        stroke="url(#hdrLeafStroke)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 50 C 30 44, 36 34, 40 22" />
        <path d="M28 36 C 20 32, 18 24, 24 18 C 32 22, 34 30, 28 36" />
        <path d="M40 36 C 50 34, 56 40, 52 50 C 42 52, 36 44, 40 36" />
        <path d="M42 22 C 46 12, 56 10, 58 18 C 54 28, 46 30, 42 22" />
      </g>
    </svg>
  )
}

export default function App() {
  const calendarRef = useRef(null)

  return (
    <div className="app">
      <header className="app-header" role="banner">
        <div className="app-header__bar">
          <div className="app-header__title-row">
            <HeaderIcon />
            <div className="app-header__title">생리주기 체크</div>
          </div>
          <button
            type="button"
            className="app-header__today-btn"
            onClick={() => calendarRef.current?.goToday?.()}
            title="이번 달로 이동"
          >
            오늘
          </button>
        </div>
      </header>
      <Calendar ref={calendarRef} />
    </div>
  )
}
