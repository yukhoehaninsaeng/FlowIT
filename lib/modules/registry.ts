import {
  LayoutDashboard, Users, TrendingUp, Package, Megaphone,
  GitBranch, Star, MessageSquare, BarChart3,
  ShoppingCart, Warehouse, Truck, RotateCcw, Receipt,
  BrainCircuit, ClipboardList, FileText, DollarSign, Phone, Building2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ModuleCategory = 'core' | 'marketing' | 'logistics' | 'analytics' | 'sales'

export interface ModuleDef {
  key: string
  label: string
  href: string
  icon: LucideIcon
  category: ModuleCategory
  description: string
  defaultEnabled: boolean
}

export const MODULE_REGISTRY: ModuleDef[] = [
  // ── sales ──────────────────────────────────
  {
    key: 'contact_logs',
    label: '상담 이력',
    href: '/contact-logs',
    icon: Phone,
    category: 'sales',
    description: '이메일 자동 동기화, 도메인 기반 거래처 매칭, 상담 타임라인',
    defaultEnabled: true,
  },
  {
    key: 'quotes',
    label: '견적 관리',
    href: '/quotes',
    icon: FileText,
    category: 'sales',
    description: '견적서 작성, PDF 출력, 버전 관리, 승인 워크플로우',
    defaultEnabled: true,
  },
  {
    key: 'receivables',
    label: '미수금 관리',
    href: '/receivables',
    icon: DollarSign,
    category: 'sales',
    description: '청구서 관리, 입금 추적, 연체 현황, 거래처별 미수금',
    defaultEnabled: true,
  },
  {
    key: 'accounts',
    label: '거래처',
    href: '/accounts',
    icon: Building2,
    category: 'sales',
    description: '거래처 정보, 담당자, 딜·상담·미수금 연결 관리',
    defaultEnabled: true,
  },
  {
    key: 'products',
    label: '상품 관리',
    href: '/products',
    icon: Package,
    category: 'sales',
    description: '상품 카탈로그, 단가 관리, 거래처별 제품 매핑',
    defaultEnabled: true,
  },
  // ── core ───────────────────────────────────
  {
    key: 'dashboard',
    label: '대시보드',
    href: '/',
    icon: LayoutDashboard,
    category: 'core',
    description: '주요 KPI 요약 및 실시간 현황판',
    defaultEnabled: true,
  },
  {
    key: 'customers',
    label: '고객 CDP',
    href: '/customers',
    icon: Users,
    category: 'core',
    description: '고객 통합 프로필, RFM 세분화, 여정 추적',
    defaultEnabled: true,
  },
  {
    key: 'sales',
    label: '영업 파이프라인',
    href: '/sales',
    icon: TrendingUp,
    category: 'core',
    description: '딜 단계 관리, 파이프라인 시각화',
    defaultEnabled: true,
  },
  {
    key: 'inventory',
    label: '재고·SKU',
    href: '/inventory',
    icon: Package,
    category: 'core',
    description: 'SKU 마스터, 채널별 재고, 로트 유통기한 관리',
    defaultEnabled: true,
  },
  // ── marketing ──────────────────────────────
  {
    key: 'campaigns',
    label: '캠페인',
    href: '/campaigns',
    icon: Megaphone,
    category: 'marketing',
    description: 'SMS·이메일 캠페인, A/B 테스트, 발송 통계',
    defaultEnabled: true,
  },
  {
    key: 'journeys',
    label: '여정 자동화',
    href: '/journeys',
    icon: GitBranch,
    category: 'marketing',
    description: '조건 분기 기반 마케팅 자동화 워크플로우',
    defaultEnabled: true,
  },
  {
    key: 'influencers',
    label: '인플루언서',
    href: '/influencers',
    icon: Star,
    category: 'marketing',
    description: '인플루언서 관리, UTM 추적, ROI 분석',
    defaultEnabled: false,
  },
  {
    key: 'voc',
    label: 'VOC·리뷰',
    href: '/voc',
    icon: MessageSquare,
    category: 'marketing',
    description: 'AI 감성분석, 리뷰 이상 탐지, Slack 알림',
    defaultEnabled: false,
  },
  // ── logistics ──────────────────────────────
  {
    key: 'purchase_orders',
    label: '발주·수주',
    href: '/purchase-orders',
    icon: ClipboardList,
    category: 'logistics',
    description: '발주서·수주서 발행, 거래처 주문 관리',
    defaultEnabled: false,
  },
  {
    key: 'warehouse',
    label: '창고·입출고',
    href: '/warehouse',
    icon: Warehouse,
    category: 'logistics',
    description: '창고 로케이션, 입고/출고/이동, 재고 실사',
    defaultEnabled: false,
  },
  {
    key: 'shipments',
    label: '배송 추적',
    href: '/shipments',
    icon: Truck,
    category: 'logistics',
    description: '송장 등록, 실시간 배송 상태, 택배사 연동',
    defaultEnabled: false,
  },
  {
    key: 'returns',
    label: '반품 관리',
    href: '/returns',
    icon: RotateCcw,
    category: 'logistics',
    description: '반품 접수, 검수, 재입고, 환불 처리',
    defaultEnabled: false,
  },
  {
    key: 'settlements',
    label: '거래처 정산',
    href: '/settlements',
    icon: Receipt,
    category: 'logistics',
    description: '거래처별 월별 정산, 세금계산서 발행 현황',
    defaultEnabled: false,
  },
  {
    key: 'lot_management',
    label: 'LOT 관리',
    href: '/lot-management',
    icon: Package,
    category: 'logistics',
    description: '로트 추적, 유통기한 알림, 회수·리콜 관리',
    defaultEnabled: false,
  },
  // ── analytics ──────────────────────────────
  {
    key: 'ai_forecast',
    label: 'AI 수요예측',
    href: '/forecast',
    icon: BrainCircuit,
    category: 'analytics',
    description: 'SKU별 수요 예측, 발주 최적화 제안',
    defaultEnabled: false,
  },
  {
    key: 'bi',
    label: 'BI 대시보드',
    href: '/bi',
    icon: BarChart3,
    category: 'analytics',
    description: '매출·채널·고객 분석 인터랙티브 차트',
    defaultEnabled: true,
  },
]

export const INDUSTRY_PRESETS: Record<string, string[]> = {
  cosmetics: [
    'contact_logs', 'quotes', 'receivables', 'accounts', 'products',
    'dashboard', 'customers', 'sales', 'inventory',
    'campaigns', 'journeys', 'influencers', 'voc', 'bi',
  ],
  logistics: [
    'contact_logs', 'quotes', 'receivables', 'accounts', 'products',
    'dashboard', 'customers', 'sales', 'inventory',
    'purchase_orders', 'warehouse', 'shipments', 'returns',
    'settlements', 'lot_management', 'ai_forecast', 'bi',
  ],
  food: [
    'contact_logs', 'quotes', 'receivables', 'accounts', 'products',
    'dashboard', 'customers', 'sales', 'inventory',
    'purchase_orders', 'warehouse', 'shipments', 'returns',
    'lot_management', 'voc', 'bi',
  ],
  general: [
    'contact_logs', 'quotes', 'receivables', 'accounts', 'products',
    'dashboard', 'customers', 'sales', 'inventory',
    'campaigns', 'bi',
  ],
}

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  sales: '영업·거래',
  core: '핵심',
  marketing: '마케팅',
  logistics: '물류·유통',
  analytics: '분석',
}

export function getModuleByKey(key: string): ModuleDef | undefined {
  return MODULE_REGISTRY.find(m => m.key === key)
}
