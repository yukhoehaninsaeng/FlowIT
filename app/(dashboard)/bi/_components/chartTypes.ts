export interface ChartConfig {
  id: string
  title: string
  dimension: string
  metric: string
  metric2?: string
  chartType: string
  period: string
  colSpan: 3 | 6 | 9 | 12
  height: 'sm' | 'md' | 'lg'
  // pre-computed labels for display
  dimLabel: string
  metricLabel: string
  metric2Label?: string
  isCurrency: boolean
  isCurrency2?: boolean
}

export const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

export const PERIODS = [
  { label: '이번달', value: 'monthly' },
  { label: '분기',   value: 'quarterly' },
  { label: '연도',   value: 'yearly' },
]

export const DIMENSIONS = [
  { value: 'channel',  label: '매출 채널' },
  { value: 'month',    label: '월별 추이' },
  { value: 'segment',  label: '고객 세그먼트' },
  { value: 'stage',    label: '딜 단계' },
  { value: 'category', label: '상품 카테고리' },
  { value: 'reason',   label: '반품 사유' },
  { value: 'partner',  label: '거래처 정산' },
]

export const METRICS_BY_DIM: Record<string, { value: string; label: string; isCurrency: boolean }[]> = {
  channel:  [{ value: 'revenue', label: '매출액', isCurrency: true  }, { value: 'count', label: '주문 수', isCurrency: false }],
  month:    [{ value: 'revenue', label: '매출액', isCurrency: true  }, { value: 'count', label: '주문 수', isCurrency: false }],
  segment:  [{ value: 'count',   label: '고객 수', isCurrency: false }, { value: 'avg_ltv', label: '평균 LTV', isCurrency: true }],
  stage:    [{ value: 'revenue', label: '딜 금액', isCurrency: true  }, { value: 'count', label: '딜 건수', isCurrency: false }],
  category: [{ value: 'count',   label: '상품 수', isCurrency: false }],
  reason:   [{ value: 'count',   label: '건수',   isCurrency: false }, { value: 'refund', label: '환불액', isCurrency: true }],
  partner:  [{ value: 'revenue', label: '정산액', isCurrency: true  }, { value: 'count', label: '정산 건수', isCurrency: false }],
}

export const CHART_TYPES = [
  { value: 'bar',         label: '막대',    desc: '세로 막대',     multiSeries: false },
  { value: 'bar_h',       label: '가로막대', desc: '수평 막대',    multiSeries: false },
  { value: 'line',        label: '라인',    desc: '꺾은선',        multiSeries: false },
  { value: 'area',        label: '영역',    desc: '면적 차트',     multiSeries: false },
  { value: 'pie',         label: '파이',    desc: '원형 비중',     multiSeries: false },
  { value: 'donut',       label: '도넛',    desc: '도넛 비중',     multiSeries: false },
  { value: 'bar_grouped', label: '그룹막대', desc: '2계열 나란히', multiSeries: true  },
  { value: 'bar_stacked', label: '누적막대', desc: '2계열 누적',   multiSeries: true  },
  { value: 'line_multi',  label: '멀티라인', desc: '2계열 추이',   multiSeries: true  },
  { value: 'combo',       label: '콤보',    desc: '막대 + 라인',  multiSeries: true  },
]

export const COL_SPAN_CLASSES: Record<number, string> = {
  3:  'col-span-3',
  6:  'col-span-6',
  9:  'col-span-9',
  12: 'col-span-12',
}

export const HEIGHT_PX: Record<string, number> = {
  sm: 220,
  md: 300,
  lg: 420,
}

export const CHART_STORAGE_KEY = 'flowit_bi_charts_v2'
