# 🔄 FlowIT CRM

<div align="center">

![FlowIT Banner](https://img.shields.io/badge/FlowIT-Integrated%20CRM-2563EB?style=for-the-badge&logoColor=white)

**고객부터 영업·재고·마케팅까지, 비즈니스의 흐름을 하나로 연결하는 통합 CRM**

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📌 프로젝트 소개

**FlowIT CRM**은 고객 정보, 거래처, 영업 기회, 상품, 재고, 마케팅 데이터를 하나의 플랫폼에서 관리하는 웹 기반 통합 업무 시스템입니다.

B2B 영업의 상담·견적·미수금 관리와 B2C 고객의 구매 이력·세그먼트·캠페인 관리를 함께 다루며, 발주·수주, 창고, 배송, 반품, 정산 등 유통 업무를 위한 모듈을 제공합니다.

화장품·뷰티, 물류·유통, 식품, 일반 업종별 프리셋과 모듈 활성화 설정을 통해 필요한 기능을 선택할 수 있습니다. AI 기반 고객 리뷰 분석과 매출·고객 분석 대시보드로 운영 현황을 파악하고 의사결정에 활용하는 것을 목표로 합니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 👥 **고객 통합 관리** | 고객 기본 정보, 구매 이력, 행동 이벤트, 캠페인 수신 이력, VOC를 통합 조회 |
| 🎯 **RFM 고객 세분화** | 최근 구매일·구매 빈도·구매 금액을 기준으로 고객 점수와 세그먼트 산출 |
| 🏢 **거래처·상품 관리** | 거래처 정보와 담당자, 상품 카탈로그, 단가, 거래처별 상품 매핑 관리 |
| 📞 **상담 이력 관리** | 상담 기록 조회 및 Gmail 연동을 통한 이메일 수집, 도메인 기반 거래처 매칭 |
| 📈 **영업 파이프라인** | 칸반 보드에서 영업 기회를 단계별로 관리하고 거래 금액·성공 확률 확인 |
| 📄 **견적 관리** | 견적서 작성, 금액·세액 계산, 버전 생성, 승인 상태 관리 및 PDF 출력 |
| 💰 **미수금 관리** | 청구 내역과 입금 기록 관리, 입금액에 따른 미수·부분 입금·완납 상태 반영 |
| 📦 **재고·SKU 관리** | SKU 정보, 채널별 재고, 세트 상품 구성 및 LOT·유통기한 정보 관리 |
| 🚚 **물류·유통 관리** | 발주·수주, 창고·입출고, 배송 정보, 반품, 거래처 정산 관련 화면 및 API 제공 |
| 📣 **마케팅 캠페인** | 고객 세그먼트 기반 캠페인 관리, Resend 이메일 발송 및 A/B 메시지 분배 |
| 🔀 **고객 여정 관리** | 여정 설정, 활성 상태, 고객 등록 현황 및 조건 분기 처리 구조 제공 |
| 🤝 **인플루언서 관리** | 인플루언서 정보, 협업 캠페인 수 및 ROI 지표 조회 |
| 💬 **AI VOC 분석** | Claude API로 리뷰 감정과 키워드를 분석하고 부정 리뷰 이상 징후 탐지 |
| 📊 **BI 대시보드** | 매출·고객·마케팅·SCM 지표를 차트와 요약 정보로 확인 |
| 📉 **수요예측** | 최근 90일 주문 수량을 기반으로 SKU별 다음 달 예상 수요 계산 |
| 🧩 **모듈 설정** | 업종별 프리셋 적용 및 업무 모듈별 활성화 설정 |

---

## 🛠 기술 스택

### Frontend

- **Next.js 15 + React 18 + TypeScript** — App Router 기반 화면 및 애플리케이션 구성
- **Tailwind CSS** — 스타일링
- **Recharts** — 대시보드 및 분석 차트
- **dnd-kit** — 영업 파이프라인 드래그 앤 드롭
- **Lucide React** — UI 아이콘

### Backend / Database

- **Next.js Route Handlers** — 업무별 API 구현
- **Prisma ORM + PostgreSQL** — 업무 데이터 모델링 및 데이터 접근
- **Node.js** — 서버 실행 환경

### AI / 외부 연동

- **Anthropic Claude API** — 리뷰 감정 분류 및 키워드 추출
- **Gmail API + Google OAuth 2.0** — 이메일 수집 및 상담 이력 연계
- **Resend** — 이메일 캠페인 발송
- **Slack Incoming Webhook** — VOC 이상 징후 알림
- **채널 어댑터 구조** — 자사몰·쿠팡 주문 데이터 연동을 위한 확장 기반

### 인증 / 문서

- **bcryptjs** — 비밀번호 해시 검증
- **JWT + HttpOnly 쿠키** — 로그인 세션 관리
- **역할 기반 접근 제어** — API별 사용자 권한 확인
- **React PDF** — 견적서 PDF 생성

---

## 🖥 활용 예시

### 1. 거래처 영업 관리

1. 거래처와 담당자, 취급 상품을 등록합니다.
2. 상담 내용을 기록하거나 Gmail 이메일을 거래처와 연결합니다.
3. 영업 기회를 칸반 보드에서 관리합니다.
4. 견적서를 작성하고 수정 버전과 승인 상태를 관리합니다.
5. 견적서를 PDF로 출력하고, 청구·입금 내역을 별도로 등록해 미수금을 확인합니다.

### 2. 고객 분석과 마케팅

1. 고객별 구매 이력과 RFM 점수를 확인합니다.
2. VIP·충성·신규·이탈 위험 등 세그먼트별 고객을 조회합니다.
3. 대상 세그먼트에 맞는 이메일 캠페인을 작성합니다.
4. A/B 메시지를 설정하고 발송 이력을 확인합니다.

### 3. 리뷰 기반 고객 이슈 파악

1. 등록된 고객 리뷰를 Claude API로 분석합니다.
2. 긍정·중립·부정 분류와 주요 키워드를 확인합니다.
3. 최근 7일간 상품별 부정 리뷰 비율과 건수를 점검합니다.
4. 부정 리뷰 비율이 15%를 초과하거나 10건 이상이면 이상 징후로 표시하고, 설정된 Slack 채널로 알립니다.

> 위 예시는 기능 활용 흐름입니다. 단계 간 데이터 전환이나 외부 업무 처리가 모두 자동으로 수행된다는 의미는 아닙니다.

---

## 🧩 업종별 모듈 구성

| 업종 | 주요 구성 |
|------|-----------|
| 💄 **화장품·뷰티** | 고객·영업·재고 관리에 캠페인, 고객 여정, 인플루언서, VOC 분석 추가 |
| 🚛 **물류·유통** | 고객·영업·재고 관리에 발주·수주, 창고, 배송, 반품, 정산, LOT, 수요예측 추가 |
| 🍱 **식품** | 고객·영업·재고 관리에 발주·수주, 창고, 배송, 반품, LOT, VOC 분석 추가 |
| 🏢 **일반** | 거래처·상품·상담·견적·미수금과 고객·영업·재고·캠페인·BI 중심 구성 |

---

## 👤 관리자 기능

- 사용자 초대 및 계정 활성 상태 관리
- 사용자 역할 및 권한 설정
- 업무 모듈 활성화와 업종별 프리셋 적용
- 외부 API 연결 정보 등록 및 연결 테스트
- 감사 로그 조회 및 CSV 내보내기

---

## 📁 프로젝트 구성

| 경로 | 역할 |
|------|------|
| `app/(auth)/` | 로그인 및 초대 관련 화면 |
| `app/(dashboard)/` | 고객·영업·재고·마케팅·물류·분석 화면 |
| `app/api/` | 업무 API, 외부 연동 및 배치 실행 엔드포인트 |
| `components/layout/` | 사이드바와 상단바 등 공통 레이아웃 |
| `lib/services/` | RFM 계산, VOC 분석, 고객 식별, 이메일 동기화 등 업무 로직 |
| `lib/adapters/` | 판매 채널별 데이터 연동 어댑터 |
| `lib/modules/` | 모듈 정의 및 업종별 프리셋 |
| `lib/pdf/` | 견적서 PDF 템플릿 |
| `prisma/schema.prisma` | 데이터베이스 모델 정의 |

---

## 🚧 개발 상태

현재 **v0.1.0 개발 단계**이며, 기능별 구현 범위에는 차이가 있습니다.

- 외부 서비스 기능은 API 키, OAuth 및 실행 환경 설정이 필요합니다.
- 이메일 캠페인 발송 코드가 구현되어 있으며, **SMS·카카오 알림톡 실제 발송 연동은 추가 구현이 필요합니다.**
- 고객 여정 엔진은 기본 처리 구조가 있으며, **실제 메시지 발송과 지연 시간 처리는 보완이 필요합니다.**
- 수요예측은 현재 **최근 90일 판매량의 월평균을 이용하는 통계 방식**입니다.
- 판매 채널 어댑터와 물류 모듈은 외부 서비스와의 실운영 연동을 추가 구현·검증해야 합니다. 쿠팡 재고 조회는 현재 빈 배열을 반환합니다.

---

## 📚 관련 문서

- [사용자 매뉴얼](MANUAL.md)
- [업무 프로세스 문서](PROCESS.md)
- [GitHub 저장소](https://github.com/yukhoehaninsaeng/FlowIT)

