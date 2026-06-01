---
name: react-patterns
description: >
  Next.js + React 코드 작성 시 반드시 참고하는 패턴 가이드. useEffect, useState, 데이터 페칭,
  URL 파라미터 처리 등 흔한 안티패턴을 방지하고 올바른 패턴을 사용하도록 강제한다.
  컴포넌트 작성, 훅 작성, 상태 관리, 라우팅 관련 코드를 작성할 때마다 이 skill을 반드시 참고할 것.
  특히 useEffect 안에서 setState 호출, useEffect로 파생 상태 계산, 불필요한 useEffect 사용,
  searchParams 처리, 탭 상태 관리 등의 패턴이 등장할 때 즉시 이 skill을 로드해야 한다.
---

# React / Next.js 패턴 가이드

## 핵심 원칙

**코드 작성 전 반드시 확인할 것:**
1. useEffect가 필요한가? → 대부분의 경우 필요 없다
2. setState를 effect 안에서 호출하는가? → 안티패턴
3. URL 파라미터로 탭 상태를 관리하는가? → 별도 패턴 사용

자세한 패턴은 아래 케이스별로 확인.

---

## CASE 1: useEffect 안에서 setState 호출 (이번 에러의 원인)

### ❌ 절대 하지 말 것
```tsx
// ESLint 에러: Calling setState synchronously within an effect
useEffect(() => {
  if (searchParams.get('tab') === 'panda') {
    setActiveTab('panda');  // ← 안티패턴
  }
}, [searchParams]);
```

### ✅ 올바른 패턴 — 파생 상태는 렌더 중에 계산
```tsx
// useEffect 없이 렌더 타임에 직접 계산
const activeTab = searchParams.get('tab') ?? 'default';

// 또는 useMemo (계산 비용이 클 때만)
const activeTab = useMemo(
  () => searchParams.get('tab') ?? 'default',
  [searchParams]
);
```

**규칙**: props나 다른 state에서 계산할 수 있는 값은 state로 만들지 않는다.
→ 참고: `references/no-effect-patterns.md` - "Adjusting state based on props or state" 섹션

---

## CASE 2: URL searchParams로 탭 상태 관리 (Next.js App Router)

### ❌ 하지 말 것
```tsx
const [activeTab, setActiveTab] = useState('default');

useEffect(() => {
  const tab = searchParams.get('tab');
  if (tab) setActiveTab(tab);  // ← 이중 상태 관리 안티패턴
}, [searchParams]);
```

### ✅ 올바른 패턴
```tsx
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // state 없이 URL을 single source of truth로 사용
  const activeTab = searchParams.get('tab') ?? 'general';

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  return <Tabs value={activeTab} onValueChange={handleTabChange} />;
}
```

---

## CASE 3: 데이터 페칭

### ❌ 하지 말 것
```tsx
const [data, setData] = useState(null);

useEffect(() => {
  fetch('/api/data').then(r => r.json()).then(setData);
}, []);
```

### ✅ 이 프로젝트 패턴 — lib/hooks/ 의 커스텀 훅 사용
```tsx
// lib/hooks/useXxx.ts 에 커스텀 훅으로 분리
import { useXxx } from '@/lib/hooks/useXxx';

export default function Page() {
  const { data, isLoading, error } = useXxx();
  // ...
}
```

데이터 페칭이 필요하면 lib/hooks/ 에 커스텀 훅을 먼저 만든 뒤 사용할 것.

---

## CASE 4: useEffect가 필요한 진짜 케이스

아래 경우에만 useEffect 사용:
1. DOM에 직접 접근해야 할 때 (e.g., focus, scroll)
2. 외부 라이브러리 구독/해제 (e.g., WebSocket, EventEmitter)
3. 타이머 설정/해제

```tsx
// ✅ 합법적인 useEffect 사용
useEffect(() => {
  const subscription = externalStore.subscribe(setState);
  return () => subscription.unsubscribe();
}, []);
```

**의심스러우면 쓰지 말 것.** 대부분의 경우 필요 없다.

---

## 체크리스트 (코드 작성 전 확인)

- [ ] useEffect 안에 setState가 있는가? → 제거하고 렌더 중 계산으로 변경
- [ ] useEffect의 목적이 "외부 시스템과 동기화"인가? → 아니면 useEffect 불필요
- [ ] URL 파라미터에서 state를 초기화하는가? → URL을 직접 single source of truth로 사용
- [ ] 데이터 페칭을 useEffect로 하는가? → lib/hooks/ 커스텀 훅으로 분리
- [ ] 파생 상태를 useState로 관리하는가? → 렌더 중 계산으로 변경

---

## 참고 자료

복잡한 케이스는 `references/no-effect-patterns.md` 참고.
