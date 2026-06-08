// components/ChannelTable.tsx
// react-patterns 준수:
//   - 내부 useState/useEffect 없음
//   - data prop만 받아 렌더링
//   - 파생값(정렬, 합계)은 렌더 타임에 계산

import { useMemo } from 'react';
import type { ChannelRow } from '@/lib/hooks/useChannelData';

interface ChannelTableProps {
  data: ChannelRow[];
  isLoading: boolean;
  error: string | null;
  sortBy: 'revenue' | 'units' | 'returnRate' | 'mom';
}

function formatKRW(value: number): string {
  if (value >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(1)}억`;
  }
  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(0)}만`;
  }
  return value.toLocaleString('ko-KR');
}

function formatRate(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function MomBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
        isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {formatRate(value)}
    </span>
  );
}

const COLS: { label: string; key: keyof ChannelRow }[] = [
  { label: '채널', key: 'channel' },
  { label: '매출액', key: 'revenue' },
  { label: '판매량', key: 'units' },
  { label: '매출 구성비', key: 'revenueShare' },
  { label: '반품률', key: 'returnRate' },
  { label: '전분기 대비', key: 'mom' },
];

const SKELETON_ROWS = 4;

export function ChannelTable({ data, isLoading, error, sortBy }: ChannelTableProps) {
  // 파생 상태는 렌더 중에 계산 — useState(sortedData) 안티패턴 금지
  const sortedData = useMemo(
    () => [...data].sort((a, b) => b[sortBy] - a[sortBy]),
    [data, sortBy]
  );

  const totals = useMemo(
    () => ({
      revenue: data.reduce((s, r) => s + r.revenue, 0),
      units: data.reduce((s, r) => s + r.units, 0),
    }),
    [data]
  );

  if (error) {
    return (
      <div className="p-6 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
        데이터를 불러오지 못했습니다: {error}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full border-collapse" style={{ minWidth: 580 }}>
        <thead>
          <tr className="bg-gray-50">
            {COLS.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b border-gray-200 ${
                  col.key === 'channel' ? 'text-left' : 'text-right'
                } ${col.key === sortBy ? 'text-indigo-600' : 'text-gray-500'}`}
              >
                {col.label}
                {col.key === sortBy && ' ↓'}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isLoading
            ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i}>
                  {COLS.map((col) => (
                    <td key={col.key} className="px-4 py-3 border-b border-gray-100">
                      <div
                        className="h-3.5 rounded bg-gray-100 animate-pulse"
                        style={{
                          width: col.key === 'channel' ? 60 : '80%',
                          marginLeft: col.key === 'channel' ? 0 : 'auto',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : sortedData.map((row) => (
                <tr key={row.channel} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-100">
                    {row.channel}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 border-b border-gray-100">
                    {formatKRW(row.revenue)}원
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 border-b border-gray-100">
                    {row.units.toLocaleString()}개
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 border-b border-gray-100">
                    {formatRate(row.revenueShare)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 border-b border-gray-100">
                    {formatRate(row.returnRate)}
                  </td>
                  <td className="px-4 py-3 text-right border-b border-gray-100">
                    <MomBadge value={row.mom} />
                  </td>
                </tr>
              ))}

          {!isLoading && sortedData.length === 0 && (
            <tr>
              <td colSpan={COLS.length} className="px-4 py-10 text-center text-sm text-gray-400">
                해당 기간에 데이터가 없습니다
              </td>
            </tr>
          )}
        </tbody>

        {!isLoading && sortedData.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50 font-medium">
              <td className="px-4 py-3 text-sm text-gray-900 border-t-2 border-gray-200">합계</td>
              <td className="px-4 py-3 text-sm text-right text-gray-900 border-t-2 border-gray-200">
                {formatKRW(totals.revenue)}원
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-900 border-t-2 border-gray-200">
                {totals.units.toLocaleString()}개
              </td>
              <td colSpan={3} className="border-t-2 border-gray-200" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
