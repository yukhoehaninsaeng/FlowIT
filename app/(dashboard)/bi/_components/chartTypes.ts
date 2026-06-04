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
  limit?: number
  dimLabel: string
  metricLabel: string
  metric2Label?: string
  isCurrency: boolean
  isCurrency2?: boolean
  series?: string[]
}

export const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#14b8a6', '#a855f7', '#eab308',
]

const thisYear = new Date().getFullYear()
export const PERIODS = [
  { label: '이번달',          value: 'monthly' },
  { label: '분기',            value: 'quarterly' },
  { label: `${thisYear}년`,   value: `year_${thisYear}` },
  { label: `${thisYear-1}년`, value: `year_${thisYear - 1}` },
  { label: `${thisYear-2}년`, value: `year_${thisYear - 2}` },
]

export type DimensionCategory = '매출·채널' | '상품' | '고객' | '영업' | '마케팅' | '물류·반품'

export const DIMENSIONS: { value: string; label: string; category: DimensionCategory; hint: string; suggestedChart: string }[] = [
  // ── 매출·채널 ──────────────────────────────────────────
  { value: 'channel',       label: '채널별 매출',      category: '매출·채널', hint: '각 판매채널(쿠팡·네이버 등)의 매출 비교',    suggestedChart: 'donut'       },
  { value: 'channel_trend', label: '채널별 월간 추이',  category: '매출·채널', hint: '채널별 월매출 라인 비교 (N계열)',             suggestedChart: 'line'        },
  { value: 'month',         label: '월별 추이',         category: '매출·채널', hint: '선택 연도의 월별 매출/주문수 변화',           suggestedChart: 'area'        },
  { value: 'month_yoy',     label: '전년 동기 비교',    category: '매출·채널', hint: '올해 vs 지난해 같은 달 비교',                 suggestedChart: 'bar_grouped' },
  { value: 'weekday',       label: '요일별 패턴',       category: '매출·채널', hint: '월~일 요일별 평균 매출·주문수',               suggestedChart: 'bar'         },
  { value: 'hour',          label: '시간대별',           category: '매출·채널', hint: '00~23시 시간대별 주문 집중도',                suggestedChart: 'area'        },
  // ── 상품 ──────────────────────────────────────────────
  { value: 'sku_top',       label: '상위 상품',          category: '상품',     hint: '매출/수량 기준 상위 N개 상품',                suggestedChart: 'bar_h'       },
  { value: 'category',      label: '카테고리별',         category: '상품',     hint: '상품 카테고리별 수량 분포',                   suggestedChart: 'treemap'     },
  // ── 고객 ──────────────────────────────────────────────
  { value: 'segment',       label: '고객 세그먼트',      category: '고객',     hint: 'VIP·이탈위험 등 세그먼트별 고객수·LTV',       suggestedChart: 'bar'         },
  // ── 영업 ──────────────────────────────────────────────
  { value: 'funnel_stage',  label: '영업 파이프라인',   category: '영업',     hint: 'LEAD→CLOSED 단계별 딜 수·금액',               suggestedChart: 'funnel'      },
  { value: 'stage',         label: '딜 단계 금액',       category: '영업',     hint: '딜 단계별 예상 매출 합계',                    suggestedChart: 'bar'         },
  // ── 마케팅 ────────────────────────────────────────────
  { value: 'campaign_perf', label: '캠페인 성과',        category: '마케팅',   hint: '캠페인 유형별 발송·전환율·기여매출',           suggestedChart: 'bar_grouped' },
  // ── 물류·반품 ─────────────────────────────────────────
  { value: 'reason',        label: '반품 사유',           category: '물류·반품', hint: '반품 사유별 건수·환불액',                   suggestedChart: 'treemap'     },
  { value: 'return_trend',  label: '반품 월별 추이',      category: '물류·반품', hint: '월별 반품 건수·금액 추이',                  suggestedChart: 'bar_grouped' },
  { value: 'carrier',       label: '배송사별',            category: '물류·반품', hint: '배송사별 배송 건수 비교',                   suggestedChart: 'pie'         },
  { value: 'partner',       label: '거래처 정산',         category: '물류·반품', hint: '파트너별 정산 금액',                        suggestedChart: 'bar_h'       },
]

export const DIMENSION_CATEGORIES: DimensionCategory[] = ['매출·채널', '상품', '고객', '영업', '마케팅', '물류·반품']

export const METRICS_BY_DIM: Record<string, { value: string; label: string; isCurrency: boolean }[]> = {
  channel:       [{ value: 'revenue', label: '매출액', isCurrency: true  }, { value: 'count', label: '주문 수', isCurrency: false }],
  channel_trend: [{ value: 'revenue', label: '매출액', isCurrency: true  }, { value: 'count', label: '주문 수', isCurrency: false }],
  month:         [{ value: 'revenue', label: '매출액', isCurrency: true  }, { value: 'count', label: '주문 수', isCurrency: false }],
  month_yoy:     [{ value: 'revenue', label: '매출액', isCurrency: true  }, { value: 'count', label: '주문 수', isCurrency: false }],
  weekday:       [{ value: 'revenue', label: '매출액', isCurrency: true  }, { value: 'count', label: '주문 수', isCurrency: false }],
  hour:          [{ value: 'revenue', label: '매출액', isCurrency: true  }, { value: 'count', label: '주문 수', isCurrency: false }],
  sku_top:       [{ value: 'revenue', label: '매출액', isCurrency: true  }, { value: 'qty',   label: '판매 수량', isCurrency: false }],
  category:      [{ value: 'count',   label: '상품 수', isCurrency: false }],
  segment:       [{ value: 'count',   label: '고객 수', isCurrency: false }, { value: 'avg_ltv', label: '평균 LTV', isCurrency: true }],
  funnel_stage:  [{ value: 'count',   label: '딜 건수', isCurrency: false }, { value: 'revenue', label: '딜 금액', isCurrency: true }],
  stage:         [{ value: 'revenue', label: '딜 금액', isCurrency: true  }, { value: 'count', label: '딜 건수', isCurrency: false }],
  campaign_perf: [{ value: 'revenue', label: '기여 매출', isCurrency: true }, { value: 'count', label: '발송 수', isCurrency: false }],
  reason:        [{ value: 'count',   label: '건수',   isCurrency: false }, { value: 'refund', label: '환불액', isCurrency: true }],
  return_trend:  [{ value: 'count',   label: '반품 건수', isCurrency: false }, { value: 'refund', label: '환불액', isCurrency: true }],
  carrier:       [{ value: 'count',   label: '배송 건수', isCurrency: false }],
  partner:       [{ value: 'revenue', label: '정산액', isCurrency: true  }, { value: 'count', label: '정산 건수', isCurrency: false }],
}

export const CHART_TYPES = [
  // Single series
  { value: 'bar',         label: '막대',    desc: '세로 막대',       multiSeries: false },
  { value: 'bar_h',       label: '가로막대', desc: '수평 막대',      multiSeries: false },
  { value: 'line',        label: '라인',    desc: '꺾은선 추이',     multiSeries: false },
  { value: 'area',        label: '영역',    desc: '면적 채움',       multiSeries: false },
  { value: 'pie',         label: '파이',    desc: '원형 비중',       multiSeries: false },
  { value: 'donut',       label: '도넛',    desc: '도넛 비중',       multiSeries: false },
  { value: 'funnel',      label: '퍼널',    desc: '단계 전환',       multiSeries: false },
  { value: 'treemap',     label: '트리맵',  desc: '면적 분포',       multiSeries: false },
  { value: 'radial',      label: '레이더',  desc: '방사형 비교',     multiSeries: false },
  // Multi series
  { value: 'bar_grouped', label: '그룹막대', desc: '2계열 나란히',   multiSeries: true  },
  { value: 'bar_stacked', label: '누적막대', desc: '2계열 누적',     multiSeries: true  },
  { value: 'line_multi',  label: '멀티라인', desc: '2계열 추이',     multiSeries: true  },
  { value: 'scatter',     label: '산점도',  desc: 'X·Y 상관관계',   multiSeries: true  },
  { value: 'combo',       label: '콤보',    desc: '막대 + 라인',    multiSeries: true  },
]

// Quick-start templates
export const QUICK_TEMPLATES = [
  { icon: '📈', title: '월간 매출 추이',       dimension: 'month',         metric: 'revenue',  chartType: 'area',        period: `year_${thisYear}` },
  { icon: '🍩', title: '채널별 매출 비중',     dimension: 'channel',       metric: 'revenue',  chartType: 'donut',       period: `year_${thisYear}` },
  { icon: '📊', title: '전년 대비 매출',       dimension: 'month_yoy',     metric: 'revenue',  chartType: 'bar_grouped', period: `year_${thisYear}` },
  { icon: '📉', title: '채널별 월별 추이',     dimension: 'channel_trend', metric: 'revenue',  chartType: 'line',        period: `year_${thisYear}` },
  { icon: '🏆', title: '상위 10 상품',         dimension: 'sku_top',       metric: 'revenue',  chartType: 'bar_h',       period: `year_${thisYear}`, limit: 10 },
  { icon: '🎯', title: '영업 파이프라인',      dimension: 'funnel_stage',  metric: 'count',    chartType: 'funnel',      period: `year_${thisYear}` },
  { icon: '📆', title: '요일별 주문 패턴',     dimension: 'weekday',       metric: 'count',    chartType: 'bar',         period: `year_${thisYear}` },
  { icon: '⏰', title: '시간대별 주문',        dimension: 'hour',          metric: 'count',    chartType: 'area',        period: `year_${thisYear}` },
  { icon: '👥', title: '세그먼트별 LTV',       dimension: 'segment',       metric: 'avg_ltv',  chartType: 'bar_h',       period: `year_${thisYear}` },
  { icon: '🗺️', title: '카테고리 분포',        dimension: 'category',      metric: 'count',    chartType: 'treemap',     period: `year_${thisYear}` },
  { icon: '🔄', title: '반품 사유 분석',       dimension: 'reason',        metric: 'count',    chartType: 'treemap',     period: `year_${thisYear}` },
  { icon: '📣', title: '캠페인 기여 매출',     dimension: 'campaign_perf', metric: 'revenue',  chartType: 'bar',         period: `year_${thisYear}` },
]

export const COL_SPAN_CLASSES: Record<number, string> = {
  3: 'col-span-3', 6: 'col-span-6', 9: 'col-span-9', 12: 'col-span-12',
}

export const HEIGHT_PX: Record<string, number> = {
  sm: 220, md: 300, lg: 420,
}

export const CHART_STORAGE_KEY = 'flowit_bi_charts_v2'
