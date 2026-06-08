'use client';

// react-patterns CASE 2: URL searchParams = single source of truth
// - useState로 필터 상태 관리 금지
// - useEffect로 searchParams → setState 동기화 금지

import { Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ChannelTable } from '@/components/ChannelTable';
import { useChannelData } from '@/lib/hooks/useChannelData';

const SORT_OPTIONS = [
  { value: 'revenue', label: '매출액' },
  { value: 'units', label: '판매량' },
  { value: 'returnRate', label: '반품률' },
  { value: 'mom', label: '전분기 대비' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['value'];

function generatePeriods(): string[] {
  const periods: string[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQ = Math.ceil((now.getMonth() + 1) / 3);
  for (let year = 2024; year <= currentYear; year++) {
    const maxQ = year === currentYear ? currentQ : 4;
    for (let q = 1; q <= maxQ; q++) {
      periods.push(`${year}Q${q}`);
    }
  }
  return periods.reverse(); // 최신 분기부터
}

const PERIODS = generatePeriods();

function ChannelAnalyticsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // state 없이 URL에서 직접 읽기
  const period = searchParams.get('period') ?? PERIODS[0];
  const sortBy = (searchParams.get('sort') ?? 'revenue') as SortKey;

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  // 데이터 페칭은 커스텀 훅에 위임
  const { data, isLoading, error } = useChannelData({ period });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-gray-900">채널별 판매 현황</h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 기간 선택 */}
          <select
            value={period}
            onChange={(e) => updateParam('period', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* 정렬 선택 */}
          <select
            value={sortBy}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} 순
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ChannelTable은 data prop만 받음 — 내부에서 fetch 없음 */}
      <ChannelTable
        data={data}
        isLoading={isLoading}
        error={error}
        sortBy={sortBy}
      />

      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-400 border border-gray-100">
          {JSON.stringify({ period, sortBy }, null, 2)}
        </pre>
      )}
    </div>
  );
}

// useSearchParams()는 Suspense boundary 안에서 사용해야 함 (Next.js 15)
export default function ChannelAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          불러오는 중...
        </div>
      }
    >
      <ChannelAnalyticsContent />
    </Suspense>
  );
}
