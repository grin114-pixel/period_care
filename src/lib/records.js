const TAGS_STORAGE_KEY = 'period_care_tags'
const EMPTY_TAGS = { brown: false, start: false, end: false }

let tagColumnsAvailable = null

export function normalizeDateKey(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function loadLocalTags() {
  if (typeof localStorage === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(TAGS_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveLocalTags(all) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(all))
}

export function getLocalTags(dateStr) {
  return loadLocalTags()[dateStr] || { ...EMPTY_TAGS }
}

export function setLocalTags(dateStr, tags) {
  const all = loadLocalTags()
  if (tags.brown || tags.start || tags.end) {
    all[dateStr] = {
      brown: !!tags.brown,
      start: !!tags.start,
      end: !!tags.end,
    }
  } else {
    delete all[dateStr]
  }
  saveLocalTags(all)
}

function hasAnyTag(tags) {
  return !!(tags?.brown || tags?.start || tags?.end)
}

async function detectTagColumns(supabase) {
  if (tagColumnsAvailable !== null) return tagColumnsAvailable
  // 컬럼이 실제로 존재하는지(그리고 접근 가능한지) 확인합니다.
  // "에러 코드"가 환경/권한에 따라 달라질 수 있어서, 에러가 하나라도 있으면
  // 태그 컬럼이 없거나 접근 불가로 보고 localStorage 폴백을 사용합니다.
  const { error } = await supabase.from('period_records').select('is_brown').limit(0)
  tagColumnsAvailable = !error
  return tagColumnsAvailable
}

export async function fetchMonthRecords(supabase, from, to) {
  const dbHasTags = await detectTagColumns(supabase)
  const columns = dbHasTags
    ? 'record_date, flow_level, is_brown, is_start, is_end'
    : 'record_date, flow_level'

  const { data, error } = await supabase
    .from('period_records')
    .select(columns)
    .gte('record_date', from)
    .lte('record_date', to)

  if (error) throw error

  // 태그는 새로고침에도 유지되도록 localStorage에도 항상 저장합니다.
  // DB에 태그를 쓸 수 있어도 "물방울 없이 태그만 저장" 같은 케이스를 커버하기 위함입니다.
  const localTags = loadLocalTags()
  const map = {}

  for (const row of data || []) {
    const dateKey = normalizeDateKey(row.record_date)
    map[dateKey] = {
      level: row.flow_level,
      tags: dbHasTags
        ? { brown: row.is_brown, start: row.is_start, end: row.is_end }
        : { ...EMPTY_TAGS },
    }

    // localTags가 있으면 DB 값을 덮어씁니다.
    if (localTags[dateKey]) {
      map[dateKey].tags = { ...localTags[dateKey] }
    }
  }

  // DB에 없는 날짜라도 local에 태그가 있다면 보여줍니다.
  for (const [dateKey, tags] of Object.entries(localTags)) {
    if (dateKey >= from && dateKey <= to && hasAnyTag(tags)) {
      if (!map[dateKey]) map[dateKey] = { level: null, tags }
    }
  }

  return map
}

export async function saveDayRecord(supabase, dateStr, level, tags) {
  const dbHasTags = await detectTagColumns(supabase)
  const tagPayload = {
    brown: !!tags.brown,
    start: !!tags.start,
    end: !!tags.end,
  }

  if (level === null && !hasAnyTag(tagPayload)) {
    const { error } = await supabase.from('period_records').delete().eq('record_date', dateStr)
    if (error) throw error
    // DB에 태그 컬럼이 있더라도, 달력 렌더는 localStorage 태그를 덮어씁니다.
    // 그래서 "삭제" 시에는 localStorage도 반드시 같이 지워야 재등장하지 않습니다.
    setLocalTags(dateStr, EMPTY_TAGS)
    return
  }

  // DB에 태그 컬럼이 있으면 "태그만(=flow_level null)" 저장도 지원합니다.
  if (level !== null || (dbHasTags && hasAnyTag(tagPayload))) {
    const row = dbHasTags
      ? {
          record_date: dateStr,
          flow_level: level,
          is_brown: tagPayload.brown,
          is_start: tagPayload.start,
          is_end: tagPayload.end,
        }
      : { record_date: dateStr, flow_level: level }

    const { error } = await supabase
      .from('period_records')
      .upsert(row, { onConflict: 'record_date' })

    if (error) throw error
  }

  // 태그는 항상 localStorage에도 저장합니다. (물방울 없이 태그만 저장하는 케이스 대응)
  setLocalTags(dateStr, tagPayload)
}

export function hasAnyTagEnabled(tags) {
  return hasAnyTag(tags)
}

function parseDate(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function formatDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 최근 생리 시작일(시작 태그 우선)을 찾습니다.
// - DB 태그 컬럼이 있으면 DB에서 is_start 기준으로 찾고,
// - 없거나 못 찾으면 localStorage 태그(start=true)에서 찾고,
// - 그래도 없으면 최근 flow 기록을 시작일로 추정합니다.
export async function findRecentCycleStart(supabase, lookbackDays = 120) {
  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - lookbackDays)
  const fromKey = formatDateKey(from)
  const toKey = formatDateKey(today)

  const dbHasTags = await detectTagColumns(supabase)
  const columns = dbHasTags
    ? 'record_date, flow_level, is_start'
    : 'record_date, flow_level'

  const { data, error } = await supabase
    .from('period_records')
    .select(columns)
    .gte('record_date', fromKey)
    .lte('record_date', toKey)
    .order('record_date', { ascending: false })
    .limit(lookbackDays)

  if (error) throw error

  if (dbHasTags) {
    const startRow = (data || []).find(r => r.is_start)
    if (startRow?.record_date) return normalizeDateKey(startRow.record_date)
  }

  const localTags = loadLocalTags()
  const localStartDates = Object.entries(localTags)
    .filter(([k, v]) => k >= fromKey && k <= toKey && v?.start)
    .map(([k]) => k)
    .sort()
  if (localStartDates.length) return localStartDates[localStartDates.length - 1]

  const recentFlow = (data || []).find(r => r.flow_level != null)
  if (recentFlow?.record_date) return normalizeDateKey(recentFlow.record_date)

  return null
}

// 최근 2개의 "시작" 날짜를 찾아서 주기 길이를 계산합니다.
// 주기 길이 = (현재 시작일 - 이전 시작일) 의 날짜 차이
// 다음 생리 예상일은 "현재 시작일 + 주기 길이"로 계산합니다.
export async function findCycleStartAndLength(supabase, lookbackDays = 180) {
  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - lookbackDays)
  const fromKey = formatDateKey(from)
  // 미래에 체크한 '시작'도 주기 계산에 반영 (테스트/예정일 입력 대응)
  const future = new Date(today)
  future.setDate(future.getDate() + 365)
  const toKey = formatDateKey(future)

  const localTags = loadLocalTags()
  const localStarts = Object.entries(localTags)
    .filter(([k, v]) => k >= fromKey && k <= toKey && v?.start)
    .map(([k]) => k)

  // DB에서 is_start가 가능한 경우 추가로 보강
  const dbHasTags = await detectTagColumns(supabase)
  let dbStarts = []
  if (dbHasTags) {
    const { data, error } = await supabase
      .from('period_records')
      .select('record_date, is_start')
      .gte('record_date', fromKey)
      .lte('record_date', toKey)
      .order('record_date', { ascending: true })
    if (!error && data) {
      dbStarts = data
        .filter(r => r.is_start)
        .map(r => normalizeDateKey(r.record_date))
    }
  }

  const allStarts = Array.from(new Set([...dbStarts, ...localStarts]))
    .filter(Boolean)
    .sort()

  const currentStartKey = allStarts.length ? allStarts[allStarts.length - 1] : null
  const prevStartKey = allStarts.length > 1 ? allStarts[allStarts.length - 2] : null

  let cycleLength = null
  if (currentStartKey && prevStartKey) {
    const currentStart = parseDate(currentStartKey)
    const prevStart = parseDate(prevStartKey)
    if (currentStart && prevStart) {
      // diffDays는 Calendar 쪽에 있던 로직과 동일하게 "날짜 차이"로 계산
      const ms = 24 * 60 * 60 * 1000
      const a = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate()).getTime()
      const b = new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate()).getTime()
      cycleLength = Math.round((a - b) / ms)
    }
  }

  return { currentStartKey, prevStartKey, cycleLength }
}
