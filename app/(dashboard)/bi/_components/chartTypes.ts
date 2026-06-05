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

// CRM 사용 빈도 순 정렬: 가로막대(40%) > 꺾은선(30%) > 도넛(15%) > 세로막대(10%) > 기타
export const CHART_TYPES = [
  // ── 단일 계열 ─ CRM 우선순위 ────────────────────────────────
  { value: 'bar_h',       label: '가로막대', desc: '순위·비교  ★CRM 1위',   multiSeries: false },
  { value: 'line',        label: '꺾은선',   desc: '시계열 추이  ★CRM 2위',  multiSeries: false },
  { value: 'donut',       label: '도넛',    desc: '비율  ★CRM 3위',         multiSeries: false },
  { value: 'bar',         label: '세로막대', desc: '카테고리 비교',           multiSeries: false },
  { value: 'area',        label: '영역',    desc: '면적 추이',               multiSeries: false },
  { value: 'pie',         label: '파이',    desc: '원형 비중',               multiSeries: false },
  { value: 'funnel',      label: '퍼널',    desc: '단계 전환',               multiSeries: false },
  { value: 'treemap',     label: '트리맵',  desc: '면적 분포',               multiSeries: false },
  // ── 2계열 ────────────────────────────────────────────────
  { value: 'bar_grouped', label: '그룹막대', desc: '2계열 나란히',            multiSeries: true  },
  { value: 'bar_stacked', label: '누적막대', desc: '2계열 누적',              multiSeries: true  },
  { value: 'line_multi',  label: '멀티라인', desc: '2계열 꺾은선',            multiSeries: true  },
  { value: 'scatter',     label: '산점도',  desc: 'X·Y 상관관계',            multiSeries: true  },
  { value: 'combo',       label: '콤보',    desc: '막대 + 꺾은선',           multiSeries: true  },
]

// ── AI 차트 추천 엔진 (Tableau·Power BI 규칙 기반) ─────────────
export function recommendChartType(dimension: string): string {
  switch (dimension) {
    // 시계열 → 꺾은선/영역
    case 'month':         return 'area'
    case 'hour':          return 'area'
    case 'weekday':       return 'bar'
    case 'month_yoy':     return 'bar_grouped'
    case 'channel_trend': return 'line'
    case 'return_trend':  return 'bar_grouped'
    // 순위·긴 레이블 → 가로막대 강제
    case 'sku_top':       return 'bar_h'
    case 'partner':       return 'bar_h'
    case 'segment':       return 'bar_h'
    case 'campaign_perf': return 'bar_h'
    // 비율 (소수 항목) → 도넛
    case 'channel':       return 'donut'
    case 'carrier':       return 'donut'
    // 단계형 → 퍼널
    case 'funnel_stage':  return 'funnel'
    // 분포 → 트리맵
    case 'category':      return 'treemap'
    case 'reason':        return 'treemap'
    // 기본 → 세로막대
    default:              return 'bar'
  }
}

// channel_trend는 항상 N계열 데이터(채널별 시리즈) 반환 → 차트 유형 고정
export const N_SERIES_DIMS = new Set(['channel_trend'])

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

// ── Rule 5: 데이터 유형 분류 (TYPE A–G) ─────────────────────
export type BiDataType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export const DATA_TYPE_INFO: Record<BiDataType, { label: string; desc: string; badge: string }> = {
  A: { label: 'TYPE A · 시계열',    desc: '시간 흐름 추이',      badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  B: { label: 'TYPE B · 카테고리',  desc: '항목 간 크기 비교',   badge: 'bg-gray-50 text-gray-700 border border-gray-200' },
  C: { label: 'TYPE C · 구성비',    desc: '전체 대비 비율',      badge: 'bg-purple-50 text-purple-700 border border-purple-200' },
  D: { label: 'TYPE D · 순위',      desc: 'Top N 랭킹',         badge: 'bg-orange-50 text-orange-700 border border-orange-200' },
  E: { label: 'TYPE E · 상관관계',  desc: '두 변수 상관 분석',   badge: 'bg-pink-50 text-pink-700 border border-pink-200' },
  F: { label: 'TYPE F · 단계형',    desc: '전환율 흐름',         badge: 'bg-red-50 text-red-700 border border-red-200' },
  G: { label: 'TYPE G · 복합',      desc: '단위 다른 두 지표',   badge: 'bg-teal-50 text-teal-700 border border-teal-200' },
}

export const DIMENSION_DATA_TYPE: Record<string, BiDataType> = {
  month: 'A',        month_yoy: 'A',      weekday: 'A',
  hour: 'A',         channel_trend: 'A',  return_trend: 'A',
  channel: 'C',      carrier: 'B',        partner: 'D',
  category: 'B',     segment: 'C',
  sku_top: 'D',      campaign_perf: 'D',
  funnel_stage: 'F', stage: 'B',
  reason: 'B',
}

// ── Rule 11: 채널 고정 색상 ──────────────────────────────────
export const CHANNEL_COLORS_MAP: Record<string, string> = {
  '쿠팡': '#2563EB', 'coupang': '#2563EB',
  '네이버': '#16A34A', 'naver': '#16A34A',
  '카카오': '#F59E0B', 'kakao': '#F59E0B',
  '올리브영': '#7C3AED', 'oliveyoung': '#7C3AED',
  '자사몰': '#DC2626', 'direct': '#DC2626',
}

export function getChannelColor(name: string, fallbackIdx: number): string {
  const low = name.toLowerCase()
  for (const [key, color] of Object.entries(CHANNEL_COLORS_MAP)) {
    if (low.includes(key.toLowerCase())) return color
  }
  return CHART_COLORS[fallbackIdx % CHART_COLORS.length]
}

// ── Rule 16: 신뢰도 산정 ──────────────────────────────────────
export function calcConfidence(opts: {
  dataTypeClear: boolean
  categoryCountOk: boolean  // 2~10개
  hasTimeAxis: boolean
  noMissingValues: boolean
  noOutliers: boolean
}): number {
  return (
    (opts.dataTypeClear    ? 30 : 0) +
    (opts.categoryCountOk  ? 20 : 0) +
    (opts.hasTimeAxis      ? 20 : 0) +
    (opts.noMissingValues  ? 15 : 0) +
    (opts.noOutliers       ? 15 : 0)
  )
}

// ── Rule 17: 설명 가능한 추천 이유 ──────────────────────────
export interface RecommendMeta {
  dataType: BiDataType | null
  reasons: string[]
  confidence: number
  alternativeValue: string
  alternativeLabel: string
}

export function getRecommendMeta(dimension: string): RecommendMeta {
  const dt = DIMENSION_DATA_TYPE[dimension] as BiDataType | undefined
  const rec = recommendChartType(dimension)
  const altLabel = (v: string) => CHART_TYPES.find(t => t.value === v)?.label ?? v

  const reasons: string[] = []
  let confidence = 60
  let altV = 'bar_h'

  switch (dt) {
    case 'A':
      if (dimension === 'channel_trend') {
        reasons.push('채널별 N계열 시계열 (TYPE A)')
        reasons.push('복수 채널 동시 비교 → 꺾은선 전용')
        confidence = 95; altV = '─'
      } else if (dimension === 'month_yoy') {
        reasons.push('두 기간 비교 시계열 (TYPE A)')
        reasons.push('올해 vs 작년 나란히 비교 → 그룹막대')
        confidence = 90; altV = 'line_multi'
      } else {
        reasons.push(`시계열 데이터 (TYPE A · ${DATA_TYPE_INFO.A.desc})`)
        reasons.push('시간 흐름 트렌드 파악 목적')
        confidence = 88; altV = rec === 'area' ? 'line' : 'area'
      }
      break
    case 'D':
      reasons.push(`순위 데이터 (TYPE D · ${DATA_TYPE_INFO.D.desc})`)
      reasons.push('긴 레이블 → 가로막대 강제 적용')
      reasons.push('Top N 선택으로 데이터 축약 가능')
      confidence = 95; altV = 'bar'
      break
    case 'C':
      reasons.push(`구성비 데이터 (TYPE C · ${DATA_TYPE_INFO.C.desc})`)
      reasons.push('항목 6개 미만 → 도넛 (비율 시각화)')
      reasons.push('6개 이상 시 가로막대로 자동 전환')
      confidence = 85; altV = 'bar_h'
      break
    case 'F':
      reasons.push(`단계형 데이터 (TYPE F · ${DATA_TYPE_INFO.F.desc})`)
      reasons.push('LEAD → CLOSED 전환율 시각화')
      reasons.push('퍼널 차트 전용 (다른 차트로 대체 불가)')
      confidence = 98; altV = 'bar'
      break
    case 'B':
      reasons.push(`카테고리 비교 (TYPE B · ${DATA_TYPE_INFO.B.desc})`)
      reasons.push('항목 간 크기 비교 목적')
      confidence = 75; altV = 'bar_h'
      break
    default:
      reasons.push('기본 추천: 가로막대 (CRM 사용 빈도 1위)')
      confidence = 60; altV = 'bar'
  }

  return { dataType: dt ?? null, reasons, confidence, alternativeValue: altV, alternativeLabel: altLabel(altV) }
}
