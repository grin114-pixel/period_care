import { useState } from 'react'
import { FLOW_LEVELS } from '../lib/flowColors'
import './DayModal.css'

const EMPTY_TAGS = { brown: false, start: false, end: false }

function tagsEqual(a, b) {
  const t = b || EMPTY_TAGS
  return a.brown === t.brown && a.start === t.start && a.end === t.end
}

export default function DayModal({ date, day, currentLevel, currentTags, onSave, onClose }) {
  const normalizedCurrentLevel = currentLevel >= 5 ? 4 : currentLevel
  const [selected, setSelected] = useState(normalizedCurrentLevel)
  const [tags, setTags] = useState(currentTags || EMPTY_TAGS)

  const saveLevel = selected ?? normalizedCurrentLevel
  const tagsChanged = !tagsEqual(tags, currentTags)
  const levelChanged = selected !== normalizedCurrentLevel
  const hasAnyTag = tags.brown || tags.start || tags.end
  const canSave =
    (saveLevel && (levelChanged || tagsChanged)) ||
    (tagsChanged && hasAnyTag && !saveLevel)
  const hasRecord =
    normalizedCurrentLevel ||
    (currentTags && (currentTags.brown || currentTags.start || currentTags.end))

  function formatDisplay(dateStr) {
    const [y, m, d] = dateStr.split('-')
    return `${parseInt(m)}월 ${parseInt(d)}일`
  }

  function toggleTag(key) {
    setTags(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleConfirm() {
    if (!saveLevel && !hasAnyTag) return
    onSave(day, saveLevel, tags)
  }

  function handleDelete() {
    onSave(day, null, { brown: false, start: false, end: false })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-top-row">
          <div className="modal-date">{formatDisplay(date)}</div>
          <div className="modal-tags">
            <label className={`tag-check ${tags.brown ? 'checked' : ''}`}>
              <input type="checkbox" checked={tags.brown} onChange={() => toggleTag('brown')} />
              <span>갈색혈</span>
            </label>
            <label className={`tag-check ${tags.start ? 'checked' : ''}`}>
              <input type="checkbox" checked={tags.start} onChange={() => toggleTag('start')} />
              <span>시작</span>
            </label>
            <label className={`tag-check ${tags.end ? 'checked' : ''}`}>
              <input type="checkbox" checked={tags.end} onChange={() => toggleTag('end')} />
              <span>끝</span>
            </label>
          </div>
        </div>

        <div className="level-grid">
          {FLOW_LEVELS.slice(1).map((flow, i) => {
            const level = i + 1
            if (level > 4) return null
            const isActive = selected === level
            return (
              <button
                key={level}
                className={`level-btn level-${level} ${isActive ? 'active' : ''}`}
                style={{
                  '--flow-fill': flow.fill,
                  '--flow-bg': flow.bg,
                  '--flow-border': flow.border,
                  '--flow-stroke': flow.stroke,
                  '--flow-text': flow.textOnFill,
                  background: isActive ? flow.fill : flow.bg,
                  borderColor: flow.border,
                  color: isActive ? flow.textOnFill : flow.border,
                }}
                onClick={() => setSelected(isActive ? null : level)}
              >
                <span className="level-num">{level}</span>
                <DropletMini flow={flow} />
                {isActive && <span className="level-label">{flow.label}</span>}
              </button>
            )
          })}
        </div>

        <div className="modal-actions">
          {hasRecord && (
            <button className="btn-delete" onClick={handleDelete}>
              기록 삭제
            </button>
          )}
          <button
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={!canSave}
            style={
              saveLevel
                ? {
                    background: FLOW_LEVELS[Math.min(saveLevel, 4)].fill,
                    color: FLOW_LEVELS[Math.min(saveLevel, 4)].textOnFill,
                  }
                : {}
            }
          >
            {levelChanged && selected
              ? `${selected}단계로 저장`
              : '저장'}
          </button>
        </div>

        <button className="btn-close" onClick={onClose}>✕</button>
      </div>
    </div>
  )
}

function DropletMini({ flow }) {
  return (
    <svg viewBox="0 0 32 40" className="droplet-mini">
      <path
        d="M16 3 C16 3 14 7 10 14 C6 21 4 24 4 28 C4 34 9.4 38 16 38 C22.6 38 28 34 28 28 C28 24 26 21 22 14 C18 7 16 3 16 3 Z"
        fill={flow.fill}
        stroke={flow.stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
