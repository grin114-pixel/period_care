// 생리량 1~4단계 — 단계별로 색·테두리 차이를 크게 둠
export const FLOW_LEVELS = [
  null,
  {
    fill: '#ffe8ef',
    bg: '#fff5f8',
    stroke: '#ffb3c6',
    border: '#ff8fab',
    label: '매우 적음',
    textOnFill: '#a63d52',
  },
  {
    fill: '#ff9eb5',
    bg: '#ffe8ef',
    stroke: '#ff6b8a',
    border: '#ff4d6d',
    label: '적음',
    textOnFill: '#8b1530',
  },
  {
    fill: '#f25570',
    bg: '#ffd6e0',
    stroke: '#e63956',
    border: '#d62839',
    label: '보통',
    textOnFill: '#fff',
  },
  {
    fill: '#d62839',
    bg: '#ffb3c6',
    stroke: '#b9161a',
    border: '#9d0208',
    label: '많음',
    textOnFill: '#fff',
  },
]

export function getFlowLevel(level) {
  if (!level) return null
  // 예전에 5단계로 저장된 값이 있으면 4단계로 보정
  if (level >= 5) return FLOW_LEVELS[4]
  if (level < 1 || level > 4) return null
  return FLOW_LEVELS[level]
}

export function getFlowFill(level) {
  return getFlowLevel(level)?.fill ?? null
}
