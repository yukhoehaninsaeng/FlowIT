// lib/hooks/useChannelData.ts
// react-patterns CASE 3: 데이터 페칭은 커스텀 훅으로 분리

import { useState, useEffect } from 'react';

export type Channel = string; // DB 채널값 그대로 사용 (e.g. 'coupang', 'own_mall')

export interface ChannelRow {
  channel: Channel;
  revenue: number;       // 매출액 (원)
  units: number;         // 판매량
  returnRate: number;    // 반품률 (0~1)
  revenueShare: number;  // 매출 구성비 (0~1)
  mom: number;           // 전분기 대비 증감률 (소수, 음수 가능)
}

interface UseChannelDataParams {
  period: string;
}

interface UseChannelDataResult {
  data: ChannelRow[];
  isLoading: boolean;
  error: string | null;
}

export function useChannelData({ period }: UseChannelDataParams): UseChannelDataResult {
  const [data, setData] = useState<ChannelRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 외부 API와 동기화 — period가 바뀔 때 새로 페칭
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ period });
        const res = await fetch(`/api/channel-data?${params}`);

        if (!res.ok) throw new Error(`API 오류: ${res.status}`);

        const json: ChannelRow[] = await res.json();

        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '알 수 없는 오류');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [period]);

  return { data, isLoading, error };
}
